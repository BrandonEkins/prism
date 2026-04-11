/**
 * GET /api/location-search?q=...
 *
 * Proxies the OpenWeatherMap Geocoding API to resolve city/postal code queries
 * into lat/lon coordinates. Results are used by the weather widget and the
 * location picker in Display settings.
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

interface OWMGeoResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface OWMZipResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
}

function formatDisplayName(name: string, state: string | undefined, country: string): string {
  const parts = [name];
  if (state) parts.push(state);
  parts.push(country);
  return parts.join(', ');
}

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Weather API not configured' }, { status: 503 });
  }

  try {
    const results: LocationCandidate[] = [];

    // Try zip/postal code format first (digits only, or digits+country e.g. "60601" or "60601,US")
    const zipMatch = q.match(/^(\d{4,10})(?:[,\s]+([A-Za-z]{2}))?$/);
    if (zipMatch) {
      const zip = zipMatch[1]!;
      const country = zipMatch[2] ?? 'US';
      const url = `https://api.openweathermap.org/geo/1.0/zip?zip=${encodeURIComponent(zip)},${country}&appid=${apiKey}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data: OWMZipResult = await res.json();
        results.push({
          displayName: formatDisplayName(data.name, undefined, data.country),
          lat: data.lat,
          lon: data.lon,
          country: data.country,
        });
      }
    }

    // Always also try free-text geocoding (handles city names and any missed zip formats)
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${apiKey}`;
    const geoRes = await fetch(geoUrl, { next: { revalidate: 3600 } });
    if (geoRes.ok) {
      const geoData: OWMGeoResult[] = await geoRes.json();
      for (const item of geoData) {
        const displayName = formatDisplayName(item.name, item.state, item.country);
        // Deduplicate against zip result (same lat/lon within ~0.01 degrees)
        const isDupe = results.some(
          r => Math.abs(r.lat - item.lat) < 0.01 && Math.abs(r.lon - item.lon) < 0.01
        );
        if (!isDupe) {
          results.push({ displayName, lat: item.lat, lon: item.lon, country: item.country });
        }
      }
    }

    return NextResponse.json({ results: results.slice(0, 5) });
  } catch (error) {
    console.error('[location-search] error:', error);
    return NextResponse.json({ error: 'Location search failed' }, { status: 500 });
  }
}
