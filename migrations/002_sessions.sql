-- 002 : sessions stockées en base (révocables), à la place des tokens signés sans état.
-- On ne stocke que l'empreinte SHA-256 du token : une fuite de la table ne permet pas d'usurper une session.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client TEXT NOT NULL DEFAULT 'web' CHECK (client IN ('web', 'mobile')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
