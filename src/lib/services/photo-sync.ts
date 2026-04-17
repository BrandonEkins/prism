import { db } from '@/lib/db/client';
import { photos, photoSources } from '@/lib/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import {
  listPhotosInFolder,
  downloadPhoto,
  refreshAccessToken,
} from '@/lib/integrations/onedrive';
import { savePhoto, deletePhoto, getPhotoPath } from './photo-storage';
import { promises as fs } from 'fs';
import { decrypt, encrypt } from '@/lib/utils/crypto';
import exifr from 'exifr';

async function extractGps(buffer: Buffer): Promise<{ latitude: string; longitude: string } | null> {
  try {
    const gps = await exifr.gps(buffer);
    if (gps?.latitude != null && gps?.longitude != null) {
      return { latitude: gps.latitude.toString(), longitude: gps.longitude.toString() };
    }
  } catch {
    // No EXIF or no GPS — not an error
  }
  return null;
}

function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop() || 'jpg';
  return `${crypto.randomUUID()}.${ext}`;
}

export async function syncOneDriveSource(sourceId: string) {
  // Fetch the source
  const source = await db.query.photoSources.findFirst({
    where: eq(photoSources.id, sourceId),
  });

  if (!source || source.type !== 'onedrive' || !source.onedriveFolderId) {
    throw new Error('Invalid OneDrive photo source');
  }

  if (!source.accessToken || !source.refreshToken) {
    throw new Error('Photo source missing OAuth tokens');
  }

  let accessToken = decrypt(source.accessToken);
  if (source.tokenExpiresAt && source.tokenExpiresAt < new Date()) {
    const refreshToken = decrypt(source.refreshToken);
    const tokens = await refreshAccessToken(refreshToken);
    accessToken = tokens.access_token;

    await db
      .update(photoSources)
      .set({
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : source.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(photoSources.id, sourceId));
  }

  // Get remote photos
  const remotePhotos = await listPhotosInFolder(accessToken, source.onedriveFolderId);

  // Get existing photos for this source
  const existingPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.sourceId, sourceId));

  const existingExternalIds = new Set(existingPhotos.map((p) => p.externalId));
  const remoteIds = new Set(remotePhotos.map((p) => p.id));

  // Download new photos (or record metadata-only if OneDrive already has GPS)
  for (const remotePhoto of remotePhotos) {
    if (existingExternalIds.has(remotePhoto.id)) continue;

    try {
      const facetLat = remotePhoto.location?.latitude;
      const facetLng = remotePhoto.location?.longitude;
      const hasFacetGps = facetLat != null && facetLng != null;
      const mimeType = remotePhoto.file?.mimeType || 'image/jpeg';
      const takenAt = remotePhoto.photo?.takenDateTime
        ? new Date(remotePhoto.photo.takenDateTime)
        : null;

      if (hasFacetGps) {
        // Metadata-only: GPS known from OneDrive facet — no download needed.
        // filename stores the item ID so the file endpoint can proxy on demand.
        // usage='' keeps these out of screensaver/wallpaper rotation.
        await db.insert(photos).values({
          sourceId,
          filename: remotePhoto.id,
          originalFilename: remotePhoto.name,
          mimeType,
          width: remotePhoto.image?.width ?? null,
          height: remotePhoto.image?.height ?? null,
          sizeBytes: remotePhoto.size ?? null,
          takenAt,
          externalId: remotePhoto.id,
          thumbnailPath: null,
          latitude: facetLat.toString(),
          longitude: facetLng.toString(),
          isExternal: true,
          usage: '',
        });
      } else {
        // No facet GPS — download the file and try EXIF extraction
        const buffer = await downloadPhoto(accessToken, remotePhoto.id);
        const filename = generateFilename(remotePhoto.name);
        const result = await savePhoto(buffer, filename);
        const gps = await extractGps(buffer);

        await db.insert(photos).values({
          sourceId,
          filename,
          originalFilename: remotePhoto.name,
          mimeType,
          width: result.width,
          height: result.height,
          sizeBytes: result.sizeBytes,
          takenAt,
          externalId: remotePhoto.id,
          thumbnailPath: result.thumbnailPath,
          latitude: gps?.latitude ?? null,
          longitude: gps?.longitude ?? null,
          isExternal: false,
        });
      }
    } catch (err) {
      console.error(`Failed to sync photo ${remotePhoto.name}:`, err);
    }
  }

  // Backfill GPS for existing photos that don't yet have coordinates
  const photosWithoutGps = existingPhotos.filter(
    (p) => p.latitude === null && p.longitude === null
  );
  for (const existing of photosWithoutGps) {
    try {
      // Try reading EXIF from the already-downloaded file on disk
      const filePath = getPhotoPath(existing.filename);
      const buffer = await fs.readFile(filePath).catch(() => null);
      const gps = buffer ? await extractGps(buffer) : null;

      // Fall back to OneDrive location facet if EXIF had nothing
      const remote = remotePhotos.find((r) => r.id === existing.externalId);
      const lat = gps?.latitude ?? remote?.location?.latitude?.toString() ?? null;
      const lng = gps?.longitude ?? remote?.location?.longitude?.toString() ?? null;

      if (lat && lng) {
        await db
          .update(photos)
          .set({ latitude: lat, longitude: lng })
          .where(eq(photos.id, existing.id));
      }
    } catch {
      // Skip — don't fail the whole sync for one photo
    }
  }

  // Remove photos that no longer exist remotely
  for (const existing of existingPhotos) {
    if (existing.externalId && !remoteIds.has(existing.externalId)) {
      await deletePhoto(existing.filename, existing.thumbnailPath);
      await db.delete(photos).where(eq(photos.id, existing.id));
    }
  }

  // Update last synced
  await db
    .update(photoSources)
    .set({ lastSynced: new Date(), updatedAt: new Date() })
    .where(eq(photoSources.id, sourceId));
}
