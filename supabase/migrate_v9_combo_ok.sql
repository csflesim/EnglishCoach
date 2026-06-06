-- v9:bad_combos 改成「已判斷組合」快取(好壞都記,ok 區分);判過就不再重判
create table if not exists bad_combos (
  frame text not null,
  word text not null,
  ok boolean not null default false,  -- true=可用, false=不通(排除)
  reason text,
  created_at timestamptz not null default now(),
  primary key (frame, word)
);
alter table bad_combos add column if not exists ok boolean not null default false;
alter table bad_combos enable row level security;
drop policy if exists "bad_combos anon all" on bad_combos;
create policy "bad_combos anon all" on bad_combos for all using (true) with check (true);
