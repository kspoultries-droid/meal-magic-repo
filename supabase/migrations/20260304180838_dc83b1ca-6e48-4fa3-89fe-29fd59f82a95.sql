
-- 1. Create app_owner constant table (immutable owner record)
CREATE TABLE IF NOT EXISTS public.app_owner (
  user_id uuid NOT NULL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert the permanent owner
INSERT INTO public.app_owner (user_id) VALUES ('52634431-32e8-4bd7-b171-d92c2add25ff')
ON CONFLICT DO NOTHING;

-- RLS: nobody can modify this table via client
ALTER TABLE public.app_owner ENABLE ROW LEVEL SECURITY;

-- Only the owner themselves can read it
CREATE POLICY "Anyone can read app_owner" ON public.app_owner FOR SELECT USING (true);
-- No insert/update/delete policies = nobody can change it via client API

-- 2. Create trigger to PREVENT deleting/updating the primary admin role
CREATE OR REPLACE FUNCTION public.protect_primary_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Block DELETE of admin role for the app owner
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' AND OLD.user_id IN (SELECT user_id FROM public.app_owner) THEN
      RAISE EXCEPTION 'Cannot remove admin role from the app owner. This action is permanently blocked.';
    END IF;
    RETURN OLD;
  END IF;
  
  -- Block UPDATE that would change the admin role of the app owner
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'admin' AND OLD.user_id IN (SELECT user_id FROM public.app_owner) THEN
      RAISE EXCEPTION 'Cannot modify admin role of the app owner. This action is permanently blocked.';
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER protect_primary_admin_trigger
  BEFORE DELETE OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_primary_admin();

-- 3. Prevent deleting the app owner's profile
CREATE OR REPLACE FUNCTION public.protect_owner_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.id IN (SELECT user_id FROM public.app_owner) THEN
    RAISE EXCEPTION 'Cannot delete the app owner profile. This action is permanently blocked.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER protect_owner_profile_trigger
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_owner_profile();

-- 4. Update RLS on user_roles: secondary admins cannot delete OTHER admin roles  
-- (only app owner can manage admin roles)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- App owner can do everything
CREATE POLICY "App owner manages all roles"
  ON public.user_roles FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.app_owner))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.app_owner));

-- Secondary admins can manage non-admin roles only
CREATE POLICY "Secondary admins manage non-admin roles"
  ON public.user_roles FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND auth.uid() NOT IN (SELECT user_id FROM public.app_owner)
    AND role != 'admin'
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND auth.uid() NOT IN (SELECT user_id FROM public.app_owner)
    AND role != 'admin'
  );
