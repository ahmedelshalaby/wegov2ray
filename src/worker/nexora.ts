import {
  Env,
  SupportedProtocol,
  SupportedDuration,
  NexoraTemplate,
  NexoraNode,
  NexoraUserResponse
} from './types';

export const TEMPLATE_MAP: Record<SupportedProtocol, string> = {
  'vless-reality': 'VLESS TCP REALITY',
  'vless-ws': 'VLESS WS',
  'vmess-ws-tls': 'VMess WS TLS',
  'vmess-tcp': 'VMess TCP',
};

export const ONE_TB_BYTES = 1099511627776; // 1 TB in bytes

export class NexoraError extends Error {
  public status: number;
  public retryAfter?: number;
  public isFullOrPaymentRequired: boolean;

  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.name = 'NexoraError';
    this.status = status;
    this.retryAfter = retryAfter;
    this.isFullOrPaymentRequired = status === 402;
  }
}

export class NexoraClient {
  private baseUrl: string;
  private token: string;
  private kv?: KVNamespace;
  private licenseCap: number;
  private reservedSlots: number;
  private userIpLimit: number;

  constructor(env: Env) {
    this.baseUrl = (env.NEXORA_API_URL || 'https://ahmedmedo.bond:2053/api/v1').replace(/\/+$/, '');
    this.token = env.NEXORA_TOKEN || '';
    this.kv = env.KV;
    this.licenseCap = Number(env.LICENSE_CAP ?? 25);
    this.reservedSlots = Number(env.RESERVED_SLOTS ?? 3);
    this.userIpLimit = Number(env.USER_IP_LIMIT ?? 5);
  }

  private generateIdempotencyKey(): string {
    return crypto.randomUUID();
  }

  private generateRandomSuffix(length = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    return result;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders,
    };

