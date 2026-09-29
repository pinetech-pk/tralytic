-- ============================================================
-- Migration: 006_profiles_admin_read
-- Description: Allow admins to read all profiles.
--
-- The base schema restricted profiles SELECT to `auth.uid() = id`.
-- The RBAC migration (002) granted admins an OR-bypass on user_roles
-- and subscriptions but never on profiles, so the admin user list
-- silently returned only the admin's own row (RLS filters rows rather
-- than raising an error), and the user count read as 1.
--
-- public.user_is_admin() is SECURITY DEFINER and reads only
-- user_roles/roles, so calling it here cannot recurse into this policy.
-- ============================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;

CREATE POLICY "Users can view own profile or admins view all" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR
        public.user_is_admin(auth.uid())
    );
