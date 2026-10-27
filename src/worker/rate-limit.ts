/**
 * Hash an IP address using SHA-256 to ensure complete privacy.
 * Raw IP addresses are NEVER stored in KV or persistent storage.
 */
export async function hashIp(ip: string, salt: string = 'wegov2ray-salt-v1'): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${ip.trim().toLowerCase()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isLocalTestRequest(request: Request, env: { LOCAL_TEST_MODE?: string | boolean }): boolean {
  const url = new URL(request.url);
  return String(env.LOCAL_TEST_MODE).toLowerCase() === 'true' && url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(url.hostname);
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds?: number;
  reason?: string;
}

/**
 * Global rate limiter: 10 requests per minute per IP
 */
export async function checkGlobalRateLimit(
  kv: KVNamespace | undefined,
  hashedIp: string,
  limitPerMinute = 10
): Promise<RateLimitResult> {
  if (!kv) {
    return { allowed: true, limit: limitPerMinute, remaining: limitPerMinute };
  }

  const currentMinute = Math.floor(Date.now() / 60000);
  const key = `rl:global:${hashedIp}:${currentMinute}`;

  try {
    const rawCount = await kv.get(key);
    const count = rawCount ? parseInt(rawCount, 10) : 0;

    if (count >= limitPerMinute) {
      return {
        allowed: false,
        limit: limitPerMinute,
        remaining: 0,
        retryAfterSeconds: 60 - (Math.floor(Date.now() / 1000) % 60),
        reason: 'Too many requests. Please wait a minute.',
      };
    }

    // Increment count with 70s TTL
    await kv.put(key, (count + 1).toString(), { expirationTtl: 70 });
    return {
      allowed: true,
      limit: limitPerMinute,
      remaining: Math.max(0, limitPerMinute - (count + 1)),
    };
  } catch (err) {
    console.warn('KV rate limit error (allowing by default):', err);
    return { allowed: true, limit: limitPerMinute, remaining: limitPerMinute };
  }
}

