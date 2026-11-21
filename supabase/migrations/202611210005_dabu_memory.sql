-- Persistent, per-user DABU conversation history and memory.
CREATE TABLE IF NOT EXISTS public.dabu_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Percakapan DABU',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id,user_id)
);

CREATE TABLE IF NOT EXISTS public.dabu_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dabu_messages_conversation_owner_fk
    FOREIGN KEY (conversation_id,user_id)
    REFERENCES public.dabu_conversations(id,user_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.dabu_user_memory (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_summary text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dabu_user_memory_length_check CHECK (char_length(memory_summary) <= 12000)
);

ALTER TABLE public.dabu_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dabu_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dabu_user_memory ENABLE ROW LEVEL SECURITY;

GRANT SELECT,INSERT,UPDATE,DELETE ON public.dabu_conversations TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.dabu_messages TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.dabu_user_memory TO authenticated;

CREATE POLICY dabu_conversations_owner_access ON public.dabu_conversations
FOR ALL TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY dabu_messages_owner_read ON public.dabu_messages
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));
CREATE POLICY dabu_messages_owner_insert ON public.dabu_messages
FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY dabu_messages_owner_delete ON public.dabu_messages
FOR DELETE TO authenticated
USING (user_id = (select auth.uid()));

CREATE POLICY dabu_user_memory_owner_access ON public.dabu_user_memory
FOR ALL TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

CREATE INDEX IF NOT EXISTS idx_dabu_conversations_user_last_message
ON public.dabu_conversations(user_id,last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_dabu_messages_conversation_created
ON public.dabu_messages(conversation_id,created_at);
