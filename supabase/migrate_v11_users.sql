-- v11:多用戶帳號 + 每位用戶資料獨立
-- 在 Supabase SQL Editor 執行一次。

-- 1) 用戶表(密碼以 scrypt 雜湊存放,絕不存明文)
create table if not exists users (
  id bigint generated always as identity primary key,
  username text unique not null,
  password_hash text not null,           -- 格式 salt:hash(scrypt)
  created_at timestamptz default now()
);
alter table users enable row level security;
drop policy if exists users_anon_all on users;
create policy users_anon_all on users for all using (true) with check (true);

-- 2) 為每位用戶獨立的資料表加 user_id
alter table progress           add column if not exists user_id bigint;
alter table review_items       add column if not exists user_id bigint;
alter table practice_sessions  add column if not exists user_id bigint;
alter table error_log          add column if not exists user_id bigint;

-- 3) 唯一鍵改成「含 user_id」,讓不同用戶可有相同的 ref / 句框進度
-- progress:原本 PK 是 (lesson_id, drill_type)
alter table progress drop constraint if exists progress_pkey;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'progress_user_lesson_drill_key') then
    alter table progress add constraint progress_user_lesson_drill_key unique (user_id, lesson_id, drill_type);
  end if;
end $$;

-- review_items:原本 ref 是 unique
alter table review_items drop constraint if exists review_items_ref_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'review_items_user_ref_key') then
    alter table review_items add constraint review_items_user_ref_key unique (user_id, ref);
  end if;
end $$;

-- 4) 加速每位用戶查詢
create index if not exists idx_progress_user on progress(user_id);
create index if not exists idx_review_items_user on review_items(user_id);
create index if not exists idx_practice_user on practice_sessions(user_id);
create index if not exists idx_error_log_user on error_log(user_id);

-- 註:舊的單人資料(user_id 為 NULL)登入後不會顯示;可手動 update 指派給某 user_id,或忽略。
