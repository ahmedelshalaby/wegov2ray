import { afterEach, describe, expect, it, vi } from 'vitest';
import { Env } from '../worker/types';
import { parseInboundMap, XuiClient, XuiError } from '../worker/xui';

const protocolMap = { 'vless-reality':3, 'vless-ws':4, 'vmess-ws-tls':5, 'trojan-tls':6, shadowsocks:7, 'vless-grpc-tls':8, 'vless-httpupgrade-tls':9 };
const openApi = { info:{version:'3.x'}, paths:{ '/panel/api/inbounds/list':{get:{}}, '/panel/api/clients/list':{get:{}}, '/panel/api/clients/add':{post:{}}, '/panel/api/clients/del/{email}':{post:{}}, '/panel/api/server/status':{get:{}} } };
function inbound(id:number, protocol:string, network:string, security:string, overrides:Record<string,unknown>={}) { return { id, enable:true, protocol, port:443, remark:`in-${id}`, settings:{method:'chacha20-ietf-poly1305',clients:[]}, streamSettings:{network,security,...overrides} }; }
function env(extra:Partial<Env>={}):Env { return { KV:{} as KVNamespace, XUI_BASE_URL:'https://panel.example/base', XUI_API_TOKEN:'server-secret-token', XUI_PUBLIC_HOST:'vpn.example', XUI_INBOUND_MAP:JSON.stringify(protocolMap), ...extra }; }
function json(data:unknown,status=200) { return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}); }
afterEach(()=>vi.unstubAllGlobals());

