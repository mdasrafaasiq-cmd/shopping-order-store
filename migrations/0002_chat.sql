CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  sender TEXT NOT NULL CHECK(sender IN ('customer','admin')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_session_id ON chat_messages(session_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at);
