alter table public.document_email_notifications
  add column if not exists provider_message_id text null,
  add column if not exists provider_response jsonb null;

