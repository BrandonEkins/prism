import { checkRateLimit, rateLimitGuard } from '../rateLimit';

// --- Mocks ---

const mockIncr = jest.fn<Promise<number>, [string]>();
const mockExpire = jest.fn<Promise<boolean>, [string, number]>();
const mockTtl = jest.fn<Promise<number>, [string]>();

jest.mock('../getRedisClient', () => ({
  getRedisClient: jest.fn(),
}));

// Get the mocked module so we can change its return value per test
import { getRedisClient } from '../getRedisClient';
const mockedGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;

function setupRedisClient(overrides?: Partial<{ incr: typeof mockIncr; expire: typeof mockExpire; ttl: typeof mockTtl }>) {
  const client = {
    incr: overrides?.incr ?? mockIncr,
    expire: overrides?.expire ?? mockExpire,
    ttl: overrides?.ttl ?? mockTtl,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedGetRedisClient.mockResolvedValue(client as any);
  return client;
}

// --- Tests ---

describe('checkRateLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(true);
    mockTtl.mockResolvedValue(60);
  });

  it('allows first request in window', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(1);
    mockTtl.mockResolvedValue(60);

    const result = await checkRateLimit('user-1', 'test', 10, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('sets expiry only on first request (count=1)', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(1);

    await checkRateLimit('user-1', 'test', 10, 60);

    expect(mockExpire).toHaveBeenCalledWith('ratelimit:user-1:test', 60);
  });

  it('does not set expiry on subsequent requests (count>1)', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(5);

    await checkRateLimit('user-1', 'test', 10, 60);

    expect(mockExpire).not.toHaveBeenCalled();
  });

  it('blocks when count exceeds maxRequests', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(11);
    mockTtl.mockResolvedValue(30);

    const result = await checkRateLimit('user-1', 'test', 10, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetIn).toBe(30);
  });

  it('allows when count equals maxRequests (boundary)', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(10);
    mockTtl.mockResolvedValue(45);

    const result = await checkRateLimit('user-1', 'test', 10, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('remaining is never negative', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(100);
    mockTtl.mockResolvedValue(10);

    const result = await checkRateLimit('user-1', 'test', 10, 60);

    expect(result.remaining).toBe(0);
  });

  it('falls back to windowSeconds when TTL is non-positive', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(1);
    mockTtl.mockResolvedValue(-1);

    const result = await checkRateLimit('user-1', 'test', 10, 120);

    expect(result.resetIn).toBe(120);
  });

  // --- Redis unavailable ---
  it('allows request when Redis is unavailable (null client)', async () => {
    mockedGetRedisClient.mockResolvedValue(null);

    const result = await checkRateLimit('user-1', 'test', 10, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
    expect(result.resetIn).toBe(0);
  });

  it('allows request when Redis throws an error', async () => {
    setupRedisClient();
    mockIncr.mockRejectedValue(new Error('Connection refused'));

    const result = await checkRateLimit('user-1', 'test', 10, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
    expect(result.resetIn).toBe(0);
  });

  // --- Key isolation ---
  it('builds key from userId and endpoint', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(1);

    await checkRateLimit('user-abc', 'chores', 10, 60);

    expect(mockIncr).toHaveBeenCalledWith('ratelimit:user-abc:chores');
  });

  it('different users have different keys', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(1);

    await checkRateLimit('user-1', 'test', 10, 60);
    await checkRateLimit('user-2', 'test', 10, 60);

    expect(mockIncr).toHaveBeenCalledWith('ratelimit:user-1:test');
    expect(mockIncr).toHaveBeenCalledWith('ratelimit:user-2:test');
  });
});

describe('rateLimitGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(true);
    mockTtl.mockResolvedValue(60);
  });

  it('returns null when under limit (request allowed)', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(1);

    const result = await rateLimitGuard('user-1', 'test', 10, 60);

    expect(result).toBeNull();
  });

  it('returns 429 NextResponse when over limit', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(11);
    mockTtl.mockResolvedValue(25);

    const result = await rateLimitGuard('user-1', 'test', 10, 60);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);

    const body = await result!.json();
    expect(body.error).toContain('Too many requests');
  });

  it('includes rate limit headers in 429 response', async () => {
    setupRedisClient();
    mockIncr.mockResolvedValue(11);
    mockTtl.mockResolvedValue(25);

    const result = await rateLimitGuard('user-1', 'test', 10, 60);

    expect(result!.headers.get('Retry-After')).toBe('25');
    expect(result!.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(result!.headers.get('X-RateLimit-Reset')).toBe('25');
  });

  it('returns null when Redis is unavailable', async () => {
    mockedGetRedisClient.mockResolvedValue(null);

    const result = await rateLimitGuard('user-1', 'test', 10, 60);

    expect(result).toBeNull();
  });
});
