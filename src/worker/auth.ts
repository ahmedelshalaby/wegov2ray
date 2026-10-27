import { Env } from './types';
import { hashIp, isLocalTestRequest } from './rate-limit';

const SESSION_SECONDS = 60 * 60 * 24 * 14;
const TOKEN_SECONDS = 60 * 60;
const PBKDF2_ITERATIONS = 310_000;
const encoder = new TextEncoder();

export type SessionUser = { id: string; email: string; role: 'user' | 'admin'; verified_at: number | null; restricted: number; created_at: number };

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
function randomToken(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, iterationsText, saltText, expectedText] = encoded.split('$');
  const iterations = Number(iterationsText);
  if (algorithm !== 'pbkdf2-sha256' || !Number.isInteger(iterations) || iterations < 100_000 || !saltText || !expectedText) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = base64ToBytes(saltText); const saltBuffer = new ArrayBuffer(salt.byteLength); new Uint8Array(saltBuffer).set(salt);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBuffer, iterations }, key, 256));
  const expected = base64ToBytes(expectedText);
  return bits.length === expected.length && bits.every((value, index) => value === expected[index]);
}
function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try { const value = await request.json(); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; }
  catch { return null; }
}
function localTestMode(request: Request, env: Env): boolean {
  const url = new URL(request.url);
  return String(env.LOCAL_TEST_MODE).toLowerCase() === 'true' && url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(url.hostname);
}
function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(env.AUTH_ORIGIN || request.url).origin; } catch { return false; }
}
function cookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
function getCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) { const [key, ...rest] = part.trim().split('='); if (key === name) return rest.join('=') || null; }
  return null;
}
export async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  if (!env.DB) return null;
  const token = getCookie(request, 'wegov_session');
  if (!token) return null;
  const tokenHash = await digest(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT u.id,u.email,u.role,u.verified_at,u.restricted,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(tokenHash, now).first<SessionUser>();
  return row && row.restricted === 0 && row.verified_at ? row : null;
}
async function sendEmail(env: Env, to: string, subject: string, text: string): Promise<boolean> {
  if (!env.MAIL_API_KEY || !env.MAIL_FROM) return false;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.MAIL_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text }) });
  return response.ok;
}
async function issueEmailToken(env: Env, userId: string, email: string, purpose: 'verify' | 'reset', request: Request): Promise<boolean> {
  if (!env.DB || !env.MAIL_API_KEY || !env.MAIL_FROM) return false;
  const token = randomToken();
  const tokenHash = await digest(token);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare('DELETE FROM email_tokens WHERE user_id=? AND purpose=?').bind(userId, purpose).run();
  await env.DB.prepare('INSERT INTO email_tokens(token_hash,user_id,purpose,expires_at,created_at) VALUES(?,?,?,?,?)').bind(tokenHash, userId, purpose, now + TOKEN_SECONDS, now).run();
  const origin = env.AUTH_ORIGIN || new URL(request.url).origin;
  const path = purpose === 'verify' ? 'verify-email' : 'reset-password';
  const subject = purpose === 'verify' ? 'Verify your wegov2ray account' : 'Reset your wegov2ray password';
  return sendEmail(env, email, subject, `Use this one-time link within 60 minutes:\n${origin}/?${path}=${encodeURIComponent(token)}\n\nIf you did not request this, ignore this message.`);
}

