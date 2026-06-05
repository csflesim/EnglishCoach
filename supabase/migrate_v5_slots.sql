-- v5:單字加「文法槽 slots」與「難易度 difficulty」(供 B 文法對應 + Phase 2 選詞)
-- 在 SQL Editor 整段執行一次。

alter table vocabulary add column if not exists slots text[] not null default '{}';
alter table vocabulary add column if not exists difficulty int;

-- 加速查詢(可選)
create index if not exists vocabulary_slots_idx on vocabulary using gin (slots);
create index if not exists vocabulary_difficulty_idx on vocabulary (difficulty);
