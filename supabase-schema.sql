-- Volleyball Scoreboard Database Schema for Supabase
-- Project URL: https://ufejocelbvrvgmoewhaw.supabase.co

-- Per-set score for the day (one row → always upsert)
create table public.daily_sets (
  day         date primary key,
  left_score  int  not null default 0,
  right_score int  not null default 0,
  updated_at  timestamptz not null default now()
);

-- Daily match totals ("global score")
create table public.daily_totals (
  day        date primary key,
  left_wins  int not null default 0,
  right_wins int not null default 0,
  updated_at timestamptz not null default now()
);