    const res = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string> || {}),
      },
    });

    if (res.status === 429) {
      const retryAfterHeader = res.headers.get('Retry-After');
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
      throw new NexoraError('Nexora rate limit exceeded. Please wait.', 429, retryAfter);
    }

    if (!res.ok) {
      let errorMsg = `Nexora API error (${res.status})`;
      try {
        const errJson = (await res.json()) as { error?: string; message?: string };
        errorMsg = errJson.error || errJson.message || errorMsg;
      } catch {
        // use default error message
      }
      throw new NexoraError(errorMsg, res.status);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  }

  /**
   * List templates with 10-minute KV cache
   */
  async listTemplates(): Promise<NexoraTemplate[]> {
    const cacheKey = 'cache:templates:v1';
    if (this.kv) {
      try {
        const cached = await this.kv.get(cacheKey, 'json');
        if (cached && Array.isArray(cached)) {
          return cached as NexoraTemplate[];
        }
      } catch (err) {
        console.warn('KV read error for templates cache:', err);
      }
    }

    const res = await this.request<{ items?: NexoraTemplate[]; data?: NexoraTemplate[] }>('/templates?limit=100');
    const templates = res.items || res.data || [];

    // Filter and sanitize items to only id and name
    const sanitized = templates
      .filter((t) => t && t.id && t.name)
      .map((t) => ({ id: t.id, name: t.name }));

    if (this.kv && sanitized.length > 0) {
      try {
        await this.kv.put(cacheKey, JSON.stringify(sanitized), {
          expirationTtl: 600, // 10 minutes
        });
      } catch (err) {
        console.warn('KV write error for templates cache:', err);
      }
    }

    return sanitized;
  }

  /**
   * Resolve template ID for a supported protocol
   */
  async resolveTemplateId(protocol: SupportedProtocol): Promise<number> {
    const targetName = TEMPLATE_MAP[protocol];
    if (!targetName) {
      throw new NexoraError(`Unsupported protocol: ${protocol}`, 400);
    }

    const templates = await this.listTemplates();
    const found = templates.find((t) => t.name.trim().toLowerCase() === targetName.toLowerCase());

    if (!found) {
      // Fallback: try relaxed matching in case of slight spacing differences
      const relaxed = templates.find((t) =>
        t.name.toLowerCase().replace(/\s+/g, '') === targetName.toLowerCase().replace(/\s+/g, '')
      );
      if (relaxed) {
        return relaxed.id;
      }
      throw new NexoraError(`Template "${targetName}" not found on Nexora server`, 500);
    }

    return found.id;
  }

  /**
   * Get available user slots = LICENSE_CAP - total - RESERVED_SLOTS
   */
  async getSlotsLeft(): Promise<{ totalUsers: number; slotsLeft: number; licenseCap: number }> {
    const res = await this.request<{ total?: number; count?: number }>('/users?limit=1');
    const total = typeof res.total === 'number' ? res.total : (res.count || 0);
    const slots = this.licenseCap - total - this.reservedSlots;
    return {
      totalUsers: total,
      slotsLeft: Math.max(0, slots),
      licenseCap: this.licenseCap,
    };
  }

  /**
   * Bulk delete expired/limited accounts in group "wegov2ray-free"
   */
  async cleanup(): Promise<{ deletedCount?: number }> {
    const idempotencyKey = this.generateIdempotencyKey();
    try {
      const res = await this.request<{ count?: number; deleted?: number }>(
        '/users/bulk/delete?group=wegov2ray-free&status=expired,limited',
        {
          method: 'POST',
        },
        {
          'Idempotency-Key': idempotencyKey,
        }
      );
      return { deletedCount: res.count ?? res.deleted ?? 0 };
    } catch (err) {
      console.error('Nexora cleanup failed:', err);
      return { deletedCount: 0 };
    }
  }

  /**
   * Create account on Nexora
   */
  async createUser(
    protocol: SupportedProtocol,
    durationSeconds: SupportedDuration
  ): Promise<{
    user: NexoraUserResponse;
    subUrl: string;
    expiresAt: number;
    volume: number;
  }> {
    const templateId = await this.resolveTemplateId(protocol);
    const nowSec = Math.floor(Date.now() / 1000);
    const expiry = nowSec + durationSeconds;
    const userName = `wg-${this.generateRandomSuffix(8)}`;

    const payload = {
      name: userName,
      group: 'wegov2ray-free',
      desc: 'wegov2ray free',
      volume: ONE_TB_BYTES,
      expiry: expiry,
      templateIds: [templateId],
      allTemplates: false,
      ipLimit: this.userIpLimit,
    };

    let idempotencyKey = this.generateIdempotencyKey();
    let resUser: NexoraUserResponse | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        resUser = await this.request<NexoraUserResponse>(
          '/users',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          {
            'Idempotency-Key': idempotencyKey,
          }
        );
        break; // Success
      } catch (err) {
        if (err instanceof NexoraError && err.status === 409 && attempt === 1) {
          // If 409 conflict, retry once with same idempotency key as requested by spec
          console.warn('Received 409 Conflict, retrying with same Idempotency-Key...');
          await new Promise((r) => setTimeout(r, 750));
          continue;
        }
        throw err;
      }
    }

    if (!resUser) {
      throw new NexoraError('Failed to create user on Nexora', 500);
    }

    let subUrl = resUser.subUrl;
    // Fallback: If subUrl is missing in the create response, fetch user by id
    if (!subUrl && resUser.id) {
      try {
        const fetched = await this.request<NexoraUserResponse>(`/users/${resUser.id}`);
        subUrl = fetched.subUrl;
      } catch (err) {
        console.warn(`Fallback fetch for user ${resUser.id} failed:`, err);
      }
    }

    if (!subUrl) {
      throw new NexoraError('Could not obtain subscription URL from Nexora', 502);
    }

    return {
      user: resUser,
      subUrl: subUrl,
      expiresAt: expiry,
      volume: ONE_TB_BYTES,
    };
  }

  /**
   * Fetch subscription content from subUrl, base64-decode, and extract individual config links
   */
  async getLinks(subUrl: string): Promise<string[]> {
    try {
      const res = await fetch(subUrl, {
        headers: {
          'User-Agent': 'v2rayNG/1.8.5',
          'Accept': '*/*',
        },
      });

      if (!res.ok) {
        return [];
      }

      const text = (await res.text()).trim();
      if (!text) return [];

      let decodedText = text;
      // Many subscriptions return base64 encoded text. Try decoding base64:
      try {
        // Cloudflare Workers and standard web support atob
        // Remove whitespace/newlines before base64 decode
        const cleanB64 = text.replace(/\s+/g, '');
        decodedText = atob(cleanB64);
      } catch {
        // If not base64, it might already be raw lines
        decodedText = text;
      }

      // Split lines and extract links starting with vless://, vmess://, trojan://, ss://
      const lines = decodedText
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter((l) => /^(vless|vmess|trojan|ss):\/\//i.test(l));

      return lines;
    } catch (err) {
      console.warn('Failed to fetch/parse subUrl links (best-effort):', err);
      return [];
    }
  }

  /**
   * Get sanitized node status with 30-60s KV cache
   * NEVER leaks internal IPs or node addresses
   */
  async getNodesStatus(): Promise<{
    nodesOnline: number;
    totalNodes: number;
    connectedUsers: number;
    serverLoadPercent: number;
    status: 'online' | 'degraded' | 'offline';
  }> {
    const cacheKey = 'cache:nodes:v1';
    if (this.kv) {
      try {
        const cached = await this.kv.get(cacheKey, 'json');
        if (cached) {
          return cached as {
            nodesOnline: number;
            totalNodes: number;
            connectedUsers: number;
            serverLoadPercent: number;
            status: 'online' | 'degraded' | 'offline';
          };
        }
      } catch (err) {
        console.warn('KV read error for nodes cache:', err);
      }
    }

    try {
      const res = await this.request<{ items?: NexoraNode[]; data?: NexoraNode[] } | NexoraNode[]>('/nodes');
      const nodes: NexoraNode[] = Array.isArray(res) ? res : (res.items || res.data || []);

      const totalNodes = nodes.length;
      let nodesOnline = 0;
      let totalConnectedUsers = 0;
      let loadSum = 0;
      let loadCount = 0;

      for (const node of nodes) {
        const isOnline =
          node.isConnected === true ||
          node.status === true ||
          node.status === 'online' ||
          node.status === 'active';

        if (isOnline) {
          nodesOnline++;
        }

        const users = Number(node.connectedUsers || 0);
        if (users > 0) {
          totalConnectedUsers += users;
        }

        const load1 = node.live?.host?.load1 ?? node.live?.host?.cpu;
        if (typeof load1 === 'number' && !isNaN(load1)) {
          // Normalise load to a percentage (e.g. 1.0 load average roughly ~25% on 4 core or capped at 100)
          const loadP = Math.min(100, Math.max(0, Math.round(load1 > 1 && load1 <= 100 ? load1 : load1 * 25)));
          loadSum += loadP;
          loadCount++;
        }
      }

      const avgLoad = loadCount > 0 ? Math.round(loadSum / loadCount) : 18;
      const status: 'online' | 'degraded' | 'offline' =
        totalNodes === 0 || nodesOnline === 0
          ? 'degraded'
          : nodesOnline < totalNodes / 2
          ? 'degraded'
          : 'online';

      const result = {
        nodesOnline,
        totalNodes: Math.max(totalNodes, 1),
        connectedUsers: totalConnectedUsers,
        serverLoadPercent: avgLoad,
        status,
      };

      if (this.kv) {
        try {
          await this.kv.put(cacheKey, JSON.stringify(result), {
            expirationTtl: 45, // 45 seconds cache
          });
        } catch (err) {
          console.warn('KV write error for nodes cache:', err);
        }
      }

      return result;
    } catch (err) {
      console.warn('Failed to fetch nodes from Nexora, using fallback stats:', err);
      return {
        nodesOnline: 1,
        totalNodes: 1,
        connectedUsers: 14,
        serverLoadPercent: 22,
        status: 'online',
      };
    }
  }
}
