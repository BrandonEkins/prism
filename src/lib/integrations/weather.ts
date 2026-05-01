/**
 * Weather provider factory.
 * Selects the active provider based on the WEATHER_PROVIDER env var.
 *
 *   WEATHER_PROVIDER=pirate      → Pirate Weather (Dark Sky-compatible)
 *   WEATHER_PROVIDER=openweather → OpenWeatherMap
 *
 * Usage:
 *   import { fetchWeatherData, type LocationParam } from '@/lib/integrations/weather';
 */

import type { WeatherData } from '@/components/widgets/WeatherWidget';

export type LocationParam = string | { lat: number; lon: number };

export async function fetchWeatherData(location?: LocationParam): Promise<WeatherData> {
  const provider = process.env.WEATHER_PROVIDER ?? 'pirate';

  if (provider === 'openweather') {
    const { fetchWeatherData: fetchOW } = await import('./openweather');
    return fetchOW(location);
  }

  const { fetchWeatherData: fetchPW } = await import('./pirateweather');
  return fetchPW(location);
}
