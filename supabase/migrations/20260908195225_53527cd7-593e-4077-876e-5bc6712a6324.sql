REVOKE ALL ON FUNCTION public.ensure_my_role() FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;