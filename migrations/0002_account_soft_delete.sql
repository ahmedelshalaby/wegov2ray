ALTER TABLE vpn_accounts ADD COLUMN deleted_at INTEGER;
CREATE INDEX IF NOT EXISTS vpn_accounts_visible_owner ON vpn_accounts(user_id, deleted_at, created_at DESC);
