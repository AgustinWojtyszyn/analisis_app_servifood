-- Supabase: mirror new auth users into public.profiles and public.user_settings
-- Safe to run multiple times.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'user',
    true
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Backfill existing auth users that are missing mirror rows.
insert into public.profiles (id, email, full_name, role, is_active)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
  'user',
  true
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
on conflict (id) do nothing;

insert into public.user_settings (user_id)
select au.id
from auth.users au
left join public.user_settings us on us.user_id = au.id
where us.user_id is null
on conflict (user_id) do nothing;
