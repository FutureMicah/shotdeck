CREATE TABLE public.screenshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled screenshot',
  storage_path TEXT NOT NULL UNIQUE,
  width INTEGER,
  height INTEGER,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.screenshots TO authenticated;
GRANT ALL ON public.screenshots TO service_role;

ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own screenshots" ON public.screenshots
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own screenshots" ON public.screenshots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own screenshots" ON public.screenshots
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own screenshots" ON public.screenshots
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX screenshots_user_created_idx ON public.screenshots (user_id, created_at DESC);

CREATE POLICY "Users read own screenshot files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own screenshot files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own screenshot files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);