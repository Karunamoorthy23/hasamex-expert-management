CREATE INDEX IF NOT EXISTS ai_chat_messages_fts_idx
ON ai_chat_messages
USING GIN (to_tsvector('english', content_text));

