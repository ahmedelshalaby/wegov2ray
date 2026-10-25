import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NexoraClient, TEMPLATE_MAP, ONE_TB_BYTES } from '../worker/nexora';
import { Env } from '../worker/types';

describe('NexoraClient', () => {
  let mockEnv: Env;
  let mockKvStorage: Record<string, string>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockKvStorage = {};

    mockEnv = {
      NEXORA_API_URL: 'https://test-nexora.example/api/v1',
      NEXORA_TOKEN: 'mock_bearer_token',
      LICENSE_CAP: 25,
      RESERVED_SLOTS: 3,
      USER_IP_LIMIT: 5,
      KV: {
        get: vi.fn(async (key: string, type?: string) => {
          const val = mockKvStorage[key];
          if (!val) return null;
          return type === 'json' ? JSON.parse(val) : val;
        }),
        put: vi.fn(async (key: string, val: string) => {
          mockKvStorage[key] = val;
        }),
        delete: vi.fn(async (key: string) => {
          delete mockKvStorage[key];
        }),
      } as unknown as KVNamespace,
    };
  });

  it('correctly maps all 4 supported protocols in TEMPLATE_MAP', () => {
    expect(TEMPLATE_MAP['vless-reality']).toBe('VLESS TCP REALITY');
    expect(TEMPLATE_MAP['vless-ws']).toBe('VLESS WS');
    expect(TEMPLATE_MAP['vmess-ws-tls']).toBe('VMess WS TLS');
    expect(TEMPLATE_MAP['vmess-tcp']).toBe('VMess TCP');
  });

  it('lists and caches templates in KV', async () => {
    const mockTemplates = [
      { id: 1, name: 'VLESS TCP REALITY', otherField: 'secret' },
      { id: 2, name: 'VLESS WS' },
      { id: 3, name: 'VMess WS TLS' },
      { id: 4, name: 'VMess TCP' },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: mockTemplates }),
    } as Response);

    const client = new NexoraClient(mockEnv);
    const templates = await client.listTemplates();

    expect(templates).toHaveLength(4);
    expect(templates[0]).toEqual({ id: 1, name: 'VLESS TCP REALITY' });

    // Verify it called KV put to cache
    expect(mockEnv.KV.put).toHaveBeenCalledWith(
      'cache:templates:v1',
      expect.stringContaining('VLESS TCP REALITY'),
      expect.objectContaining({ expirationTtl: 600 })
    );

    // Call again -> should read from KV without calling fetch
    globalThis.fetch = vi.fn();
    const cachedTemplates = await client.listTemplates();
    expect(cachedTemplates).toHaveLength(4);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('resolves correct template id for vless-reality', async () => {
    const mockTemplates = [
      { id: 101, name: 'VLESS TCP REALITY' },
      { id: 102, name: 'VLESS WS' },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: mockTemplates }),
    } as Response);

    const client = new NexoraClient(mockEnv);
    const templateId = await client.resolveTemplateId('vless-reality');
    expect(templateId).toBe(101);
  });

  it('calculates available slots accurately: LICENSE_CAP - total - RESERVED_SLOTS', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ total: 18 }),
    } as Response);

    const client = new NexoraClient(mockEnv);
    // 25 - 18 - 3 = 4
    const slots = await client.getSlotsLeft();
    expect(slots.totalUsers).toBe(18);
    expect(slots.slotsLeft).toBe(4);
    expect(slots.licenseCap).toBe(25);
  });

  it('creates a user with correct payload and 1TB volume', async () => {
    let capturedBody: any = null;
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/templates')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: [{ id: 42, name: 'VLESS WS' }] }),
        };
      }
      if (url.includes('/users')) {
        capturedBody = JSON.parse((init?.body as string) || '{}');
        capturedHeaders = (init?.headers as Record<string, string>) || {};
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 999,
            name: capturedBody?.name,
            subUrl: 'https://ahmedmedo.bond:2053/sub/abcdef123456',
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    const client = new NexoraClient(mockEnv);
    const result = await client.createUser('vless-ws', 86400);

    expect(capturedBody).not.toBeNull();
    expect(capturedBody?.group).toBe('wegov2ray-free');
    expect(capturedBody?.volume).toBe(ONE_TB_BYTES);
    expect(capturedBody?.templateIds).toEqual([42]);
    expect(capturedBody?.allTemplates).toBe(false);
    expect(capturedBody?.ipLimit).toBe(5);
    expect(capturedHeaders['Idempotency-Key']).toBeDefined();

    expect(result.subUrl).toBe('https://ahmedmedo.bond:2053/sub/abcdef123456');
    expect(result.volume).toBe(ONE_TB_BYTES);
  });

  it('correctly decodes base64 subscription links in getLinks', async () => {
    const rawLinks = 'vless://uuid@node1.com:443?security=reality#Node1\nvmess://uuid@node2.com:443?type=ws#Node2';
    const base64Data = btoa(rawLinks);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => base64Data,
    } as Response);

    const client = new NexoraClient(mockEnv);
    const links = await client.getLinks('https://ahmedmedo.bond:2053/sub/test');

    expect(links).toHaveLength(2);
    expect(links[0]).toContain('vless://');
    expect(links[1]).toContain('vmess://');
  });

  it('triggers cleanup of expired accounts with group=wegov2ray-free', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({ count: 5 }),
      };
    });

    const client = new NexoraClient(mockEnv);
    const result = await client.cleanup();

    expect(capturedUrl).toContain('/users/bulk/delete?group=wegov2ray-free&status=expired,limited');
    expect(result.deletedCount).toBe(5);
  });
});
