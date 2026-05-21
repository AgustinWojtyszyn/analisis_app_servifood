create table if not exists public.document_email_notifications (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.nutrition_modules(id) on delete cascade,
  title text not null,
  module_type text not null check (module_type in ('procedimiento', 'registro', 'estrategias')),
  document_created_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  recipients jsonb not null,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz null
);

create index if not exists idx_document_email_notifications_status_created_at
  on public.document_email_notifications(status, created_at asc);

create index if not exists idx_document_email_notifications_document_id
  on public.document_email_notifications(document_id);

create unique index if not exists uq_document_email_notifications_document_id
  on public.document_email_notifications(document_id);

create or replace function public.set_document_email_notifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_document_email_notifications_updated_at on public.document_email_notifications;
create trigger trg_document_email_notifications_updated_at
before update on public.document_email_notifications
for each row
execute function public.set_document_email_notifications_updated_at();

create or replace function public.enqueue_document_email_notification()
returns trigger
language plpgsql
as $$
begin
  insert into public.document_email_notifications (
    document_id,
    title,
    module_type,
    document_created_at,
    status,
    recipients
  )
  values (
    new.id,
    new.title,
    new.module_type,
    new.created_at,
    'pending',
    to_jsonb(array[
      'direcciontecnicaservifood@gmail.com',
      'nutrisionservifood@yahoo.com',
      'vanesalegonzalez@gmail.com',
      'agustinwojtyszyn99@gmail.com'
    ])
  )
  on conflict (document_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_nutrition_modules_enqueue_document_email on public.nutrition_modules;
create trigger trg_nutrition_modules_enqueue_document_email
after insert on public.nutrition_modules
for each row
execute function public.enqueue_document_email_notification();

create or replace function public.claim_document_email_notifications(max_rows integer default 20)
returns setof public.document_email_notifications
language plpgsql
security definer
as $$
begin
  return query
  with candidates as (
    select id
    from public.document_email_notifications
    where status = 'pending'
    order by created_at asc
    for update skip locked
    limit greatest(coalesce(max_rows, 20), 1)
  )
  update public.document_email_notifications n
  set status = 'processing',
      attempts = n.attempts + 1
  where n.id in (select id from candidates)
  returning n.*;
end;
$$;

revoke all on function public.claim_document_email_notifications(integer) from public;
grant execute on function public.claim_document_email_notifications(integer) to service_role;
