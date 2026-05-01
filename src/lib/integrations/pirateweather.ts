/**
 *
 * Provides Pirate Weather API integration for weather data.
 * Pirate Weather is a Dark Sky-compatible API.
 *
 * FEATURES:
 * - Current weather conditions
 * - 7-day daily forecast
 * - Hourly forecast (next 24 hours)
 * - Minutely precipitation data (next 60 minutes)
 *
 * CONFIGURATION:
 * - PIRATE_WEATHER_API_KEY — required
 * - WEATHER_LAT / WEATHER_LON — location coordinates (default: Chicago)
 * - WEATHER_LOCATION — display name shown in the widget
 *
 */

import { DAYS_SHORT_ARRAY } from '@/lib/constants/days';
import type {
  WeatherData,
  WeatherCondition,
  CurrentWeather,
  ForecastDay,
  ForecastPeriod,
  HourlyForecast,
  MinutelyData,
} from '@/components/widgets/WeatherWidget';

// ---------------------------------------------------------------------------
// Pirate Weather (Dark Sky-compatible) response types
// ---------------------------------------------------------------------------

interface PirateWeatherCurrently {
  time: number;
  summary?: string;
  icon: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number; // 0–1
  windSpeed: number; // mph (units=us)
  precipIntensity: number;
  precipProbability: number;
}

interface PirateWeatherHourly {
  time: number;
  icon: string;
  summary?: string;
  temperature: number;
  precipProbability: number;
  precipIntensity: number;
}

interface PirateWeatherDaily {
  time: number;
  icon: string;
  summary?: string;
  temperatureHigh: number;
  temperatureLow: number;
  precipProbability: number;
  sunriseTime: number;
  sunsetTime: number;
}

interface PirateWeatherMinutely {
  time: number;
  precipIntensity: number;
  precipProbability: number;
}

interface PirateWeatherResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  currently: PirateWeatherCurrently;
  minutely?: { data: PirateWeatherMinutely[] };
  hourly: { data: PirateWeatherHourly[] };
  daily: { data: PirateWeatherDaily[] };
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getConfig() {
  const apiKey = process.env.PIRATE_WEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('PIRATE_WEATHER_API_KEY is not configured in environment');
  }

  const lat = parseFloat(process.env.WEATHER_LAT || '41.8781'); // Chicago default
  const lon = parseFloat(process.env.WEATHER_LON || '-87.6298');
  const locationName = process.env.WEATHER_LOCATION || 'Chicago, IL';

  return { apiKey, lat, lon, locationName };
}

// ---------------------------------------------------------------------------
// Icon mapping: Dark Sky icon names → WeatherCondition
// ---------------------------------------------------------------------------

function mapIcon(icon: string): WeatherCondition {
  switch (icon) {
    case 'clear-day':
    case 'clear-night':
      return 'sunny';
    case 'partly-cloudy-day':
    case 'partly-cloudy-night':
      return 'partly-cloudy';
    case 'cloudy':
    case 'fog':
    case 'wind':
      return 'cloudy';
    case 'rain':
    case 'drizzle':
      return 'rainy';
    case 'snow':
    case 'sleet':
      return 'snowy';
    case 'thunderstorm':
      return 'stormy';
    default:
      return 'cloudy';
  }
}

// ---------------------------------------------------------------------------
// Main fetch function
// ---------------------------------------------------------------------------

/**
 * Fetch complete weather data from Pirate Weather.
 *
 * @param locationNameOverride  Optional display name override (e.g. from DB or
 *                              query param). Coordinates always come from env.
 */
export async function fetchWeatherData(_locationNameOverride?: string): Promise<WeatherData> {
  const config = getConfig();

  const url =
    `https://api.pirateweather.net/forecast/${config.apiKey}` +
    `/${config.lat},${config.lon}` +
    `?units=us&extend=hourly`;

  const response = await fetch(url, { next: { revalidate: 1800 } }); // cache 30 min

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Pirate Weather data: ${error}`);
  }

  const data: PirateWeatherResponse = await response.json();
  const { currently, hourly, daily, minutely } = data;

  // ── Current conditions ────────────────────────────────────────────────────
  const current: CurrentWeather = {
    temperature: Math.round(currently.temperature),
    feelsLike: Math.round(currently.apparentTemperature),
    condition: mapIcon(currently.icon),
    humidity: Math.round(currently.humidity * 100),
    windSpeed: Math.round(currently.windSpeed),
    description: currently.summary ?? currently.icon.replace(/-/g, ' '),
  };

  // ── Sunrise / sunset from today's daily entry ─────────────────────────────
  const todayDaily = daily.data[0];
  const sunrise = todayDaily ? new Date(todayDaily.sunriseTime * 1000) : undefined;
  const sunset = todayDaily ? new Date(todayDaily.sunsetTime * 1000) : undefined;

  // ── 7-day forecast ────────────────────────────────────────────────────────
  const dayNames = DAYS_SHORT_ARRAY;
  const forecast: ForecastDay[] = daily.data.slice(0, 7).map((d) => {
    const date = new Date(d.time * 1000);
    const dayIndex = date.getUTCDay();
    return {
      date,
      dayName: dayNames[dayIndex] ?? 'Day',
      high: Math.round(d.temperatureHigh),
      low: Math.round(d.temperatureLow),
      condition: mapIcon(d.icon),
      precipProbability: Math.round(d.precipProbability * 100),
    };
  });

  // ── Hourly: next 24 hours ─────────────────────────────────────────────────
  const nowMs = Date.now();
  const cutoff = nowMs + 12 * 3_600_000;
  const hourlyData: HourlyForecast[] = hourly.data
    .filter((h) => {
      const t = h.time * 1000;
      return t > nowMs - 3_600_000 && t <= cutoff;
    })
    .map((h) => ({
      time: new Date(h.time * 1000),
      condition: mapIcon(h.icon),
      temp: Math.round(h.temperature),
      precipProbability: Math.round(h.precipProbability * 100),
      precipIntensity: h.precipIntensity,
    }));

  // Override the currently-active hour with observed current conditions.
  // Use currently.precipIntensity for intensity so the label reflects reality.
  const patchedHourly = hourlyData.map((h) =>
    h.time.getTime() <= nowMs
      ? { ...h, condition: current.condition, temp: current.temperature, precipIntensity: currently.precipIntensity }
      : h
  );

  // ── Periods (Morning / Afternoon / Evening) ───────────────────────────────
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const periodDefs = [
    { label: 'Morn', minHour: 6, maxHour: 12 },
    { label: 'Aft', minHour: 12, maxHour: 18 },
    { label: 'Eve', minHour: 18, maxHour: 24 },
  ];
  const periods: ForecastPeriod[] = [];
  for (const def of periodDefs) {
    const matching = hourly.data.filter((h) => {
      const d = new Date(h.time * 1000);
      return (
        d.toLocaleDateString('en-CA') === todayStr &&
        d.getHours() >= def.minHour &&
        d.getHours() < def.maxHour
      );
    });
    if (matching.length > 0) {
      const avgTemp = matching.reduce((s, h) => s + h.temperature, 0) / matching.length;
      periods.push({
        label: def.label,
        temp: Math.round(avgTemp),
        condition: mapIcon(matching[0]!.icon),
      });
    }
  }

  // ── Minutely precipitation data ───────────────────────────────────────────
  const minutelyData: MinutelyData[] | undefined = minutely?.data;

  return {
    location: config.locationName,
    current,
    forecast,
    hourly: patchedHourly,
    periods,
    sunrise,
    sunset,
    minutely: minutelyData,
    lastUpdated: new Date(),
  };
}
