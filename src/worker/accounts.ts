import { Env, SupportedProtocol } from './types';
import { getSessionUser, SessionUser } from './auth';
import { XuiClient, XuiError, XUI_PROTOCOLS } from './xui';
import { verifyTurnstileToken } from './turnstile';

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}
function numberSetting(value: string | number | undefined, fallback: number, min: number, max: number): number {
  const result = Number(value ?? fallback);
  return Number.isFinite(result) ? Math.max(min, Math.min(max, Math.floor(result))) : fallback;
}
async function requireUser(request: Request, env: Env): Promise<SessionUser | Response> {
  const user = await getSessionUser(request, env);
  return user || json({ success: false, error: 'Please sign in to continue.' }, 401);
}
async function policySetting(env: Env, key: string, fallback: number, min: number, max: number): Promise<number> {
  const stored = env.DB ? await env.DB.prepare('SELECT value FROM app_settings WHERE key=?').bind(`policy.${key}`).first<{value:string}>() : null;
  const envValue = (env as unknown as Record<string, string | number | undefined>)[key];
  const localOverrideKey = key === 'MAX_ACCOUNTS_PER_DAY' ? 'LOCAL_TEST_MAX_ACCOUNTS_PER_DAY' : key === 'MAX_ACTIVE_ACCOUNTS_PER_USER' ? 'LOCAL_TEST_MAX_ACTIVE_ACCOUNTS_PER_USER' : null;
  const localOverride = String(env.LOCAL_TEST_MODE).toLowerCase() === 'true' && localOverrideKey ? (env as unknown as Record<string, string | number | undefined>)[localOverrideKey] : undefined;
  return numberSetting(localOverride ?? stored?.value ?? envValue, fallback, min, max);
}
async function recordIntegrationFailure(env:Env, action:string, error:unknown):Promise<void> {
  if (!env.DB) return;
  const code = error instanceof XuiError ? error.code : 'internal';
  const safeAction = ['read','create','delete','health','mapping'].includes(action) ? action : 'unknown';
  try { await env.DB.prepare('INSERT INTO integration_events(id,action,error_code,created_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),safeAction,code,Math.floor(Date.now()/1000)).run(); } catch { /* Sensitive panel responses are never logged. */ }
}function asJson(value: unknown): Response { return value instanceof Response ? value : json({ success: true, ...value as object }); }

export async function handleAccountApi(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/accounts') && !url.pathname.startsWith('/api/admin/')) return null;
  if (!env.DB) return json({ success: false, error: 'Account storage is not configured.' }, 503);
  const auth = await requireUser(request, env);
  if (auth instanceof Response) return auth;
  const user = auth;
  const now = Math.floor(Date.now() / 1000);
  const xui = (() => { try { return new XuiClient(env); } catch (err) { return err; } })();
  const client = xui instanceof XuiClient ? xui : null;

  if (url.pathname === '/api/accounts' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT id,inbound_id,protocol,client_email,client_id,status,created_at,expires_at,traffic_limit_bytes,traffic_used_bytes FROM vpn_accounts WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC').bind(user.id).all<Record<string, any>>();
    const accounts = rows.results || [];
    if (client) {
      for (const account of accounts) {
        if (account.status === 'error') { account.panelStateVerified = false; continue; }
        try {
          const panelState = await client.getClientState(account.client_email);
          if (!panelState.exists) {
            await env.DB.prepare("UPDATE vpn_accounts SET status='missing',last_synced_at=? WHERE id=? AND user_id=?").bind(now, account.id, user.id).run();
            account.status = 'missing';
          } else {
            const status = panelState.expiresAt && panelState.expiresAt <= now ? 'expired' : panelState.enabled ? 'active' : 'disabled';
            await env.DB.prepare('UPDATE vpn_accounts SET status=?,traffic_used_bytes=?,last_synced_at=? WHERE id=? AND user_id=?').bind(status, panelState.usedBytes ?? null, now, account.id, user.id).run();
            Object.assign(account, { status, traffic_used_bytes: panelState.usedBytes ?? null });
          }
          if (account.status === 'active') account.config = await client.getConfigForAccount(account.protocol, account.inbound_id, account.client_email);
        } catch {
          // Show the last confirmed website metadata while panel state is unavailable; do not claim fresh usage or status.
          account.panelStateVerified = false;
        }
      }
    }
    if (!client) for (const account of accounts) account.panelStateVerified = false;
    return asJson({ accounts: accounts.map((account) => ({ id: account.id, protocol: account.protocol, inboundId: account.inbound_id, status: account.status, createdAt: account.created_at, expiresAt: account.expires_at, trafficLimitBytes: account.traffic_limit_bytes, trafficUsedBytes: account.panelStateVerified === false ? null : account.traffic_used_bytes, panelStateVerified: account.panelStateVerified !== false, config: account.config || null })) });
  }

  if (url.pathname === '/api/accounts/options' && request.method === 'GET') {
    if (!client) return json({ success: false, error: 'The connection service is not configured.' }, 503);
    try {
      const available = await client.getEnabledOptions();
      return json({ success: true, options: available.map(({ protocol, label }) => ({ protocol, label })), accountPolicy: { expiryDays: await policySetting(env, 'ACCOUNT_EXPIRY_DAYS', 7, 1, 365), trafficGB: await policySetting(env, 'ACCOUNT_TRAFFIC_GB', 0, 0, 1_000_000) } });
    } catch (error) { await recordIntegrationFailure(env,'read',error); return json({ success: false, error: error instanceof XuiError ? error.message : 'The connection service is temporarily unavailable.' }, 503); }
  }

  if (url.pathname === '/api/accounts' && request.method === 'POST') {
    if (!client) return json({ success: false, error: 'The connection service is not configured.' }, 503);
    let body: any;
    try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON body.' }, 400); }
    const protocol = body?.protocol as SupportedProtocol;
    const idempotencyKey = request.headers.get('Idempotency-Key') || '';
    if (!XUI_PROTOCOLS.includes(protocol) || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) return json({ success: false, error: 'Choose a supported connection type and provide an idempotency key.' }, 400);
    if (String(env.REQUIRE_TURNSTILE).toLowerCase() === 'true') {
      if (!env.TURNSTILE_SECRET?.trim()) return json({ success:false, error:'Turnstile verification is not configured.' },503);
      const verification = await verifyTurnstileToken(typeof body?.turnstileToken === 'string' ? body.turnstileToken : undefined, env.TURNSTILE_SECRET, request.headers.get('cf-connecting-ip') || '');
      if (!verification.success) return json({ success: false, error: 'Turnstile verification failed.' }, 403);
    }
    const previous = await env.DB.prepare('SELECT id,inbound_id,protocol,client_email,client_id,status,created_at,expires_at,traffic_limit_bytes,deleted_at,(SELECT expires_at FROM account_reservations r WHERE r.id=vpn_accounts.id) AS reservation_expires_at FROM vpn_accounts WHERE user_id=? AND idempotency_key=?').bind(user.id, idempotencyKey).first<Record<string, any>>();
    if (previous?.deleted_at) return json({ success: false, error: 'This account request has already been deleted.' }, 410);
    if (previous) {
      let state; try { state = await client.getClientState(previous.client_email); } catch (error) { await recordIntegrationFailure(env,'read',error); return json({success:false,error:error instanceof XuiError?error.message:'The connection service is temporarily unavailable.'},503); }
      if (state.exists) {
        let config:string; try { config = await client.getConfigForAccount(previous.protocol, previous.inbound_id, previous.client_email); } catch (error) { await recordIntegrationFailure(env,'read',error); return json({success:false,error:error instanceof XuiError?error.message:'The connection service is temporarily unavailable.'},503); }
        await env.DB.batch([env.DB.prepare("UPDATE vpn_accounts SET status='active',last_synced_at=? WHERE id=? AND user_id=?").bind(now, previous.id, user.id),env.DB.prepare('DELETE FROM account_reservations WHERE id=?').bind(previous.id)]);
        return json({ success: true, account: { id: previous.id, protocol: previous.protocol, status: 'active', createdAt: previous.created_at, expiresAt: previous.expires_at, trafficLimitBytes: previous.traffic_limit_bytes, config } });
      }
      if (previous.status === 'pending' && Number(previous.reservation_expires_at || 0) > now) return json({ success: false, error: 'This request is still being reconciled. Retry with the same request key shortly.' }, 409);
      await env.DB.prepare('DELETE FROM vpn_accounts WHERE id=? AND user_id=?').bind(previous.id, user.id).run();
      await env.DB.prepare('DELETE FROM account_reservations WHERE id=?').bind(previous.id).run();
    }
    let options; try { options = await client.getEnabledOptions(); } catch (error) { await recordIntegrationFailure(env,'read',error); return json({success:false,error:error instanceof XuiError?error.message:'The connection service is temporarily unavailable.'},503); }
    const option = options.find((item) => item.protocol === protocol);
    if (!option) return json({ success: false, error: 'This connection type is temporarily unavailable.' }, 400);
    const dailyLimit = await policySetting(env, 'MAX_ACCOUNTS_PER_DAY', 1, 1, 100);
    const activeLimit = await policySetting(env, 'MAX_ACTIVE_ACCOUNTS_PER_USER', 3, 1, 100);
    const expiryDays = await policySetting(env, 'ACCOUNT_EXPIRY_DAYS', 7, 1, 365);
    const allowedDurations = [86400, 345600, 604800];
    const requestedDuration = Number(body?.duration);
    if (!allowedDurations.includes(requestedDuration)) return json({ success: false, error: 'Choose a supported account duration.' }, 400);
    const trafficGB = await policySetting(env, 'ACCOUNT_TRAFFIC_GB', 0, 0, 1_000_000);
    const expiresAt = now + Math.min(requestedDuration, expiryDays * 86400);
    const trafficBytes = trafficGB * 1024 * 1024 * 1024;
    const id = crypto.randomUUID();
    const clientEmail = `wgv-${id.replace(/-/g, '').slice(0, 20)}`;
    const day = new Date(now * 1000).toISOString().slice(0, 10);
    const reservationExpires = now + 120;
    const reserve = env.DB.prepare(`INSERT INTO account_reservations(id,user_id,day,expires_at)
      SELECT ?,?,?,? WHERE
      (SELECT COUNT(*) FROM vpn_accounts WHERE user_id=? AND status='active' AND expires_at>?) +
      (SELECT COUNT(*) FROM account_reservations WHERE user_id=? AND expires_at>?) < ? AND
      (SELECT COUNT(*) FROM vpn_accounts WHERE user_id=? AND status IN ('active','disabled','expired','missing') AND created_at>=?) +
      (SELECT COUNT(*) FROM account_reservations WHERE user_id=? AND day=? AND expires_at>?) < ?`)
      .bind(id, user.id, day, reservationExpires, user.id, now, user.id, now, activeLimit, user.id, now - (now % 86400), user.id, day, now, dailyLimit);
    const insert = env.DB.prepare(`INSERT INTO vpn_accounts(id,user_id,inbound_id,protocol,client_email,client_id,status,created_at,expires_at,traffic_limit_bytes,idempotency_key)
      SELECT ?,?,?,?,?,?,'pending',?,?,?,? WHERE EXISTS (SELECT 1 FROM account_reservations WHERE id=?)`)
      .bind(id, user.id, option.inboundId, protocol, clientEmail, id, now, expiresAt, trafficBytes, idempotencyKey, id);
    const reservationResult = await env.DB.batch([reserve, insert]);
    if (Number(reservationResult[0]?.meta?.changes || 0) !== 1) return json({ success: false, error: 'Your account creation limit has been reached.' }, 429);
    try {
      // A timed-out first attempt may already have reached the panel. Reconcile before creating again.
      let state: { exists: boolean; enabled?: boolean; usedBytes?: number; totalBytes?: number; expiresAt?: number } = await client.getClientState(clientEmail);
      if (!state.exists) {
        await client.createClient({ protocol, accountId: id, expiresAt, trafficLimitBytes: trafficBytes });
        state = await client.getClientState(clientEmail);
      }
      if (!state.exists) throw new XuiError('invalid_response', 'The panel did not confirm the created client.');
      const config = await client.getConfigForAccount(protocol, option.inboundId, clientEmail);
      await env.DB.batch([
        env.DB.prepare("UPDATE vpn_accounts SET status='active',last_synced_at=?,traffic_used_bytes=? WHERE id=? AND user_id=?").bind(now, state.usedBytes ?? null, id, user.id),
        env.DB.prepare('DELETE FROM account_reservations WHERE id=?').bind(id),
      ]);
      return json({ success: true, account: { id, protocol, status: 'active', createdAt: now, expiresAt, trafficLimitBytes: trafficBytes, config } }, 201);
    } catch (error) {
      if (!(error instanceof XuiError) || error.code === 'unavailable') {
        // Keep the pending row and reservation; a retry will reconcile against the deterministic panel email first.
        return json({ success: false, error: 'The request result is being checked. Please retry shortly.' }, 502);
      }
      await env.DB.batch([
        env.DB.prepare("UPDATE vpn_accounts SET status='error' WHERE id=? AND user_id=?").bind(id, user.id),
        env.DB.prepare('DELETE FROM account_reservations WHERE id=?').bind(id),
      ]);
      const message = error instanceof XuiError ? error.message : 'Could not create the VPN account.';
      return json({ success: false, error: message }, error instanceof XuiError && error.code === 'unsupported' ? 409 : 502);
    }
  }

  const match = url.pathname.match(/^\/api\/accounts\/([0-9a-f-]{36})$/i);
  if (match && request.method === 'DELETE') {
    if (!client) return json({ success: false, error: 'The connection service is not configured.' }, 503);
    const account = await env.DB.prepare("SELECT id,inbound_id,client_email,client_id,status FROM vpn_accounts WHERE id=? AND user_id=? AND deleted_at IS NULL").bind(match[1], user.id).first<{id:string;inbound_id:number;client_email:string;client_id:string;status:string}>();
    if (!account) return json({ success: false, error: 'Account not found.' }, 404);
    try {
      let alreadyMissing = false;
      const panelState = await client.getClientState(account.client_email);
      alreadyMissing = !panelState.exists;
      if (panelState.exists) {
        try {
          await client.deleteClient({ inboundId: account.inbound_id, clientEmail: account.client_email, clientId: account.client_id });

        } catch (deleteError) {
          // A timeout or a negative delete response can occur after the panel applied the change. Reconcile before deciding.
          const reconciled = await client.getClientState(account.client_email);
          if (reconciled.exists) throw deleteError;
          alreadyMissing = true;
        }
      }
      await env.DB.prepare("UPDATE vpn_accounts SET status='disabled',deleted_at=?,last_synced_at=? WHERE id=? AND user_id=? AND deleted_at IS NULL").bind(now, now, account.id, user.id).run();
      return json({ success: true, alreadyMissing });
    } catch (error) { await recordIntegrationFailure(env,'delete',error); return json({ success: false, error: error instanceof XuiError ? error.message : 'Could not delete the account.' }, 502); }
  }

  if (url.pathname.startsWith('/api/admin/')) {
    if (user.role !== 'admin') return json({ success: false, error: 'Administrator access required.' }, 403);
    if (url.pathname === '/api/admin/logs' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT action,error_code,created_at FROM integration_events ORDER BY created_at DESC LIMIT 100').all();
      return json({success:true,logs:rows.results||[]});
    }
    if (url.pathname === '/api/admin/users' && request.method === 'GET') {
      const users = await env.DB.prepare('SELECT id,email,role,verified_at,restricted,created_at FROM users ORDER BY created_at DESC LIMIT 500').all();
      return json({ success: true, users: users.results || [] });
    }
    if (url.pathname === '/api/admin/settings' && request.method === 'GET') {
      const options = client ? await client.getEnabledOptions().catch(() => []) : [];
      const mappings = client ? await client.getMappings().catch(() => []) : [];
      const counts = await env.DB.prepare("SELECT status,COUNT(*) as count FROM vpn_accounts GROUP BY status").all();
      return json({ success: true, limits: { daily: await policySetting(env, 'MAX_ACCOUNTS_PER_DAY', 1, 1, 100), active: await policySetting(env, 'MAX_ACTIVE_ACCOUNTS_PER_USER', 3, 1, 100), expiryDays: await policySetting(env, 'ACCOUNT_EXPIRY_DAYS', 7, 1, 365), trafficGB: await policySetting(env, 'ACCOUNT_TRAFFIC_GB', 0, 0, 1_000_000) }, enabledProtocols: options.map(({ protocol }) => protocol), mappings, accountStats: counts.results || [] });
    }
    if (url.pathname === '/api/admin/settings' && request.method === 'POST') {
      if (!client) return json({ success:false, error:'The connection service is not configured.' },503);
      let body:any; try { body = await request.json(); } catch { return json({success:false,error:'Invalid JSON body.'},400); }
      const limits = body?.limits || {};
      const values = [
        ['MAX_ACCOUNTS_PER_DAY', numberSetting(limits.daily,1,1,100)],
        ['MAX_ACTIVE_ACCOUNTS_PER_USER', numberSetting(limits.active,3,1,100)],
        ['ACCOUNT_EXPIRY_DAYS', numberSetting(limits.expiryDays,7,1,365)],
        ['ACCOUNT_TRAFFIC_GB', numberSetting(limits.trafficGB,0,0,1_000_000)],
      ] as const;
      if (!Array.isArray(body?.mappings) || body.mappings.length > XUI_PROTOCOLS.length) return json({success:false,error:'Provide the complete protocol mapping list.'},400);
      const map:Partial<Record<SupportedProtocol,number>> = {};
      const rows:Array<{protocol:SupportedProtocol;inboundId:number;enabled:boolean}> = [];
      for (const item of body.mappings) {
        const protocol = item?.protocol as SupportedProtocol;
        if (!XUI_PROTOCOLS.includes(protocol) || !Number.isInteger(item?.inboundId) || item.inboundId < 3 || typeof item.enabled !== 'boolean' || map[protocol]) return json({success:false,error:'Protocol mapping is invalid.'},400);
        map[protocol] = item.inboundId; rows.push({protocol,inboundId:item.inboundId,enabled:item.enabled});
      }
      try { await client.verifyMappings(map); } catch (error) { return json({success:false,error:error instanceof XuiError?error.message:'Could not validate mappings.'},400); }
      const statements = values.map(([key,value]) => env.DB!.prepare('INSERT INTO app_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(`policy.${key}`,String(value),now));
      statements.push(env.DB.prepare('DELETE FROM inbound_mappings'));
      for (const row of rows) statements.push(env.DB.prepare('INSERT INTO inbound_mappings(protocol,inbound_id,enabled,updated_at) VALUES(?,?,?,?)').bind(row.protocol,row.inboundId,row.enabled?1:0,now));
      statements.push(env.DB.prepare('INSERT INTO audit_log(id,actor_user_id,action,target_id,metadata_json,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'admin.settings.updated',null,JSON.stringify({protocolCount:rows.length}),now));
      await env.DB.batch(statements);
      return json({success:true});
    }
    if (url.pathname === '/api/admin/health' && request.method === 'GET') {
      if (!client) return json({success:false,error:'The connection service is not configured.'},503);
      try { const [health,info] = await Promise.all([client.getHealth(),client.getPanelInfo()]); return json({success:true,panelVersion:health.panelVersion,apiVersion:info.version,xrayState:health.xrayState,cpuPercent:health.cpuPercent,configuredInbounds:(await client.getMappings()).length,checkedAt:now}); }
      catch (error) { return json({success:false,error:error instanceof XuiError?error.message:'The connection service health check failed.'},503); }
    }
    const restriction = url.pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/restriction$/i);
    if (restriction && request.method === 'POST') {
      let body:any; try { body = await request.json(); } catch { return json({success:false,error:'Invalid JSON body.'},400); }
      if (typeof body?.restricted !== 'boolean' || restriction[1] === user.id) return json({success:false,error:'Restriction request is invalid.'},400);
      const result = await env.DB.prepare('UPDATE users SET restricted=?,updated_at=? WHERE id=? AND role=\'user\'').bind(body.restricted?1:0,now,restriction[1]).run();
      if (!Number(result.meta.changes||0)) return json({success:false,error:'User not found.'},404);
      if (body.restricted) await env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(restriction[1]).run();
      await env.DB.prepare('INSERT INTO audit_log(id,actor_user_id,action,target_id,metadata_json,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,body.restricted?'admin.user.restricted':'admin.user.enabled',restriction[1],'{}',now).run();
      return json({success:true});
    }
  }
  return json({ success: false, error: 'Endpoint not found.' }, 404);
}
