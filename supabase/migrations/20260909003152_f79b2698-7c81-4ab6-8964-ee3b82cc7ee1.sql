CREATE TABLE public.ingestion_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  token_prefix TEXT NOT NULL CHECK (char_length(token_prefix) BETWEEN 8 AND 24),
  token_hash TEXT NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.ingestion_tokens TO authenticated;
GRANT ALL ON public.ingestion_tokens TO service_role;

ALTER TABLE public.ingestion_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read own ingestion tokens" ON public.ingestion_tokens
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins revoke own ingestion tokens" ON public.ingestion_tokens
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE INDEX ingestion_tokens_owner_created_idx
  ON public.ingestion_tokens (owner_id, created_at DESC);
CREATE INDEX ingestion_tokens_active_hash_idx
  ON public.ingestion_tokens (token_hash)
  WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_ingestion_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_ingestion_tokens_updated_at
BEFORE UPDATE ON public.ingestion_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_ingestion_tokens_updated_at();