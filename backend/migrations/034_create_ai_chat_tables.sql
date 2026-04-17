CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id integer NOT NULL REFERENCES hasamex_users(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_chat_sessions_owner_last_idx ON ai_chat_sessions (owner_id, last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  owner_id integer NOT NULL,
  role varchar(32) NOT NULL,
  content_text text NOT NULL,
  content_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_chat_messages_role_chk CHECK (role IN ('user','assistant','system','tool'))
);

CREATE INDEX IF NOT EXISTS ai_chat_messages_session_created_idx ON ai_chat_messages (session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS ai_chat_messages_owner_created_idx ON ai_chat_messages (owner_id, created_at DESC);

