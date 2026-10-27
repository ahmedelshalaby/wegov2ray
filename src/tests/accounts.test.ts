import { afterEach, describe, expect, it, vi } from 'vitest';
import { Env } from '../worker/types';
import { handleAccountApi } from '../worker/accounts';

function dbForUser(userId:string){
  return {
    prepare(sql:string){
      return { bind(){return this;}, async first(){
        if(sql.includes('FROM sessions s JOIN users u')) return {id:userId,email:'owner@example.com',role:'user',verified_at:1,restricted:0,created_at:1};
        if(sql.includes('FROM vpn_accounts WHERE id=? AND user_id=?')) return null;
        return null;
      }, async all(){return {results:[]};}, async run(){return {meta:{changes:0}};} };
    }, async batch(){return [] as any[];},
  } as unknown as D1Database;
}
function testEnv(db:D1Database):Env{return {DB:db,KV:{} as KVNamespace,XUI_BASE_URL:'https://panel.example',XUI_API_TOKEN:'test-panel-token',XUI_PUBLIC_HOST:'vpn.example'};}const deletionSpec = { info: { version: '3.x' }, paths: { '/panel/api/openapi.json': { get: {} }, '/panel/api/clients/list': { get: {} }, '/panel/api/clients/del/{email}': { post: {} } } };
const deletionAccount = { id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', inbound_id:3, client_email:'wgv-test-account', client_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', status:'active' };
function dbForDeletion(account:typeof deletionAccount){
  const writes:Array<{sql:string;values:unknown[]}> = [];
  const db={prepare(sql:string){const values:unknown[]=[];const stmt:any={bind(...args:unknown[]){values.push(...args);return stmt;},async first(){if(sql.includes('FROM sessions s JOIN users u'))return {id:'user-1',email:'owner@example.com',role:'user',verified_at:1,restricted:0,created_at:1};if(sql.includes('FROM vpn_accounts WHERE id=? AND user_id=?'))return account;return null;},async all(){return {results:[]};},async run(){writes.push({sql,values:[...values]});return {meta:{changes:1}};}};return stmt;},async batch(){return [] as any[];}};
  return {db:db as unknown as D1Database,writes};
}

afterEach(()=>vi.unstubAllGlobals());
describe('website account authorization',()=>{
  it('does not let a signed-in user delete another user account by changing the id',async()=>{
    const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    const request=new Request('https://site.example/api/accounts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',{method:'DELETE',headers:{Cookie:'wegov_session=session-value'}});
    const response=await handleAccountApi(request,testEnv(dbForUser('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')));
    expect(response?.status).toBe(404);
    expect(await response?.json()).toMatchObject({success:false,error:'Account not found.'});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cleans an owned website record when its panel client is already missing', async () => {
    const { db, writes } = dbForDeletion(deletionAccount);
    const calls:string[]=[];
    vi.stubGlobal('fetch', vi.fn(async (input:RequestInfo|URL) => {
      const url=String(input); calls.push(url);
      if(url.endsWith('/panel/api/openapi.json')) return new Response(JSON.stringify(deletionSpec),{status:200});
      if(url.endsWith('/panel/api/clients/list')) return new Response(JSON.stringify({success:true,obj:[]}),{status:200});
      return new Response(JSON.stringify({success:false}),{status:404});
    }));
    const request=new Request(`https://site.example/api/accounts/${deletionAccount.id}`,{method:'DELETE',headers:{Cookie:'wegov_session=session-value'}});
    const response=await handleAccountApi(request,testEnv(db));
    expect(response?.status).toBe(200);
    expect(await response?.json()).toMatchObject({success:true,alreadyMissing:true});
    expect(calls.some((url)=>url.includes('/clients/del/'))).toBe(false);
    expect(writes.some((write)=>write.sql.includes('deleted_at=?'))).toBe(true);
  });

  it('keeps the website record when the panel rejects deletion and still lists the client', async () => {
    const { db, writes } = dbForDeletion(deletionAccount);
    vi.stubGlobal('fetch', vi.fn(async (input:RequestInfo|URL) => {
      const url=String(input);
      if(url.endsWith('/panel/api/openapi.json')) return new Response(JSON.stringify(deletionSpec),{status:200});
      if(url.endsWith('/panel/api/clients/list')) return new Response(JSON.stringify({success:true,obj:[{email:deletionAccount.client_email,enable:true}]}),{status:200});
      if(url.includes('/panel/api/clients/del/')) return new Response(JSON.stringify({success:false}),{status:200});
      return new Response(JSON.stringify({success:false}),{status:404});
    }));
    const request=new Request(`https://site.example/api/accounts/${deletionAccount.id}`,{method:'DELETE',headers:{Cookie:'wegov_session=session-value'}});
    const response=await handleAccountApi(request,testEnv(db));
    expect(response?.status).toBe(502);
    expect(await response?.json()).toMatchObject({success:false,error:'Account deletion could not be confirmed.'});
    expect(writes.some((write)=>write.sql.includes('deleted_at=?'))).toBe(false);
  });
  it('requires an authenticated, verified session before reaching account operations',async()=>{
    const request=new Request('https://site.example/api/accounts',{method:'GET'});
    const response=await handleAccountApi(request,testEnv(dbForUser('user-1')));
    expect(response?.status).toBe(401);
  });
});
