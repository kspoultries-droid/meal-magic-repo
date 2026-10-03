create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ref text;
begin
  ref := nullif(trim(NEW.raw_user_meta_data->>'referral_code'), '');
  if ref is not null and not exists (select 1 from public.profiles where referral_code = ref) then
    ref := null;
  end if;
  insert into public.profiles (id, full_name, referred_by)
  values (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', ''), ref);
  insert into public.user_roles (user_id, role) values (NEW.id, 'customer');
  return NEW;
end $$;