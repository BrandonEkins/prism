/**
 *
 * Weather provider factory.
 * Selects the active provider based on the WEATHER_PROVIDER env var.
 *
 * WEATHER_PROVIDER=pirate      → Pirate Weather (Dark Sky-compatible)
 * WEATHER_PROVIDER=openweather → OpenWeatherMap
 *
 * Usage:
 *   import { fetchWeatherData } from '@/lib/integrations/weather';
 *
 */

import type { WeatherData } from '@/components/widgets/WeatherWidget';
import type { LocationParam } from './openweather';

export async function fetchWeatherData(location?: LocationParam): Promise<WeatherData> {
  const provider = process.env.WEATHER_PROVIDER ?? 'pirate';

  if (provider === 'openweather') {
    const { fetchWeatherData: fetchOW } = await import('./openweather');
    return fetchOW(location);
  }

  // Default: pirate weather — lat/lon objects not supported, fall back to string or env default
  const { fetchWeatherData: fetchPW } = await import('./pirateweather');
  return fetchPW(typeof location === 'string' ? location : undefined);
}
