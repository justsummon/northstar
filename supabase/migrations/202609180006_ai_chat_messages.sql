-- Persists the authenticated user's admissions-assistant conversation.
-- Messages are private and can only be read or written by their owner.
create table public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  created_at timestamptz not null default now()
);

create index ai_chat_messages_user_created_idx
  on public.ai_chat_messages(user_id, created_at);

alter table public.ai_chat_messages enable row level security;

create policy "chat messages own" on public.ai_chat_messages for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
