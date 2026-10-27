CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  verified_at INTEGER,
  restricted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS email_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose TEXT NOT NULL CHECK (purpose IN ('verify','reset')), expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS email_tokens_user_purpose ON email_tokens(user_id,purpose);
CREATE TABLE IF NOT EXISTS auth_rate_limits (bucket_key TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS auth_rate_limits_reset ON auth_rate_limits(reset_at);
CREATE TABLE IF NOT EXISTS vpn_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inbound_id INTEGER NOT NULL,
  protocol TEXT NOT NULL,
  client_email TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  connection_config TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','disabled','expired','missing','error')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  traffic_limit_bytes INTEGER NOT NULL DEFAULT 0,
  traffic_used_bytes INTEGER,
  idempotency_key TEXT NOT NULL UNIQUE,
  last_synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS vpn_accounts_owner ON vpn_accounts(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS vpn_accounts_expiry ON vpn_accounts(expires_at);
CREATE TABLE IF NOT EXISTS account_reservations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, day TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS account_reservations_owner_day ON account_reservations(user_id,day);
CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS inbound_mappings (protocol TEXT PRIMARY KEY, inbound_id INTEGER NOT NULL CHECK (inbound_id >= 3), enabled INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS integration_events (id TEXT PRIMARY KEY, action TEXT NOT NULL, error_code TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS integration_events_created ON integration_events(created_at DESC);
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL, action TEXT NOT NULL, target_id TEXT, metadata_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS audit_log_created ON audit_log(created_at DESC);
