import { describe, expect, it, vi, afterEach } from 'vitest';
import { Env } from '../worker/types';
import { handleAuthApi, hashPassword, verifyPassword } from '../worker/auth';

afterEach(()=>vi.unstubAllGlobals());
describe('website authentication',()=>{
  it('stores a salted PBKDF2 password hash, never the original password',async()=>{
    const password='correct horse battery staple';
    const hash=await hashPassword(password);
    expect(hash).toMatch(/^pbkdf2-sha256\$310000\$/);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password,hash)).toBe(true);
    expect(await verifyPassword('wrong password',hash)).toBe(false);
  });

  it('sends a secure HttpOnly session cookie only after password verification',async()=>{
    const password='correct horse battery staple';
    const password_hash=await hashPassword(password);
    const statements:Array<{sql:string;values:unknown[]}> = [];
    const db={prepare(sql:string){const values:unknown[]=[];const stmt:any={bind(...args:unknown[]){values.push(...args);return stmt;},async first(){if(sql.includes('auth_rate_limits'))return {hits:1};if(sql.includes('FROM users WHERE email=?'))return {id:'user-1',email:'user@example.com',password_hash,verified_at:1,restricted:0};return null;},async run(){statements.push({sql,values:[...values]});return {meta:{changes:1}};},async all(){return {results:[]};}};return stmt;},async batch(){return [] as any[];}} as unknown as D1Database;
    const env={DB:db,KV:{} as KVNamespace} as Env;
    const request=new Request('https://site.example/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'user@example.com',password})});
    const response=await handleAuthApi(request,env);
    expect(response?.status).toBe(200);
    const cookie=response?.headers.get('Set-Cookie')||'';
    expect(cookie).toContain('HttpOnly');expect(cookie).toContain('Secure');expect(cookie).toContain('SameSite=Lax');
    expect(await response?.json()).toMatchObject({success:true,user:{email:'user@example.com'}});
    expect(statements.some((entry)=>entry.sql.includes('INSERT INTO sessions'))).toBe(true);
  });

  it('rejects an incorrect password with a generic authentication error',async()=>{
    const password_hash=await hashPassword('the correct password');
    const db={prepare(sql:string){const stmt:any={bind(){return stmt;},async first(){if(sql.includes('auth_rate_limits'))return {hits:1};if(sql.includes('FROM users WHERE email=?'))return {id:'user-1',email:'user@example.com',password_hash,verified_at:1,restricted:0};return null;},async run(){return {meta:{changes:0}};},async all(){return {results:[]};}};return stmt;},async batch(){return [] as any[];}} as unknown as D1Database;
    const response=await handleAuthApi(new Request('https://site.example/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'user@example.com',password:'wrong password'})}),{DB:db,KV:{} as KVNamespace} as Env);
    expect(response?.status).toBe(401);
    expect(await response?.json()).toMatchObject({success:false,error:'Email or password is incorrect.'});
  });
});
