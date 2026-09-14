-- The chat thread: what the user asked, what the assistant answered, and what the model did
-- to answer it. One thread per user, forever - there is no conversation entity, so nothing
-- keys these rows but the user they belong to.
--
-- Two tables, cascading from `users`, deleted hard. Hard deletion is a deliberate deviation
-- from the soft deletion the rest of the schema uses: nothing references a message, and
-- "delete my chat" has to mean deleted.
--
-- What is stored is what the model did, not what it saw: the tool's name, its arguments, how
-- many rows came back, whether the page was cut and how long it took. Never the tool
-- response payload - it is reproducible from the arguments and it is the large part.
--
-- Idempotent: re-running changes nothing.

-- ---------------------------------------------------------------------------
-- 1. The messages of the thread
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id"           SERIAL       PRIMARY KEY,
  "user_id"      INTEGER      NOT NULL,
  -- user | assistant. A failed turn writes neither, so a question never sits answerless.
  "role"         VARCHAR      NOT NULL,
  "content"      TEXT         NOT NULL,
  -- The bike bound at the moment of the question, from the chat's picker. The frontend reads
  -- a change between consecutive turns as the divider in the thread.
  "bike_id"      INTEGER,
  -- What the turn cost, which is what a token budget is summed over.
  "total_tokens" INTEGER,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_user_id_fkey') THEN
    ALTER TABLE "chat_messages"
      ADD CONSTRAINT "chat_messages_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- A Bike can be deleted outright with everything belonging to it (ADR 0024); a message is
  -- not one of those things, so it loses the binding and keeps the text.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_bike_id_fkey') THEN
    ALTER TABLE "chat_messages"
      ADD CONSTRAINT "chat_messages_bike_id_fkey"
      FOREIGN KEY ("bike_id") REFERENCES "bikes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- The only way the thread is ever read: this user's messages, newest last.
CREATE INDEX IF NOT EXISTS "chat_messages_user_recent" ON "chat_messages" ("user_id", "created_at");

-- ---------------------------------------------------------------------------
-- 2. What the model did to answer one message
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "chat_tool_calls" (
  "id"          SERIAL       PRIMARY KEY,
  "message_id"  INTEGER      NOT NULL,
  "tool_name"   VARCHAR      NOT NULL,
  "arguments"   JSONB        NOT NULL,
  "row_count"   INTEGER,
  "truncated"   BOOLEAN      NOT NULL DEFAULT false,
  "duration_ms" INTEGER,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_tool_calls_message_id_fkey') THEN
    ALTER TABLE "chat_tool_calls"
      ADD CONSTRAINT "chat_tool_calls_message_id_fkey"
      FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "chat_tool_calls_message" ON "chat_tool_calls" ("message_id");
