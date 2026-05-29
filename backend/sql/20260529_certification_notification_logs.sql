create table if not exists public.certification_notification_logs (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.certifications(id) on delete cascade,
  trigger_type text not null,
  recipient text not null,
  sent_at timestamptz null,
  status text not null,
  error_message text null,
  created_at timestamptz not null default now()
);

create unique index if not exists certification_notification_logs_unique_triplet_idx
on public.certification_notification_logs (certification_id, trigger_type, recipient);

create index if not exists certification_notification_logs_certification_id_idx
on public.certification_notification_logs (certification_id);
