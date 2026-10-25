export interface Env {
  KV: KVNamespace;
  ASSETS?: Fetcher;
  NEXORA_API_URL: string;
  NEXORA_TOKEN: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  SUPPORT_URL?: string;
  LICENSE_CAP?: string | number;
  RESERVED_SLOTS?: string | number;
  MAX_PER_IP_PER_DAY?: string | number;
  USER_IP_LIMIT?: string | number;
  ADS_ENABLED?: string | boolean;
}

export type SupportedProtocol = 'vless-reality' | 'vless-ws' | 'vmess-ws-tls' | 'vmess-tcp';
export type SupportedDuration = 86400 | 345600 | 604800; // 24h, 4d, 7d in seconds

export interface GenerateRequestBody {
  protocol: SupportedProtocol;
  duration: SupportedDuration;
  turnstileToken?: string;
}

export interface GenerateSuccessResponse {
  success: true;
  subUrl: string;
  links: string[];
  expiresAt: number; // Unix timestamp in seconds
  volume: number; // Bytes (1TB = 1099511627776)
  protocol: SupportedProtocol;
  duration: SupportedDuration;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  retryAfter?: number;
}

export interface StatusResponse {
  success: true;
  status: 'online' | 'degraded' | 'offline';
  nodesOnline: number;
  totalNodes: number;
  connectedUsers: number;
  serverLoadPercent: number; // 0 - 100
  capacityState: 'available' | 'high_demand' | 'full';
  availablePercent: number; // percentage of free slots
}

export interface NexoraTemplate {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface NexoraCreateUserPayload {
  name: string;
  group: string;
  desc: string;
  volume: number;
  expiry: number;
  templateIds: number[];
  allTemplates: boolean;
  ipLimit: number;
}

export interface NexoraUserResponse {
  id: number | string;
  name: string;
  subUrl?: string;
  expiry?: number;
  volume?: number;
  [key: string]: unknown;
}

export interface NexoraNode {
  id: number | string;
  name?: string;
  status?: string | boolean;
  isConnected?: boolean;
  connectedUsers?: number;
  live?: {
    host?: {
      load1?: number;
      cpu?: number;
      mem?: number;
    };
  };
  [key: string]: unknown;
}