export async function handleAuthApi(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith('/api/auth/')) return null;
  if (!env.DB) return json({ success: false, error: 'Account storage is not configured.' }, 503);
  if (request.method !== 'GET' && !originAllowed(request, env)) return json({ success: false, error: 'Request origin is not allowed.' }, 403);
  const now = Math.floor(Date.now() / 1000);
  if (/^\/api\/auth\/(register|login|verify|forgot-password|reset-password|resend-verification)$/.test(path)) {
    const hashedIp = await hashIp(request.headers.get('cf-connecting-ip') || 'unknown');
    const windowStart = Math.floor(now / 900) * 900;
    const bucketKey = `${path}:${hashedIp}:${windowStart}`;
    const limited = await env.DB.prepare('INSERT INTO auth_rate_limits(bucket_key,hits,reset_at) VALUES(?,1,?) ON CONFLICT(bucket_key) DO UPDATE SET hits=hits+1 RETURNING hits').bind(bucketKey,windowStart+900).first<{hits:number}>();
    const authLimit = isLocalTestRequest(request, env) ? Number(env.LOCAL_TEST_AUTH_RATE_LIMIT) || 100 : 8;
    if ((limited?.hits || 0) > authLimit) return json({success:false,error:'Too many account requests. Try again in 15 minutes.'},429,{'Retry-After':String(windowStart+900-now)});
  }

  if (path === '/api/auth/register' && request.method === 'POST') {
    const body = await readBody(request);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) return json({ success: false, error: 'Enter a valid email and a password of at least 12 characters.' }, 400);
    const localTest = localTestMode(request, env);
    if ((!env.MAIL_API_KEY || !env.MAIL_FROM) && !localTest) return json({ success: false, error: 'Email delivery is not configured. Registration is temporarily unavailable.' }, 503);
    const id = crypto.randomUUID();
    const role = env.ADMIN_EMAIL?.trim().toLowerCase() === email ? 'admin' : 'user';
    try {
      const passwordHash = await hashPassword(password);
      await env.DB.prepare('INSERT INTO users(id,email,password_hash,role,verified_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id, email, passwordHash, role, localTest ? now : null, now, now).run();
      if (localTest) return json({ success: true, message: 'Local test account created and verified; no email was sent.' }, 201);
      const sent = await issueEmailToken(env, id, email, 'verify', request);
      if (!sent) { await env.DB.batch([env.DB.prepare('DELETE FROM email_tokens WHERE user_id=?').bind(id),env.DB.prepare('DELETE FROM users WHERE id=?').bind(id)]); return json({ success: false, error: 'Could not send verification email. Try again later.' }, 503); }
      return json({ success: true, message: 'Check your email for the verification link.' }, 201);
    } catch (error) {
      const message = String(error);
      if (/UNIQUE|constraint/i.test(message)) return json({ success: false, error: 'An account with this email already exists.' }, 409);
      return json({ success: false, error: 'Could not create account.' }, 500);
    }
  }

  if (path === '/api/auth/login' && request.method === 'POST') {
    const body = await readBody(request);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const row = await env.DB.prepare('SELECT id,email,password_hash,verified_at,restricted FROM users WHERE email=?').bind(email).first<{id:string;email:string;password_hash:string;verified_at:number|null;restricted:number}>();
    if (!row || !(await verifyPassword(password, row.password_hash))) return json({ success: false, error: 'Email or password is incorrect.' }, 401);
    if (!row.verified_at) return json({ success: false, error: 'Verify your email before signing in.' }, 403);
    if (row.restricted) return json({ success: false, error: 'This account is restricted.' }, 403);
    const token = randomToken();
    await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await digest(token), row.id, now + SESSION_SECONDS, now).run();
    return json({ success: true, user: { id: row.id, email: row.email } }, 200, { 'Set-Cookie': cookie('wegov_session', token, SESSION_SECONDS) });
  }

  if (path === '/api/auth/logout' && request.method === 'POST') {
    const token = getCookie(request, 'wegov_session');
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
    return json({ success: true }, 200, { 'Set-Cookie': cookie('wegov_session', '', 0) });
  }

  if (path === '/api/auth/me' && request.method === 'GET') {
    const user = await getSessionUser(request, env);
    return user ? json({ success: true, user: { id: user.id, email: user.email, role: user.role } }) : json({ success: false, error: 'Authentication required.' }, 401);
  }

  if (path === '/api/auth/verify' && request.method === 'POST') {
    const body = await readBody(request);
    const token = typeof body?.token === 'string' ? body.token : '';
    if (token.length < 20 || token.length > 100) return json({ success: false, error: 'Verification link is invalid or expired.' }, 400);
    const tokenHash = await digest(token);
    const tokenRow = await env.DB.prepare("SELECT user_id FROM email_tokens WHERE token_hash=? AND purpose='verify' AND expires_at>?").bind(tokenHash, now).first<{user_id:string}>();
    if (!tokenRow) return json({ success: false, error: 'Verification link is invalid or expired.' }, 400);
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET verified_at=?,updated_at=? WHERE id=?').bind(now, now, tokenRow.user_id),
      env.DB.prepare('DELETE FROM email_tokens WHERE token_hash=?').bind(tokenHash),
    ]);
    return json({ success: true, message: 'Email verified. You can now sign in.' });
  }

  if (path === '/api/auth/resend-verification' && request.method === 'POST') {
    const body = await readBody(request);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const user = await env.DB.prepare('SELECT id,email FROM users WHERE email=? AND verified_at IS NULL AND restricted=0').bind(email).first<{id:string;email:string}>();
    if (user) await issueEmailToken(env,user.id,user.email,'verify',request);
    return json({success:true,message:'If verification is still needed, a new email has been sent.'});
  }
  if (path === '/api/auth/forgot-password' && request.method === 'POST') {
    const body = await readBody(request);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const user = await env.DB.prepare('SELECT id,email FROM users WHERE email=? AND verified_at IS NOT NULL AND restricted=0').bind(email).first<{id:string;email:string}>();
    if (user) await issueEmailToken(env, user.id, user.email, 'reset', request);
    return json({ success: true, message: 'If the account exists, a reset link has been sent.' });
  }

  if (path === '/api/auth/reset-password' && request.method === 'POST') {
    const body = await readBody(request);
    const token = typeof body?.token === 'string' ? body.token : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (password.length < 12 || password.length > 128) return json({ success: false, error: 'Password must be at least 12 characters.' }, 400);
    const tokenHash = await digest(token);
    const tokenRow = await env.DB.prepare("SELECT user_id FROM email_tokens WHERE token_hash=? AND purpose='reset' AND expires_at>?").bind(tokenHash, now).first<{user_id:string}>();
    if (!tokenRow) return json({ success: false, error: 'Reset link is invalid or expired.' }, 400);
    const passwordHash = await hashPassword(password);
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET password_hash=?,updated_at=? WHERE id=?').bind(passwordHash, now, tokenRow.user_id),
      env.DB.prepare('DELETE FROM email_tokens WHERE token_hash=?').bind(tokenHash),
      env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(tokenRow.user_id),
    ]);
    return json({ success: true, message: 'Password updated. Sign in again.' });
  }

  return json({ success: false, error: 'Endpoint not found.' }, 404);
}
