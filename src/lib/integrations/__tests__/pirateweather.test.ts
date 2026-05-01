/**
 * Tests for the Pirate Weather integration.
 *
 * Verifies the request URL plumbs lat/lon from the LocationParam (not just env)
 * and that day-of-week labels respect the response's IANA timezone rather than
 * UTC.
 */

jest.mock('@/components/widgets/WeatherWidget', () => ({}), { virtual: true });

const originalEnv = process.env;
const mockApiKey = 'test-pirate-key';

beforeAll(() => {
  process.env = {
    ...originalEnv,
    PIRATE_WEATHER_API_KEY: mockApiKey,
    WEATHER_LAT: '41.8781',
    WEATHER_LON: '-87.6298',
    WEATHER_LOCATION: 'Chicago, IL',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

afterEach(() => {
  jest.restoreAllMocks();
});

function buildResponse(timezone = 'America/Chicago') {
  // Use a Sunday-in-NY-but-still-Saturday-in-LA fixture so day labels expose
  // any UTC vs local-TZ confusion.
  const sundayUtcMidnight = Math.floor(Date.UTC(2026, 4, 3, 0, 0, 0) / 1000); // 2026-05-03 00:00 UTC = Sat 5pm in LA
  return {
    latitude: 0,
    longitude: 0,
    timezone,
    currently: {
      time: sundayUtcMidnight,
      icon: 'clear-day',
      temperature: 70,
      apparentTemperature: 70,
      humidity: 0.5,
      windSpeed: 5,
      precipIntensity: 0,
      precipProbability: 0,
    },
    minutely: { data: [] },
    hourly: { data: [] },
    daily: {
      data: [
        {
          time: sundayUtcMidnight,
          icon: 'clear-day',
          temperatureHigh: 75,
          temperatureLow: 60,
          precipProbability: 0,
          sunriseTime: sundayUtcMidnight + 6 * 3600,
          sunsetTime: sundayUtcMidnight + 19 * 3600,
        },
      ],
    },
  };
}

describe('pirateweather.fetchWeatherData', () => {
  it('passes lat/lon from LocationParam to the request URL (env values are ignored when caller provides coords)', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch' as never)
      .mockResolvedValue({
        ok: true,
        json: async () => buildResponse(),
      } as never);

    const { fetchWeatherData } = await import('../pirateweather');
    await fetchWeatherData({ lat: 40.7128, lon: -74.006 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('/40.7128,-74.006?');
    expect(calledUrl).not.toContain('41.8781'); // env default not used
  });

  it('falls back to env coordinates when no LocationParam is provided', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch' as never)
      .mockResolvedValue({
        ok: true,
        json: async () => buildResponse(),
      } as never);

    const { fetchWeatherData } = await import('../pirateweather');
    await fetchWeatherData();

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('/41.8781,-87.6298?');
  });

  it('uses the response timezone for day-of-week labels', async () => {
    jest.spyOn(global, 'fetch' as never).mockResolvedValue({
      ok: true,
      json: async () => buildResponse('America/Los_Angeles'),
    } as never);

    const { fetchWeatherData } = await import('../pirateweather');
    const result = await fetchWeatherData({ lat: 34, lon: -118 });

    // 2026-05-03 00:00 UTC is still 2026-05-02 (Saturday) in LA.
    expect(result.forecast[0]?.dayName).toBe('Sat');
  });

  it('uses Eastern timezone for the same UTC moment', async () => {
    jest.spyOn(global, 'fetch' as never).mockResolvedValue({
      ok: true,
      json: async () => buildResponse('America/New_York'),
    } as never);

    const { fetchWeatherData } = await import('../pirateweather');
    const result = await fetchWeatherData({ lat: 40, lon: -74 });

    // 2026-05-03 00:00 UTC is 2026-05-02 8pm in NY (Saturday).
    expect(result.forecast[0]?.dayName).toBe('Sat');
  });

  it('wraps network errors in a clear error message', async () => {
    jest
      .spyOn(global, 'fetch' as never)
      .mockImplementation((() => Promise.reject(new Error('ECONNREFUSED'))) as never);

    const { fetchWeatherData } = await import('../pirateweather');
    await expect(fetchWeatherData()).rejects.toThrow(/Pirate Weather network error: ECONNREFUSED/);
  });
});
