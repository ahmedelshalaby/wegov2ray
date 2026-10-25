import { describe, it, expect, vi } from 'vitest';
import { hashIp, checkGlobalRateLimit, checkDailyGenerationLimit } from '../worker/rate-limit';

describe('Rate Limiter and IP Privacy', () => {
  it('hashes IP addresses with SHA-256 and never exposes raw IP', async () => {
    const rawIp = '198.51.100.42';
    const hashed = await hashIp(rawIp);

    expect(hashed).toHaveLength(64); // SHA-256 hex string length
    expect(hashed).not.toContain('198');
    expect(hashed).not.toContain('51');

    // Deterministic for same IP
    const hashedAgain = await hashIp(rawIp);
    expect(hashedAgain).toBe(hashed);

    // Different for different IP
    const hashedOther = await hashIp('203.0.113.1');
    expect(hashedOther).not.toBe(hashed);
  });

  it('enforces global 10 req/min limit', async () => {
    const storage: Record<string, string> = {};
    const mockKv = {
      get: vi.fn(async (k: string) => storage[k] || null),
      put: vi.fn(async (k: string, v: string) => {
        storage[k] = v;
      }),
    } as unknown as KVNamespace;

    const testHashedIp = 'test-hash-1234';

    // First 10 requests should be allowed
    for (let i = 0; i < 10; i++) {
      const res = await checkGlobalRateLimit(mockKv, testHashedIp, 10);
      expect(res.allowed).toBe(true);
    }

    // 11th request should be blocked
    const blockedRes = await checkGlobalRateLimit(mockKv, testHashedIp, 10);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('enforces daily generation limit if enabled', async () => {
    const storage: Record<string, string> = {};
    const mockKv = {
      get: vi.fn(async (k: string) => storage[k] || null),
      put: vi.fn(async (k: string, v: string) => {
        storage[k] = v;
      }),
    } as unknown as KVNamespace;

    const testHashedIp = 'test-hash-5678';
    const limit = 2;

    // Check with 0 (unlimited)
    const unlimitedRes = await checkDailyGenerationLimit(mockKv, testHashedIp, 0);
    expect(unlimitedRes.allowed).toBe(true);

    // If limit = 2 and count is 2 in KV
    const todayStr = new Date().toISOString().slice(0, 10);
    storage[`rl:daily_gen:${testHashedIp}:${todayStr}`] = '2';

    const blocked = await checkDailyGenerationLimit(mockKv, testHashedIp, limit);
    expect(blocked.allowed).toBe(false);
  });
});
