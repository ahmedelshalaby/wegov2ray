import { Env, SupportedProtocol } from './types';

export const XUI_PROTOCOLS: readonly SupportedProtocol[] = [
  'vless-reality', 'vless-ws', 'vmess-ws-tls', 'trojan-tls', 'shadowsocks', 'vless-grpc-tls', 'vless-httpupgrade-tls',
];
type Json = Record<string, any>;
type Inbound = { id: number; enable?: boolean; protocol: string; port: number; remark?: string; listen?: string; settings: Json | string; streamSettings: Json | string };
export type XuiConfig = { protocol: SupportedProtocol; inboundId: number; label: string; enabled: boolean; panelVersion: string };

export class XuiError extends Error {
  constructor(public readonly code: 'not_configured'|'unavailable'|'unauthorized'|'invalid_response'|'unsupported'|'not_found', message: string) { super(message); this.name = 'XuiError'; }
}

export function parseInboundMap(value?: string): Partial<Record<SupportedProtocol, number>> {
  if (!value) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new XuiError('not_configured', 'Inbound mapping configuration is invalid.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new XuiError('not_configured', 'Inbound mapping configuration is invalid.');
  const result: Partial<Record<SupportedProtocol, number>> = {};
  for (const [key, id] of Object.entries(parsed)) {
    if (!XUI_PROTOCOLS.includes(key as SupportedProtocol) || !Number.isInteger(id) || Number(id) < 3) throw new XuiError('not_configured', 'Inbound mapping configuration is invalid.');
    result[key as SupportedProtocol] = Number(id);
  }
  return result;
}
function parseJson<T>(value: unknown): T {
  if (typeof value === 'string') { try { return JSON.parse(value) as T; } catch { throw new XuiError('invalid_response', 'Panel returned invalid configuration data.'); } }
  if (!value || typeof value !== 'object') throw new XuiError('invalid_response', 'Panel returned invalid configuration data.');
  return value as T;
}
function validateBaseUrl(raw?: string): URL {
  if (!raw) throw new XuiError('not_configured', 'The connection service is not configured.');
  let url: URL;
  try { url = new URL(raw); } catch { throw new XuiError('not_configured', 'The connection service settings are invalid.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new XuiError('not_configured', 'The connection service settings are invalid.');
  return url;
}
function protocolMatches(protocol: SupportedProtocol, inbound: Inbound): boolean {
  const stream = parseJson<Json>(inbound.streamSettings);
  const network = String(stream.network || '').toLowerCase();
  const security = String(stream.security || '').toLowerCase();
  const proto = inbound.protocol.toLowerCase();
  if (protocol === 'vless-reality') return proto === 'vless' && network === 'tcp' && security === 'reality';
  if (protocol === 'vless-ws') return proto === 'vless' && network === 'ws' && security === 'tls';
  if (protocol === 'vmess-ws-tls') return proto === 'vmess' && network === 'ws' && security === 'tls';
  if (protocol === 'trojan-tls') return proto === 'trojan' && network === 'tcp' && security === 'tls';
  if (protocol === 'shadowsocks') return proto === 'shadowsocks';
  if (protocol === 'vless-grpc-tls') return proto === 'vless' && network === 'grpc' && security === 'tls';
  return proto === 'vless' && network === 'httpupgrade' && security === 'tls';
}
function decodeSettings<T>(value: unknown): T { return parseJson<T>(value); }
function clientTrafficBytes(client: Json): number | undefined {
  const up = client.traffic?.up ?? client.up;
  const down = client.traffic?.down ?? client.down;
  if (up === undefined || up === null || down === undefined || down === null) return undefined;
  const bytes = Number(up) + Number(down);
  return Number.isFinite(bytes) && bytes >= 0 ? bytes : undefined;
}

export class XuiClient {
  private readonly base: URL;
  private readonly token: string;
  private apiSpec?: Json;
  private inboundCache?: Inbound[];
  constructor(private readonly env: Env) {
    this.base = validateBaseUrl(env.XUI_BASE_URL);
    if (!env.XUI_API_TOKEN?.trim()) throw new XuiError('not_configured', 'The connection service credentials are not configured.');
    this.token = env.XUI_API_TOKEN.trim();
  }
  private panelUrl(path: string): URL {
    const basePath = this.base.pathname.replace(/\/+$/, '');
    return new URL(`${basePath}${path.startsWith('/') ? path : `/${path}`}`, this.base.origin);
  }
  private async request(path: string, init: RequestInit = {}): Promise<Json> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    let response: Response;
    try {
      response = await fetch(this.panelUrl(path), { ...init, redirect: 'manual', signal: controller.signal, headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
    } catch (error) {
      const cause = error instanceof Error ? (error as Error & { cause?: { code?: unknown; name?: unknown } }).cause : undefined;
      const causeCode = typeof cause?.code === 'string' && /^[A-Z0-9_]+$/.test(cause.code) ? cause.code : 'none';
      const causeName = typeof cause?.name === 'string' && /^[A-Za-z]+$/.test(cause.name) ? cause.name : 'unknown';
      console.warn('[3x-ui network failure]', error instanceof Error ? error.name : 'unknown', causeName, causeCode);
      throw new XuiError('unavailable', 'Could not reach the connection service securely.');
    } finally { clearTimeout(timer); }
    if (!response.ok) console.warn('[3x-ui HTTP response]', response.status);
    if (response.status === 401 || response.status === 403) throw new XuiError('unauthorized', 'The connection service could not verify its credentials.');
    if (!response.ok) throw new XuiError(response.status === 404 ? 'unsupported' : 'unavailable', `The connection service returned an error (${response.status}).`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new XuiError('invalid_response', 'The connection service returned an invalid response.'); }
    if (!data || typeof data !== 'object') throw new XuiError('invalid_response', 'The connection service returned an invalid response.');
    return data as Json;
  }
  private async spec(): Promise<Json> {
    if (this.apiSpec) return this.apiSpec;
    const response = await this.request('/panel/api/openapi.json');
    this.apiSpec = response;
    return response;
  }
  private async endpoint(paths: string[], method: 'get'|'post'): Promise<string> {
    const spec = await this.spec();
    const available = spec.paths && typeof spec.paths === 'object' ? spec.paths as Json : {};
    const path = paths.find((candidate) => available[candidate]?.[method]);
    if (!path) throw new XuiError('unsupported', 'The connection service does not support the required operation.');
    return path;
  }
  async getPanelInfo(): Promise<{ version: string; inbounds: Inbound[] }> {
    const spec = await this.spec();
    if (this.inboundCache) return { version: typeof spec.info?.version === 'string' ? spec.info.version : 'unknown', inbounds: this.inboundCache };
    const inboundsPath = await this.endpoint(['/panel/api/inbounds/list'], 'get');
    const response = await this.request(inboundsPath);
    if (response.success !== true || !Array.isArray(response.obj)) throw new XuiError('invalid_response', 'The connection service returned invalid options.');
    this.inboundCache = response.obj as Inbound[];
    const version = typeof spec.info?.version === 'string' ? spec.info.version : 'unknown';
    return { version, inbounds: this.inboundCache };
  }
  async getHealth(): Promise<{ xrayState: string; cpuPercent: number | null; tcpCount: number | null; panelVersion: string | null }> {
    const path = await this.endpoint(['/panel/api/server/status'], 'get');
    const response = await this.request(path);
    if (response.success !== true || !response.obj || typeof response.obj !== 'object') throw new XuiError('invalid_response', 'The connection service returned invalid status data.');
    const snapshot = response.obj as Json;
    const cpu = typeof snapshot.cpu === 'number' ? snapshot.cpu : Number(snapshot.cpu);
    const cpuPercent = Number.isFinite(cpu) && cpu >= 0 && cpu <= 100 ? Math.round(cpu * 10) / 10 : null;
    const tcpCount = Number.isInteger(snapshot.tcpCount) && snapshot.tcpCount >= 0 ? snapshot.tcpCount : null;
    return { xrayState: String(snapshot.xray?.state || 'unknown'), cpuPercent, tcpCount, panelVersion: typeof snapshot.panelVersion === 'string' ? snapshot.panelVersion : null };
  }

  async getEnabledOptions(): Promise<XuiConfig[]> {
    let mapping = parseInboundMap(this.env.XUI_INBOUND_MAP);
    const enabledMap: Record<string, boolean> = {};
    if (this.env.DB) {
      const stored = await this.env.DB.prepare('SELECT protocol,inbound_id,enabled FROM inbound_mappings').all<{protocol:string;inbound_id:number;enabled:number}>();
      if (stored.results?.length) {
        mapping = {};
        for (const row of stored.results) if (XUI_PROTOCOLS.includes(row.protocol as SupportedProtocol) && row.inbound_id >= 3) { mapping[row.protocol as SupportedProtocol] = row.inbound_id; enabledMap[row.protocol] = row.enabled === 1; }
      }
    }
    const { version, inbounds } = await this.getPanelInfo();
    return XUI_PROTOCOLS.flatMap((protocol) => {
      const inboundId = mapping[protocol];
      if (!inboundId) return [];
      const inbound = inbounds.find((item) => item.id === inboundId);
      if (!inbound || inbound.enable === false || enabledMap[protocol] === false || !protocolMatches(protocol, inbound)) return [];
      return [{ protocol, inboundId, label: inbound.remark || protocol, enabled: true, panelVersion: version }];
    });
  }
  async verifyMappings(mappings: Partial<Record<SupportedProtocol, number>>): Promise<void> {
    const { inbounds } = await this.getPanelInfo();
    for (const [protocol, inboundId] of Object.entries(mappings)) {
      if (!XUI_PROTOCOLS.includes(protocol as SupportedProtocol) || !Number.isInteger(inboundId) || Number(inboundId) < 3) throw new XuiError('not_configured', 'Inbound mappings may only use configured website inbound IDs.');
      const inbound = inbounds.find((item) => item.id === Number(inboundId));
      if (!inbound || !protocolMatches(protocol as SupportedProtocol, inbound)) throw new XuiError('unsupported', `Inbound ${inboundId} does not match ${protocol}.`);
    }
  }
  async getMappings(): Promise<Array<{protocol:SupportedProtocol;inboundId:number;enabled:boolean}>> {
    let mapping = parseInboundMap(this.env.XUI_INBOUND_MAP);
    let enabled: Record<string, boolean> = {};
    if (this.env.DB) {
      const stored = await this.env.DB.prepare('SELECT protocol,inbound_id,enabled FROM inbound_mappings').all<{protocol:string;inbound_id:number;enabled:number}>();
      if (stored.results?.length) { mapping = {}; for (const row of stored.results) { if (XUI_PROTOCOLS.includes(row.protocol as SupportedProtocol)) { mapping[row.protocol as SupportedProtocol] = row.inbound_id; enabled[row.protocol] = row.enabled === 1; } } }
    }
    return XUI_PROTOCOLS.flatMap((protocol) => mapping[protocol] ? [{ protocol, inboundId: mapping[protocol]!, enabled: enabled[protocol] !== false }] : []);
  }
  async createClient(input: { protocol: SupportedProtocol; accountId: string; expiresAt: number; trafficLimitBytes: number }): Promise<{ inboundId: number; clientEmail: string; clientId: string; config: string; panelVersion: string; label: string }> {
    const options = await this.getEnabledOptions();
    const selected = options.find((option) => option.protocol === input.protocol);
    if (!selected) throw new XuiError('unsupported', 'The selected connection type is not enabled or does not match its inbound.');
    const inbound = this.inboundCache?.find((item) => item.id === selected.inboundId);
    if (!inbound) throw new XuiError('invalid_response', 'Configured inbound is missing from panel response.');
    this.validatePublicConfig(input.protocol, inbound);
    const clientEmail = `wgv-${input.accountId.replace(/-/g, '').slice(0, 20)}`;
    const clientId = crypto.randomUUID();
    const client: Json = { email: clientEmail, enable: true, totalGB: Math.ceil(input.trafficLimitBytes / (1024 ** 3)), expiryTime: input.expiresAt * 1000, limitIp: 0, comment: 'wegov2ray website account' };
    if (input.protocol === 'vless-reality') {
      const inboundSettings = decodeSettings<Json>(inbound.settings);
      client.flow = inboundSettings.clientsFlow || 'xtls-rprx-vision';
    }
    if (input.protocol === 'trojan-tls' || input.protocol === 'shadowsocks') client.password = clientId;
    else client.id = clientId;
    const modernPath = '/panel/api/clients/add';
    const spec = await this.spec();
    if (spec.paths?.[modernPath]?.post) {
      const result = await this.request(modernPath, { method: 'POST', body: JSON.stringify({ client, inboundIds: [selected.inboundId] }) });
      if (result.success !== true) throw new XuiError('unavailable', 'Account creation could not be confirmed.');
    } else {
      const legacyPath = '/panel/api/inbounds/addClient';
      if (!spec.paths?.[legacyPath]?.post) throw new XuiError('unsupported', 'The connection service does not support account creation.');
      const settings = decodeSettings<Json>(inbound.settings);
      const newClient: Json = { id: clientId, email: clientEmail, enable: true, limitIp: 0, totalGB: Math.ceil(input.trafficLimitBytes / (1024 ** 3)), expiryTime: input.expiresAt * 1000, ...(client.flow ? { flow: client.flow } : {}) };
      if (input.protocol === 'trojan-tls' || input.protocol === 'shadowsocks') { newClient.password = clientId; delete newClient.id; }
      const result = await this.request(legacyPath, { method: 'POST', body: JSON.stringify({ id: selected.inboundId, settings: JSON.stringify({ clients: [newClient], decryption: settings.decryption || 'none', fallbacks: settings.fallbacks || [] }) }) });
      if (result.success !== true) throw new XuiError('unavailable', 'Account creation could not be confirmed.');
    }
    this.inboundCache = undefined;
    const { version, inbounds } = await this.getPanelInfo();
    const createdInbound = inbounds.find((item) => item.id === selected.inboundId);
    const settings = createdInbound ? decodeSettings<Json>(createdInbound.settings) : null;
    const panelClient = Array.isArray(settings?.clients) ? settings.clients.find((item: Json) => item.email === clientEmail) : null;
    if (!panelClient) throw new XuiError('unavailable', 'Panel accepted the request but the created client could not yet be reconciled.');
    let config:string;
    try { config = this.makeLink(input.protocol, createdInbound!, panelClient); } catch { throw new XuiError('unavailable', 'The account was created, but its connection details could not be prepared.'); }
    return { inboundId: selected.inboundId, clientEmail, clientId: String(panelClient.id || panelClient.password || clientId), config, panelVersion: version, label: createdInbound!.remark || input.protocol };
  }
  async getConfigForAccount(protocol: SupportedProtocol, inboundId: number, email: string): Promise<string> {
    const { inbounds } = await this.getPanelInfo();
    const inbound = inbounds.find((item) => item.id === inboundId);
    if (!inbound || !protocolMatches(protocol, inbound)) throw new XuiError('not_found', 'The client inbound is missing or no longer compatible.');
    const settings = decodeSettings<Json>(inbound.settings);
    const client = Array.isArray(settings.clients) ? settings.clients.find((item: Json) => item.email === email) : null;
    if (!client) throw new XuiError('not_found', 'The panel no longer has this client.');
    return this.makeLink(protocol, inbound, client);
  }

  private validatePublicConfig(protocol: SupportedProtocol, inbound: Inbound): void {
    const host = this.env.XUI_PUBLIC_HOST?.trim();
    if (!host || /[/:?#@\s]/.test(host)) throw new XuiError('not_configured', 'XUI_PUBLIC_HOST must be configured as a hostname.');
    if (!Number.isInteger(Number(inbound.port)) || Number(inbound.port) < 1 || Number(inbound.port) > 65535) throw new XuiError('invalid_response', 'Inbound port is invalid.');
    const stream = decodeSettings<Json>(inbound.streamSettings);
    if (protocol === 'vless-reality') {
      const reality = decodeSettings<Json>(stream.realitySettings || {});
      const clientSettings = decodeSettings<Json>(reality.settings || {});
      const publicKey = reality.publicKey || reality.serverPublicKey || clientSettings.publicKey;
      const serverName = reality.serverNames?.[0] || clientSettings.serverName;
      if (!publicKey || !serverName) throw new XuiError('unsupported', 'Reality inbound is missing its public key or server name.');
    }
    if (protocol === 'shadowsocks') {
      const settings = decodeSettings<Json>(inbound.settings);
      if (!(settings.method || settings.cipher)) throw new XuiError('unsupported', 'Shadowsocks inbound is missing its cipher.');
    }
  }
  private makeLink(protocol: SupportedProtocol, inbound: Inbound, client: Json): string {
    const stream = decodeSettings<Json>(inbound.streamSettings);
    const settings = decodeSettings<Json>(inbound.settings);
    const host = this.env.XUI_PUBLIC_HOST?.trim();
    if (!host || /[/:?#@\s]/.test(host)) throw new XuiError('not_configured', 'XUI_PUBLIC_HOST must be configured as a hostname.');
    const port = Number(inbound.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new XuiError('invalid_response', 'Inbound port is invalid.');
    const network = String(stream.network || 'tcp').toLowerCase();
    const security = String(stream.security || 'none').toLowerCase();
    const tls = decodeSettings<Json>(stream.tlsSettings || {});
    const reality = decodeSettings<Json>(stream.realitySettings || {});
    const ws = decodeSettings<Json>(stream.wsSettings || {});
    const grpc = decodeSettings<Json>(stream.grpcSettings || {});
    const httpUpgrade = decodeSettings<Json>(stream.httpupgradeSettings || stream.httpUpgradeSettings || {});
    const query = new URLSearchParams();
    query.set('type', network);
    query.set('security', security);
    query.set('encryption', 'none');
    if (security === 'reality') {
      const clientSettings = decodeSettings<Json>(reality.settings || {});
      const pubkey = reality.publicKey || reality.serverPublicKey || clientSettings.publicKey;
      const sni = reality.serverNames?.[0] || clientSettings.serverName;
      if (!pubkey || !sni) throw new XuiError('unsupported', 'Reality inbound is missing its public key or server name.');
      query.set('pbk', String(pubkey)); query.set('sni', String(sni));
      const sid = reality.shortIds?.[0]; if (sid) query.set('sid', String(sid));
      query.set('fp', String(clientSettings.fingerprint || reality.fingerprint || 'chrome'));
      const spiderX = clientSettings.spiderX || reality.spiderX; if (spiderX) query.set('spx', String(spiderX));
      const flow = client.flow || settings.clientsFlow || (protocol === 'vless-reality' ? 'xtls-rprx-vision' : ''); if (flow) query.set('flow', String(flow));
    } else if (security === 'tls') {
      const sni = tls.serverName || tls.serverNames?.[0]; if (sni) query.set('sni', String(sni));
      if (tls.fingerprint) query.set('fp', String(tls.fingerprint));
      if (tls.alpn) query.set('alpn', Array.isArray(tls.alpn) ? tls.alpn.join(',') : String(tls.alpn));
    }
    if (network === 'ws' || network === 'httpupgrade') {
      const transport = network === 'ws' ? ws : httpUpgrade;
      if (transport.path) query.set('path', String(transport.path));
      if (transport.host) query.set('host', Array.isArray(transport.host) ? String(transport.host[0]) : String(transport.host));
    } else if (network === 'grpc') {
      if (grpc.serviceName) query.set('serviceName', String(grpc.serviceName));
      if (grpc.authority) query.set('authority', String(grpc.authority));
      if (grpc.multiMode) query.set('mode', 'multi');
    }
    const label = encodeURIComponent(String(inbound.remark || 'wegov2ray'));
    if (protocol === 'vmess-ws-tls') {
      const obj = { v: '2', ps: inbound.remark || 'wegov2ray', add: host, port: String(port), id: String(client.id || ''), aid: '0', scy: 'auto', net: network, type: 'none', host: String(ws.host || ''), path: String(ws.path || '/'), tls: 'tls', sni: String(tls.serverName || host), alpn: Array.isArray(tls.alpn) ? tls.alpn.join(',') : String(tls.alpn || '') };
      return `vmess://${btoa(JSON.stringify(obj))}`;
    }
    if (protocol === 'trojan-tls') {
      const password = String(client.password || client.id || '');
      if (!password) throw new XuiError('invalid_response', 'Panel client password is missing.');
      return `trojan://${encodeURIComponent(password)}@${host}:${port}?${query.toString()}#${label}`;
    }
    if (protocol === 'shadowsocks') {
      const password = String(client.password || client.id || '');
      const method = String(settings.method || settings.cipher || '');
      if (!password || !method) throw new XuiError('invalid_response', 'Shadowsocks client credentials or cipher are missing.');
      return `ss://${btoa(`${method}:${password}`)}@${host}:${port}#${label}`;
    }
    const id = String(client.id || ''); if (!id) throw new XuiError('invalid_response', 'Panel client UUID is missing.');
    return `vless://${encodeURIComponent(id)}@${host}:${port}?${query.toString()}#${label}`;
  }
  async deleteClient(account: { inboundId: number; clientEmail: string; clientId: string }): Promise<void> {
    const spec = await this.spec();
    const modernPath = '/panel/api/clients/del/{email}';
    if (spec.paths?.[modernPath]?.post) {
      const result = await this.request(`/panel/api/clients/del/${encodeURIComponent(account.clientEmail)}`, { method: 'POST', body: JSON.stringify({ keepTraffic: false }) });
      if (result.success !== true) throw new XuiError('unavailable', 'Account deletion could not be confirmed.');
      return;
    }
    const legacyPath = '/panel/api/inbounds/{id}/delClient/{clientId}';
    if (!spec.paths?.[legacyPath]?.post) throw new XuiError('unsupported', 'The connection service does not support account deletion.');
    const result = await this.request(`/panel/api/inbounds/${account.inboundId}/delClient/${encodeURIComponent(account.clientId)}`, { method: 'POST' });
    if (result.success !== true) throw new XuiError('unavailable', 'Account deletion could not be confirmed.');
  }
  async getClientState(email: string): Promise<{ exists: boolean; enabled?: boolean; usedBytes?: number; totalBytes?: number; expiresAt?: number }> {
    const spec = await this.spec();
    const path = '/panel/api/clients/list';
    if (!spec.paths?.[path]?.get) {
      const { inbounds } = await this.getPanelInfo();
      for (const inbound of inbounds) {
        const settings = parseJson<Json>(inbound.settings);
        const item = Array.isArray(settings.clients) ? settings.clients.find((client: Json) => client.email === email) : null;
        if (item) return { exists: true, enabled: item.enable !== false, usedBytes: clientTrafficBytes(item), totalBytes: Number(item.totalGB || 0) * (1024 ** 3), expiresAt: Number(item.expiryTime || 0) ? Math.floor(Number(item.expiryTime) / 1000) : undefined };
      }
      return { exists: false };
    }
    const response = await this.request(path);
    if (response.success !== true || !Array.isArray(response.obj)) throw new XuiError('invalid_response', 'The connection service returned invalid account status.');
    const item = response.obj.find((client: Json) => client.email === email);
    if (!item) return { exists: false };
    return { exists: true, enabled: item.enable !== false, usedBytes: clientTrafficBytes(item), totalBytes: Number(item.totalGB || 0) * (1024 ** 3), expiresAt: Number(item.expiryTime || 0) ? Math.floor(Number(item.expiryTime) / 1000) : undefined };
  }
}
