-- v4:真實練習紀錄(支撐「我的」頁數據 + 學習打卡日曆)
-- 在 SQL Editor 整段執行一次。

create table if not exists practice_sessions (
  id bigint generated always as identity primary key,
  day date not null,                       -- 使用者當地日期(YYYY-MM-DD)
  started_at timestamptz not null default now(),
  duration_sec int not null default 0,     -- 本次練習秒數
  drill_type text,                         -- Substitution / Transformation
  lesson_id text,
  reps int not null default 0,             -- 本次發數
  avg_reaction numeric                      -- 平均反應秒數
);
alter table practice_sessions enable row level security;
drop policy if exists "practice_sessions anon all" on practice_sessions;
create policy "practice_sessions anon all" on practice_sessions for all using (true) with check (true);
