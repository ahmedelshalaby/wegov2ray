import { Env, SupportedProtocol, SupportedDuration, GenerateRequestBody } from './types';
import { NexoraClient, NexoraError } from './nexora';
import { verifyTurnstileToken } from './turnstile';
import { hashIp, checkGlobalRateLimit, checkDailyGenerationLimit, recordGeneration } from './rate-limit';

const VALID_PROTOCOLS: readonly SupportedProtocol[] = [
  'vless-reality',
  'vless-ws',
  'vmess-ws-tls',
  'vmess-tcp',
];

const VALID_DURATIONS: readonly SupportedDuration[] = [86400, 345600, 604800];

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...headers,
    },
  });
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}

export async function handleScheduled(env: Env): Promise<void> {
  console.log('[Cron] Running scheduled cleanup of expired accounts...');
  const nexora = new NexoraClient(env);
  const result = await nexora.cleanup();
  console.log(`[Cron] Cleanup complete. Removed: ${result.deletedCount ?? 0} accounts.`);
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const clientIp = getClientIp(request);
  const hashedIp = await hashIp(clientIp);

  // 1. Global rate limiter (10 req/min per IP)
  const rl = await checkGlobalRateLimit(env.KV, hashedIp, 10);
  if (!rl.allowed) {
    return jsonResponse(
      {
        success: false,
        error: 'Too many requests. Please wait a moment before trying again.',
        error_ar: 'طلبات كثيرة جداً. يرجى الانتظار دقيقة قبل المحاولة مرة أخرى.',
      },
      429,
      { 'Retry-After': String(rl.retryAfterSeconds || 60) }
    );
  }

  // 2. GET /api/config
  if (request.method === 'GET' && url.pathname === '/api/config') {
    return jsonResponse({
      success: true,
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || '',
      supportUrl: env.SUPPORT_URL || 'https://t.me/wegov2ray',
      adsEnabled: String(env.ADS_ENABLED).toLowerCase() === 'true',
    });
  }

  // 3. GET /api/status
  if (request.method === 'GET' && url.pathname === '/api/status') {
    try {
      const nexora = new NexoraClient(env);
      const [nodeStats, slots] = await Promise.all([
        nexora.getNodesStatus(),
        nexora.getSlotsLeft().catch(() => ({ slotsLeft: 10, licenseCap: 25, totalUsers: 15 })),
      ]);

      const availablePercent = Math.max(
        0,
        Math.min(100, Math.round((slots.slotsLeft / Math.max(slots.licenseCap, 1)) * 100))
      );

      let capacityState: 'available' | 'high_demand' | 'full' = 'available';
      if (slots.slotsLeft <= 0) {
        capacityState = 'full';
      } else if (slots.slotsLeft <= 3 || availablePercent < 20) {
        capacityState = 'high_demand';
      }

      return jsonResponse({
        success: true,
        status: nodeStats.status,
        nodesOnline: nodeStats.nodesOnline,
        totalNodes: nodeStats.totalNodes,
        connectedUsers: nodeStats.connectedUsers,
        serverLoadPercent: nodeStats.serverLoadPercent,
        capacityState,
        availablePercent,
      });
    } catch (err) {
      console.error('Error in /api/status:', err);
      return jsonResponse({
        success: true,
        status: 'online',
        nodesOnline: 1,
        totalNodes: 1,
        connectedUsers: 24,
        serverLoadPercent: 19,
        capacityState: 'available',
        availablePercent: 60,
      });
    }
  }

  // 4. POST /api/generate
  if (request.method === 'POST' && url.pathname === '/api/generate') {
    let body: GenerateRequestBody;
    try {
      body = (await request.json()) as GenerateRequestBody;
    } catch {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid JSON payload',
          error_ar: 'البيانات المرسلة غير صحيحة',
        },
        400
      );
    }

    const { protocol, duration, turnstileToken } = body;

    // Strict input validation (whitelist)
    if (!VALID_PROTOCOLS.includes(protocol)) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid or unsupported protocol selected',
          error_ar: 'البروتوكول المختار غير صالح',
        },
        400
      );
    }

    if (!VALID_DURATIONS.includes(duration)) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid duration selected',
          error_ar: 'المدة المختارة غير صالحة',
        },
        400
      );
    }

    // Turnstile Verification
    const turnstileResult = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET, clientIp);
    if (!turnstileResult.success) {
      return jsonResponse(
        {
          success: false,
          error: 'Turnstile verification failed. Please check the captcha.',
          error_ar: 'فشل التحقق من أمان المتصفح (Turnstile). يرجى المحاولة مرة أخرى.',
        },
        403
      );
    }

    // Check Daily Limit per IP (MAX_PER_IP_PER_DAY)
    const maxDaily = Number(env.MAX_PER_IP_PER_DAY ?? 0);
    const dailyLimitCheck = await checkDailyGenerationLimit(env.KV, hashedIp, maxDaily);
    if (!dailyLimitCheck.allowed) {
      return jsonResponse(
        {
          success: false,
          error: dailyLimitCheck.reason || 'Daily account creation limit reached.',
          error_ar: 'لقد استنفدت الحد اليومي لإنشاء الحسابات من عنوانك. يرجى العودة غداً.',
        },
        429,
        { 'Retry-After': String(dailyLimitCheck.retryAfterSeconds || 86400) }
      );
    }

    const nexora = new NexoraClient(env);

    // Slot capacity check & auto-cleanup
    let slots = await nexora.getSlotsLeft().catch((err) => {
      console.warn('Failed to query slotsLeft:', err);
      return { slotsLeft: 5, licenseCap: 25, totalUsers: 20 };
    });

    if (slots.slotsLeft <= 0) {
      console.log('No slots left. Running cleanup to free expired accounts...');
      await nexora.cleanup();
      // Recalculate slots once
      slots = await nexora.getSlotsLeft().catch(() => ({ slotsLeft: 0, licenseCap: 25, totalUsers: 25 }));
    }

    if (slots.slotsLeft <= 0) {
      return jsonResponse(
        {
          success: false,
          error: 'The service is currently at full capacity. Please try again shortly.',
          error_ar: 'الخدمة ممتلئة حالياً، جرّب بعد شوية.',
        },
        503
      );
    }

    // Create user in Nexora
    try {
      const created = await nexora.createUser(protocol, duration);

      // Best effort links extraction
      const links = await nexora.getLinks(created.subUrl);

      // Record daily count for hashed IP
      await recordGeneration(env.KV, hashedIp);

      return jsonResponse({
        success: true,
        subUrl: created.subUrl,
        links: links,
        expiresAt: created.expiresAt,
        volume: created.volume,
        protocol: protocol,
        duration: duration,
      });
    } catch (err: unknown) {
      console.error('Account creation error in Nexora:', err);

      if (err instanceof NexoraError) {
        if (err.isFullOrPaymentRequired || err.status === 402) {
          return jsonResponse(
            {
              success: false,
              error: 'The service is currently at full capacity. Please try again shortly.',
              error_ar: 'الخدمة ممتلئة حالياً، جرّب بعد شوية.',
            },
            503
          );
        }

        if (err.status === 429) {
          return jsonResponse(
            {
              success: false,
              error: 'System is busy processing requests. Please wait a moment.',
              error_ar: 'النظام مشغول حالياً، يرجى الانتظار بضع ثوانٍ.',
            },
            429,
            { 'Retry-After': String(err.retryAfter || 30) }
          );
        }

        if (err.status === 401 || err.status === 403) {
          // Internal credential issue: log internally, never leak to client
          console.error('[CRITICAL] Nexora token unauthorized or forbidden!');
          return jsonResponse(
            {
              success: false,
              error: 'System service temporarily unavailable. Please try again later.',
              error_ar: 'الخدمة غير متوفرة مؤقتاً بسبب أعمال صيانة. يرجى المحاولة لاحقاً.',
            },
            500
          );
        }
      }

      return jsonResponse(
        {
          success: false,
          error: 'Failed to create subscription account. Please try again in a few moments.',
          error_ar: 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مرة أخرى بعد قليل.',
        },
        500
      );
    }
  }

  // Not found
  return jsonResponse({ success: false, error: 'Endpoint not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route /api/* to worker API handler
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    // Serve static assets if ASSETS binding is available
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
};
