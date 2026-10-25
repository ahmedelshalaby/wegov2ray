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

/**
 * Daily generation limit per IP: MAX_PER_IP_PER_DAY (0 = unlimited)
 */
export async function checkDailyGenerationLimit(
  kv: KVNamespace | undefined,
  hashedIp: string,
  maxPerDay: number
): Promise<RateLimitResult> {
  if (maxPerDay <= 0 || !kv) {
    return { allowed: true, limit: maxPerDay, remaining: 999 };
  }

  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `rl:daily_gen:${hashedIp}:${todayStr}`;

  try {
    const rawCount = await kv.get(key);
    const count = rawCount ? parseInt(rawCount, 10) : 0;

    if (count >= maxPerDay) {
      return {
        allowed: false,
        limit: maxPerDay,
        remaining: 0,
        retryAfterSeconds: 86400 - (Math.floor(Date.now() / 1000) % 86400),
        reason: `Daily limit of ${maxPerDay} accounts reached for today.`,
      };
    }

    return {
      allowed: true,
      limit: maxPerDay,
      remaining: Math.max(0, maxPerDay - count),
    };
  } catch (err) {
    console.warn('KV daily generation limit check error:', err);
    return { allowed: true, limit: maxPerDay, remaining: maxPerDay };
  }
}

/**
 * Increment daily generation counter after successful generation
 */
export async function recordGeneration(
  kv: KVNamespace | undefined,
  hashedIp: string
): Promise<void> {
  if (!kv) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  const key = `rl:daily_gen:${hashedIp}:${todayStr}`;
  try {
    const rawCount = await kv.get(key);
    const count = rawCount ? parseInt(rawCount, 10) : 0;
    // 25 hours TTL so it expires after current day ends
    await kv.put(key, (count + 1).toString(), { expirationTtl: 90000 });
  } catch (err) {
    console.warn('KV record generation error:', err);
  }
}
