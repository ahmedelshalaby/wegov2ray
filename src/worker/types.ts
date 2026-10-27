export interface Env {
  KV: KVNamespace;
  DB?: D1Database;
  ASSETS?: Fetcher;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  SUPPORT_URL?: string;
  ADS_ENABLED?: string | boolean;
  XUI_BASE_URL?: string;
  XUI_PUBLIC_HOST?: string;
  XUI_API_TOKEN?: string;
  XUI_INBOUND_MAP?: string;
  ADMIN_EMAIL?: string;
  SESSION_SECRET?: string;
  MAIL_API_KEY?: string;
  MAIL_FROM?: string;
  AUTH_ORIGIN?: string;
  LOCAL_TEST_MODE?: string | boolean;
  LOCAL_TEST_GLOBAL_RATE_LIMIT?: string | number;
  LOCAL_TEST_AUTH_RATE_LIMIT?: string | number;
  LOCAL_TEST_MAX_ACCOUNTS_PER_DAY?: string | number;
  LOCAL_TEST_MAX_ACTIVE_ACCOUNTS_PER_USER?: string | number;
  MAX_ACCOUNTS_PER_DAY?: string | number;
  MAX_ACTIVE_ACCOUNTS_PER_USER?: string | number;
  ACCOUNT_EXPIRY_DAYS?: string | number;
  ACCOUNT_TRAFFIC_GB?: string | number;
  REQUIRE_TURNSTILE?: string | boolean;
}

export type SupportedProtocol = 'vless-reality' | 'vless-ws' | 'vmess-ws-tls' | 'trojan-tls' | 'shadowsocks' | 'vless-grpc-tls' | 'vless-httpupgrade-tls';
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  retryAfter?: number;
}

export interface StatusResponse {
  success: true;
  status: 'online' | 'degraded' | 'offline';
  tcpCount: number | null;
  xrayState: string;
  serverLoadPercent: number | null;
}

