import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { handleApi } from './src/worker/index';
import { Env } from './src/worker/types';

function loadDevVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  const devVarsPath = path.resolve(__dirname, '.dev.vars');
  if (fs.existsSync(devVarsPath)) {
    const content = fs.readFileSync(devVarsPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          vars[key] = val;
        }
      }
    }
  }
  return vars;
}

function createMemoryKv(): KVNamespace {
  const store = new Map<string, { val: string; expires?: number }>();
  return {
    async get(key: string, type?: string) {
      const item = store.get(key);
      if (!item) return null;
      if (item.expires && item.expires < Date.now()) {
        store.delete(key);
        return null;
      }
      return type === 'json' ? JSON.parse(item.val) : item.val;
    },
    async put(key: string, val: string, opts?: { expirationTtl?: number }) {
      const expires = opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : undefined;
      store.set(key, { val, expires });
    },
    async delete(key: string) {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

function workerDevMiddleware(): Plugin {
  const memoryKv = createMemoryKv();

  return {
    name: 'worker-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        try {
          const devVars = loadDevVars();
          const env: Env = {
            KV: memoryKv,
            XUI_BASE_URL: devVars.XUI_BASE_URL || process.env.XUI_BASE_URL || '',
            XUI_API_TOKEN: devVars.XUI_API_TOKEN || process.env.XUI_API_TOKEN || '',
            XUI_PUBLIC_HOST: devVars.XUI_PUBLIC_HOST || process.env.XUI_PUBLIC_HOST || '',
            XUI_INBOUND_MAP: devVars.XUI_INBOUND_MAP || process.env.XUI_INBOUND_MAP || '',
            LOCAL_TEST_MODE: devVars.LOCAL_TEST_MODE || process.env.LOCAL_TEST_MODE || 'false',
            SESSION_SECRET: devVars.SESSION_SECRET || process.env.SESSION_SECRET || 'local-development-only',
            TURNSTILE_SECRET: devVars.TURNSTILE_SECRET || process.env.TURNSTILE_SECRET || '',
            TURNSTILE_SITE_KEY: devVars.TURNSTILE_SITE_KEY || process.env.TURNSTILE_SITE_KEY || '',
            SUPPORT_URL: devVars.SUPPORT_URL || process.env.SUPPORT_URL || 'https://t.me/wegov2ray',
            MAX_ACCOUNTS_PER_DAY: devVars.MAX_ACCOUNTS_PER_DAY || '1',
            MAX_ACTIVE_ACCOUNTS_PER_USER: devVars.MAX_ACTIVE_ACCOUNTS_PER_USER || '3',
            ACCOUNT_EXPIRY_DAYS: devVars.ACCOUNT_EXPIRY_DAYS || '7',
            ACCOUNT_TRAFFIC_GB: devVars.ACCOUNT_TRAFFIC_GB || '0',
            REQUIRE_TURNSTILE: devVars.REQUIRE_TURNSTILE || 'false',
            ADMIN_EMAIL: devVars.ADMIN_EMAIL || process.env.ADMIN_EMAIL || '',
            MAIL_API_KEY: devVars.MAIL_API_KEY || process.env.MAIL_API_KEY || '',
            MAIL_FROM: devVars.MAIL_FROM || process.env.MAIL_FROM || '',
            AUTH_ORIGIN: devVars.AUTH_ORIGIN || process.env.AUTH_ORIGIN || '',
            ADS_ENABLED: devVars.ADS_ENABLED || 'false',
          };

          const protocol = req.headers['x-forwarded-proto'] || 'http';
          const host = req.headers.host || 'localhost:3000';
          const fullUrl = new URL(req.url, `${protocol}://${host}`);

          let bodyBuffer: Buffer | undefined;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            bodyBuffer = Buffer.concat(chunks);
          }

          const webHeaders = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (v) {
              if (Array.isArray(v)) {
                v.forEach((val) => webHeaders.append(k, val));
              } else {
                webHeaders.set(k, v);
              }
            }
          }

          const webRequest = new Request(fullUrl.toString(), {
            method: req.method,
            headers: webHeaders,
            body: bodyBuffer && bodyBuffer.length > 0 ? bodyBuffer : undefined,
          });

          const webResponse = await handleApi(webRequest, env);

          res.statusCode = webResponse.status;
          webResponse.headers.forEach((val, key) => {
            res.setHeader(key, val);
          });

          const resBuffer = await webResponse.arrayBuffer();
          res.end(Buffer.from(resBuffer));
        } catch (err: any) {
          console.error('[Worker Dev Middleware Error]:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              success: false,
              error: err?.message || 'Internal dev server error',
              error_ar: 'حدث خطأ في الخادم المحلي: ' + (err?.message || ''),
            })
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), workerDevMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
});
