alter table public.certifications
add column if not exists url text;

alter table public.certifications
drop constraint if exists certifications_url_http_check;

alter table public.certifications
add constraint certifications_url_http_check
check (
  url is null
  or url = ''
  or url ~* '^https?://'
);
