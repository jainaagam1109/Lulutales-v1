REVOKE EXECUTE ON FUNCTION public.set_active_profile(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.soft_delete_profile(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_active_profile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.soft_delete_profile(uuid) TO authenticated, service_role;