describe('XuiClient',()=>{
  it('accepts only website protocol mappings and never personal inbound IDs',()=>{
    expect(parseInboundMap(JSON.stringify(protocolMap))['vless-reality']).toBe(3);
    expect(()=>parseInboundMap('{"vless-reality":1}')).toThrow(XuiError);
    expect(()=>parseInboundMap('{"http":3}')).toThrow(XuiError);
  });

  it('uses HTTPS Bearer authentication and exposes only matching configured inbounds',async()=>{
    const calls:Array<{url:string;authorization:string|null}> = [];
    vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=String(input); calls.push({url,authorization:new Headers(init?.headers).get('Authorization')});
      if(url.endsWith('/panel/api/openapi.json'))return json(openApi);
      if(url.endsWith('/panel/api/inbounds/list'))return json({success:true,obj:[
        inbound(1,'vless','tcp','reality'),inbound(3,'vless','tcp','reality',{realitySettings:{publicKey:'public',serverNames:['www.example.com']}}),
        inbound(4,'vless','ws','tls',{wsSettings:{path:'/ws'}}),inbound(5,'vmess','ws','tls'),inbound(6,'trojan','tcp','tls'),
        inbound(7,'shadowsocks','tcp','none'),inbound(8,'vless','grpc','tls'),inbound(9,'vless','httpupgrade','tls'),
      ]});
      return json({success:false},404);
    }));
    const result=await new XuiClient(env()).getEnabledOptions();
    expect(result.map((item)=>item.protocol)).toEqual(Object.keys(protocolMap));
    expect(result.some((item)=>item.inboundId<3)).toBe(false);
    expect(calls.every((call)=>call.url.startsWith('https://panel.example/base/'))).toBe(true);
    expect(calls.every((call)=>call.authorization==='Bearer server-secret-token')).toBe(true);
  });

  it('does not create a client when the public host is not configured',async()=>{
    const calls:string[]=[];
    vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
      const url=String(input);calls.push(url);
      if(url.endsWith('/panel/api/openapi.json'))return json(openApi);
      if(url.endsWith('/panel/api/inbounds/list'))return json({success:true,obj:[inbound(3,'vless','tcp','reality',{realitySettings:{publicKey:'public',serverNames:['www.example.com']}})]});
      return json({success:true});
    }));
    const client=new XuiClient(env({XUI_PUBLIC_HOST:''}));
    await expect(client.createClient({protocol:'vless-reality',accountId:crypto.randomUUID(),expiresAt:1900000000,trafficLimitBytes:0})).rejects.toThrow('XUI_PUBLIC_HOST');
    expect(calls.filter((url)=>url.includes('/clients/add'))).toHaveLength(0);
  });

  it('creates through the endpoint exposed by the panel OpenAPI document',async()=>{
    const calls:Array<{url:string;body:string}> = [];
    let added=false;
    vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=String(input);const body=typeof init?.body==='string'?init.body:'';calls.push({url,body});
      if(url.endsWith('/panel/api/openapi.json'))return json(openApi);
      if(url.endsWith('/panel/api/inbounds/list')){const item=inbound(3,'vless','tcp','reality',{realitySettings:{publicKey:'pub-key',serverNames:['www.example.com'],shortIds:['a1']}});return json({success:true,obj:[{...item,settings:{...item.settings,clients:added?[JSON.parse(calls.find(c=>c.url.endsWith('/clients/add'))!.body).client]:[]}}]});}
      if(url.endsWith('/panel/api/clients/add')){added=true;return json({success:true,msg:'Client added'});}
      return json({success:true});
    }));
    const result=await new XuiClient(env({XUI_INBOUND_MAP:JSON.stringify({'vless-reality':3})})).createClient({protocol:'vless-reality',accountId:crypto.randomUUID(),expiresAt:1900000000,trafficLimitBytes:2*(1024**3)});
    expect(result.config).toContain('vless://');
    const post=calls.find((call)=>call.url.endsWith('/panel/api/clients/add'))!;
    expect(JSON.parse(post.body).inboundIds).toEqual([3]);
    expect(JSON.parse(post.body).client.totalGB).toBe(2);
    expect(JSON.parse(post.body).client.id).toBeTruthy();
    expect(post.body).not.toContain('server-secret-token');
  });

  it('hides impossible CPU percentages instead of rendering huge values', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/panel/api/openapi.json')) return json(openApi);
      return json({ success: true, obj: { cpu: 52206764240765, tcpCount: 4, xray: { state: 'running' } } });
    }));
    const health = await new XuiClient(env()).getHealth();
    expect(health.cpuPercent).toBeNull();
    expect(health.tcpCount).toBe(4);
    expect(health.xrayState).toBe('running');
  });
  it('reads Reality public client fields from the nested 3x-ui settings object', async () => {
    let createdClient: Record<string, unknown> | null = null;
    const realityInbound = inbound(3, 'vless', 'tcp', 'reality', {
      realitySettings: {
        privateKey: 'server-private-key-must-not-leak',
        serverNames: ['reality.example.com'],
        shortIds: ['a1b2c3'],
        settings: { publicKey: 'reality-public-key', serverName: 'client-sni.example.com', fingerprint: 'firefox', spiderX: '/probe' },
      },
    });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/panel/api/openapi.json')) return json(openApi);
      if (url.endsWith('/panel/api/inbounds/list')) {
        return json({ success: true, obj: [{ ...realityInbound, settings: { ...realityInbound.settings, clients: createdClient ? [createdClient] : [] } }] });
      }
      if (url.endsWith('/panel/api/clients/add')) {
        const body = JSON.parse(String(init?.body));
        createdClient = body.client;
        return json({ success: true });
      }
      return json({ success: false }, 404);
    }));
    const result = await new XuiClient(env({ XUI_INBOUND_MAP: JSON.stringify({ 'vless-reality': 3 }) })).createClient({
      protocol: 'vless-reality', accountId: crypto.randomUUID(), expiresAt: 1900000000, trafficLimitBytes: 0,
    });
    const link = new URL(result.config);
    expect(link.searchParams.get('pbk')).toBe('reality-public-key');
    expect(link.searchParams.get('sni')).toBe('reality.example.com');
    expect(link.searchParams.get('fp')).toBe('firefox');
    expect(link.searchParams.get('spx')).toBe('/probe');
    expect(link.searchParams.get('flow')).toBe('xtls-rprx-vision');
    expect(result.config).not.toContain('server-private-key-must-not-leak');
  });
  it('rejects HTTP panel URLs before making requests',()=>{
    expect(()=>new XuiClient(env({XUI_BASE_URL:'http://panel.example'}))).toThrow('HTTPS');
  });
});
