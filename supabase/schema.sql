-- ============================================================
-- SplitBetter Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Groups
create table if not exists groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- Members
create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- Expenses
create table if not exists expenses (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references groups(id) on delete cascade,
  payer_id          uuid not null references members(id) on delete cascade,
  description       text not null,
  total_amount      numeric(10, 2) not null check (total_amount > 0),
  receipt_image_url text,
  created_at        timestamptz not null default now()
);

-- Expense Shares
create table if not exists expense_shares (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references expenses(id) on delete cascade,
  member_id    uuid not null references members(id) on delete cascade,
  amount_owed  numeric(10, 2) not null check (amount_owed >= 0),
  is_settled   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (open for anonymous access — no auth yet)
-- ============================================================

alter table groups         enable row level security;
alter table members        enable row level security;
alter table expenses       enable row level security;
alter table expense_shares enable row level security;

-- Allow all operations for now (anonymous / local auth phase)
create policy "allow all" on groups         for all using (true) with check (true);
create policy "allow all" on members        for all using (true) with check (true);
create policy "allow all" on expenses       for all using (true) with check (true);
create policy "allow all" on expense_shares for all using (true) with check (true);

-- ============================================================
-- Helpful indexes
-- ============================================================

create index if not exists members_group_id_idx        on members(group_id);
create index if not exists expenses_group_id_idx       on expenses(group_id);
create index if not exists expense_shares_expense_idx  on expense_shares(expense_id);
create index if not exists expense_shares_member_idx   on expense_shares(member_id);
