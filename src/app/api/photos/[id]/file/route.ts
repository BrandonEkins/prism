import { NextRequest, NextResponse } from 'next/server';
import { getDisplayAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { photos, photoSources } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getPhotoPath } from '@/lib/services/photo-storage';
import { promises as fs } from 'fs';
import { decrypt, encrypt } from '@/lib/utils/crypto';
import { refreshAccessToken } from '@/lib/integrations/onedrive';
import { logError } from '@/lib/utils/logError';

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

async function getValidToken(sourceId: string): Promise<string> {
  const source = await db.query.photoSources.findFirst({
    where: eq(photoSources.id, sourceId),
  });
  if (!source?.accessToken || !source?.refreshToken) {
    throw new Error('No tokens for photo source');
  }

  if (source.tokenExpiresAt && source.tokenExpiresAt < new Date()) {
    const tokens = await refreshAccessToken(decrypt(source.refreshToken));
    await db.update(photoSources).set({
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : source.refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      updatedAt: new Date(),
    }).where(eq(photoSources.id, sourceId));
    return tokens.access_token;
  }

  return decrypt(source.accessToken);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getDisplayAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const thumb = searchParams.get('thumb') === '1' || searchParams.get('thumb') === 'true';

    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, id),
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // External photos: proxy through OneDrive on demand
    if (photo.isExternal && photo.externalId) {
      const accessToken = await getValidToken(photo.sourceId);

      let url: string;
      if (thumb) {
        // Use OneDrive's built-in thumbnail endpoint (no download of full image)
        url = `${GRAPH_API}/me/drive/items/${photo.externalId}/thumbnails/0/medium/content`;
      } else {
        url = `${GRAPH_API}/me/drive/items/${photo.externalId}/content`;
      }

      const upstream = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        redirect: 'follow',
      });

      if (!upstream.ok) {
        return NextResponse.json({ error: 'Failed to fetch from OneDrive' }, { status: 502 });
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      const contentType = upstream.headers.get('content-type') ?? photo.mimeType;

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Content-Length': buffer.length.toString(),
        },
      });
    }

    // Local file
    const filename = thumb && photo.thumbnailPath
      ? photo.thumbnailPath
      : photo.filename;
    const filePath = getPhotoPath(filename, thumb && !!photo.thumbnailPath);

    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': photo.mimeType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    logError('Error serving photo:', error);
    return NextResponse.json({ error: 'Failed to serve photo' }, { status: 500 });
  }
}
