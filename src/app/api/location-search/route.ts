/**
 * GET /api/location-search?q=...
 *
 * Geocodes city names and postal codes into lat/lon coordinates.
 * Uses Nominatim (OpenStreetMap) as the primary source — no API key required,
 * handles typos and partial names well. Falls back to OWM for postal codes
 * when available.
 *
 * No auth required — read-only, no PII, results are publicly available geodata.
 *
 * Returns up to 5 candidate locations: [{ displayName, lat, lon, country }]
 */

import { NextRequest, NextResponse } from 'next/server';

export interface LocationCandidate {
  displayName: string;
  lat: number;
  lon: number;
  country: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    country_code?: string;
    country?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
}

interface OWMZipResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
}

function shortDisplayName(result: NominatimResult): string {
  const a = result.address;
  if (!a) return result.display_name.split(',').slice(0, 3).join(',').trim();
  const city = a.city ?? a.town ?? a.village ?? '';
  const state = a.state ?? '';
  const country = a.country ?? a.country_code?.toUpperCase() ?? '';
  return [city, state, country].filter(Boolean).join(', ');
}

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results: LocationCandidate[] = [];

    // For postal codes, try OWM first (more reliable for zip lookup)
    const zipMatch = q.match(/^(\d{4,10})(?:[,\s]+([A-Za-z]{2}))?$/);
    if (zipMatch) {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (apiKey) {
        const zip = zipMatch[1]!;
        const country = zipMatch[2] ?? 'US';
        const url = `https://api.openweathermap.org/geo/1.0/zip?zip=${encodeURIComponent(zip)},${country}&appid=${apiKey}`;
        try {
          const res = await fetch(url, { next: { revalidate: 3600 } });
          if (res.ok) {
            const data: OWMZipResult = await res.json();
            results.push({
              displayName: `${data.name}, ${data.country}`,
              lat: data.lat,
              lon: data.lon,
              country: data.country,
            });
          }
        } catch { /* fall through to Nominatim */ }
      }
    }

    // Nominatim for city names (and as fallback for postal codes)
    // featuretype=city,town,village limits to populated places for cleaner results
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('q', q);
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('limit', '8');
    nominatimUrl.searchParams.set('featuretype', 'city');

    const nominatimRes = await fetch(nominatimUrl.toString(), {
      headers: { 'User-Agent': 'Prism-Family-Dashboard/1.0' },
      next: { revalidate: 3600 },
    });

    if (nominatimRes.ok) {
      const data: NominatimResult[] = await nominatimRes.json();
      for (const item of data) {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const isDupe = results.some(
          r => Math.abs(r.lat - lat) < 0.05 && Math.abs(r.lon - lon) < 0.05
        );
        if (!isDupe) {
          const country = item.address?.country_code?.toUpperCase() ?? item.address?.country ?? '';
          results.push({
            displayName: shortDisplayName(item),
            lat,
            lon,
            country,
          });
        }
      }
    }

    return NextResponse.json({ results: results.slice(0, 5) });
  } catch (error) {
    console.error('[location-search] error:', error);
    return NextResponse.json({ error: 'Location search failed' }, { status: 500 });
  }
}
