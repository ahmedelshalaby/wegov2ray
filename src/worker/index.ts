import { Env } from './types';
import { hashIp, checkGlobalRateLimit, isLocalTestRequest } from './rate-limit';
import { handleAuthApi } from './auth';
import { handleAccountApi } from './accounts';
import { XuiClient, XuiError } from './xui';

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
  if (!env.DB) return;
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(now),
    env.DB.prepare('DELETE FROM email_tokens WHERE expires_at<=?').bind(now),
    env.DB.prepare('DELETE FROM account_reservations WHERE expires_at<=?').bind(now),
    env.DB.prepare('DELETE FROM auth_rate_limits WHERE reset_at<=?').bind(now),
    env.DB.prepare("UPDATE vpn_accounts SET status='expired' WHERE status='active' AND expires_at<=?").bind(now),
  ]);
}
export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const clientIp = getClientIp(request);
  const hashedIp = await hashIp(clientIp);

  // 1. Global rate limiter (10 req/min per IP)
  const localRateLimit = isLocalTestRequest(request, env) ? Number(env.LOCAL_TEST_GLOBAL_RATE_LIMIT) || 120 : 10;
  const rl = await checkGlobalRateLimit(env.KV, hashedIp, localRateLimit);
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

  const authResponse = await handleAuthApi(request, env);
  if (authResponse) return authResponse;
  const accountResponse = await handleAccountApi(request, env);
  if (accountResponse) return accountResponse;

  // 2. GET /api/config
  if (request.method === 'GET' && url.pathname === '/api/config') {
    return jsonResponse({
      success: true,
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || '',
      supportUrl: env.SUPPORT_URL || 'https://t.me/wegov2ray',
      adsEnabled: String(env.ADS_ENABLED).toLowerCase() === 'true',
    });
  }

  // 3. GET /api/status — only report values confirmed by 3x-ui.
  if (request.method === 'GET' && url.pathname === '/api/status') {
    try {
      const health = await new XuiClient(env).getHealth();
      const state = health.xrayState.toLowerCase();
      return jsonResponse({ success: true, status: state === 'running' ? 'online' : state === 'unknown' ? 'degraded' : 'offline', tcpCount: health.tcpCount, xrayState: health.xrayState, serverLoadPercent: health.cpuPercent });
    } catch (error) {
      console.warn('[service status check failed]', error instanceof XuiError ? error.code : 'internal');
      return jsonResponse({ success: false, status: 'offline', tcpCount: null, xrayState: 'unknown', serverLoadPercent: null }, 503);
    }
  }
  if (request.method === 'POST' && url.pathname === '/api/generate') {
    return jsonResponse({ success: false, error: 'Use the authenticated VPN account endpoint.' }, 410);
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
