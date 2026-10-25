-- ============ Хелпер: текущий пользователь — админ? ============
-- security definer, чтобы проверка роли не упиралась в RLS самой profiles
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ============ profiles ============
-- Профиль привязан к пользователю и удаляется вместе с ним
alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;

-- Ник уникален без учёта регистра
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

-- Роль нельзя поменять с клиента: UPDATE разрешён только для username и avatar_url
revoke update on public.profiles from anon, authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;

drop policy if exists "Allow users to update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Профиль теперь создаёт триггер — вставка с клиента не нужна (через неё тоже можно было выдать себе role = 'admin')
drop policy if exists "Users can insert their own profile" on public.profiles;
revoke insert on public.profiles from anon, authenticated;

-- Дубль: «Public profiles are viewable by everyone» уже покрывает чтение своего профиля
drop policy if exists "Users can read their own profile" on public.profiles;

-- Автосоздание профиля при регистрации. Ник берётся из options.data.username в signUp
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  desired_username text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    split_part(new.email, '@', 1)
  );
begin
  begin
    insert into public.profiles (id, username, created_at)
    values (new.id, desired_username, now());
  exception when unique_violation then
    -- Ник успели занять между проверкой на клиенте и регистрацией — добавляем суффикс
    insert into public.profiles (id, username, created_at)
    values (new.id, desired_username || '_' || substr(new.id::text, 1, 6), now());
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ videos ============
-- Эта политика позволяла любому пользователю менять ЛЮБОЕ поле ЛЮБОГО видео
drop policy if exists "Anyone can update views" on public.videos;
-- Дубли
drop policy if exists "Videos are viewable by everyone" on public.videos;
drop policy if exists "Users can insert their videos" on public.videos;

-- Автор может редактировать своё видео, но не просмотры и не автора
revoke update on public.videos from anon, authenticated;
grant update (title, description, thumbnail_url, duration) on public.videos to authenticated;

create policy "Authors can update their own videos"
  on public.videos for update to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

drop policy if exists "Admins can delete any video" on public.videos;
create policy "Admins can delete any video"
  on public.videos for delete to authenticated
  using (public.is_admin());

-- Просмотры увеличивает только функция (security definer), а не прямой UPDATE
create or replace function public.increment_views(video_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.videos set views = coalesce(views, 0) + 1 where id = video_id;
$$;

revoke execute on function public.increment_views(uuid) from public, anon;
grant execute on function public.increment_views(uuid) to authenticated;

-- ============ notifications ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users can read their notifications"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can mark their notifications as read"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their notifications"
  on public.notifications for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Admins can send notifications"
  on public.notifications for insert to authenticated
  with check (public.is_admin());

-- Пользователь может менять только флаг прочтения
revoke update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

-- ============ Realtime ============
-- Код страницы видео подписывается на comments, но таблица не была в публикации
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;

-- ============ Storage ============
-- Раньше любой залогиненный мог удалить любой файл в videos/thumbnails
drop policy if exists "Allow DELETE for thumbnails" on storage.objects;
drop policy if exists "Allow DELETE for videos" on storage.objects;

create policy "Owners and admins can delete media"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('videos', 'thumbnails')
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

-- Аватары: загружать только в свою папку; старые файлы в корне может удалить владелец
drop policy if exists "Avatar Upload" on storage.objects;
create policy "Avatar Upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatar' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Avatar owners can delete legacy files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatar' and owner_id = (select auth.uid())::text);

-- Лимит размера аватара: 5 МБ
update storage.buckets set file_size_limit = 5242880 where id = 'avatar';
-- Превью — тоже 5 МБ (было 50 МБ, как у видео)
update storage.buckets set file_size_limit = 5242880 where id = 'thumbnails';
