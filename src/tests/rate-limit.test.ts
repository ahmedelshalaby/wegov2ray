import { describe, it, expect, vi } from 'vitest';
import { hashIp, checkGlobalRateLimit } from '../worker/rate-limit';

describe('Rate Limiter and IP Privacy', () => {
  it('hashes IP addresses with SHA-256 and never exposes raw IP', async () => {
    const rawIp = '198.51.100.42';
    const hashed = await hashIp(rawIp);
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toContain('198');
    expect(hashed).not.toContain('51');
    expect(await hashIp(rawIp)).toBe(hashed);
    expect(await hashIp('203.0.113.1')).not.toBe(hashed);
  });

  it('enforces the global 10 request per minute limit', async () => {
    const storage: Record<string, string> = {};
    const mockKv = {
      get: vi.fn(async (key: string) => storage[key] || null),
      put: vi.fn(async (key: string, value: string) => { storage[key] = value; }),
    } as unknown as KVNamespace;
    for (let i = 0; i < 10; i++) expect((await checkGlobalRateLimit(mockKv, 'test-hash', 10)).allowed).toBe(true);
    const blocked = await checkGlobalRateLimit(mockKv, 'test-hash', 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
