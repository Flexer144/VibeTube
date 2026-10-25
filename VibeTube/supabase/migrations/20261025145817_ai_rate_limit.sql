-- Журнал запросов к ИИ для ограничения частоты. Пишет и читает только edge-функция (service role)
create table public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_requests_user_id_created_at_idx on public.ai_requests (user_id, created_at desc);

-- RLS включён без политик: с клиента таблица недоступна
alter table public.ai_requests enable row level security;
revoke all on public.ai_requests from anon, authenticated;
