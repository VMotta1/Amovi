create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  original_amount numeric(12,2),
  category text not null,
  occurred_on date not null,
  type text not null check (type in ('income', 'expense')),
  is_recurring boolean not null default false,
  recurring_active boolean not null default true,
  recurring_frequency text check (
    recurring_frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.transactions add column if not exists is_recurring boolean not null default false;
alter table public.transactions add column if not exists recurring_active boolean not null default true;
alter table public.transactions add column if not exists recurring_frequency text;
alter table public.transactions add column if not exists currency text not null default 'USD';
alter table public.transactions add column if not exists original_amount numeric(12,2);
alter table public.transactions add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.transactions add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.transactions
  drop constraint if exists transactions_recurring_frequency_check;

alter table public.transactions
  add constraint transactions_recurring_frequency_check check (
    recurring_frequency is null or recurring_frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')
  );

update public.transactions set original_amount = amount where original_amount is null;

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount >= 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  currency text not null default 'USD',
  original_target_amount numeric(12,2),
  original_current_amount numeric(12,2),
  emoji text not null default '💰',
  pinned boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.savings_goals add column if not exists current_amount numeric(12,2) not null default 0;
alter table public.savings_goals add column if not exists currency text not null default 'USD';
alter table public.savings_goals add column if not exists original_target_amount numeric(12,2);
alter table public.savings_goals add column if not exists original_current_amount numeric(12,2);
alter table public.savings_goals add column if not exists emoji text not null default '💰';
alter table public.savings_goals add column if not exists pinned boolean not null default false;
alter table public.savings_goals add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.savings_goals add column if not exists updated_at timestamptz not null default timezone('utc', now());
update public.savings_goals set original_target_amount = target_amount where original_target_amount is null;
update public.savings_goals set original_current_amount = current_amount where original_current_amount is null;

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.savings_goals (id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  original_amount numeric(12,2),
  contribution_type text not null default 'manual' check (
    contribution_type in ('manual', 'initial', 'surplus_recommendation_accepted', 'adjustment')
  ),
  source text not null default 'manual',
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.goal_contributions add column if not exists currency text not null default 'USD';
alter table public.goal_contributions add column if not exists original_amount numeric(12,2);
alter table public.goal_contributions add column if not exists contribution_type text not null default 'manual';
alter table public.goal_contributions add column if not exists source text not null default 'manual';
alter table public.goal_contributions add column if not exists note text;
alter table public.goal_contributions add column if not exists occurred_on date not null default current_date;
alter table public.goal_contributions add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.goal_contributions add column if not exists updated_at timestamptz not null default timezone('utc', now());
update public.goal_contributions set original_amount = amount where original_amount is null;

create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  budget numeric(12,2) not null check (budget >= 0),
  currency text not null default 'USD',
  original_budget numeric(12,2),
  icon text not null default 'shopping',
  color text not null default '#95d5b2',
  pinned boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.budget_categories add column if not exists currency text not null default 'USD';
alter table public.budget_categories add column if not exists original_budget numeric(12,2);
alter table public.budget_categories add column if not exists icon text not null default 'shopping';
alter table public.budget_categories add column if not exists color text not null default '#95d5b2';
alter table public.budget_categories add column if not exists pinned boolean not null default false;
alter table public.budget_categories add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.budget_categories add column if not exists updated_at timestamptz not null default timezone('utc', now());
update public.budget_categories set original_budget = budget where original_budget is null;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null default '📱',
  name text not null,
  category text not null,
  monthly_cost numeric(12,2) not null check (monthly_cost >= 0),
  currency text not null default 'USD',
  original_monthly_cost numeric(12,2),
  renewal_date date not null,
  has_student_discount boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.subscriptions add column if not exists emoji text not null default '📱';
alter table public.subscriptions add column if not exists currency text not null default 'USD';
alter table public.subscriptions add column if not exists original_monthly_cost numeric(12,2);
alter table public.subscriptions add column if not exists has_student_discount boolean not null default false;
alter table public.subscriptions add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.subscriptions add column if not exists updated_at timestamptz not null default timezone('utc', now());
update public.subscriptions set original_monthly_cost = monthly_cost where original_monthly_cost is null;

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('stock', 'crypto', 'etf', 'bond')),
  shares numeric(18,8) not null check (shares >= 0),
  purchase_price numeric(12,2) not null check (purchase_price >= 0),
  current_price numeric(12,2) not null check (current_price >= 0),
  currency text not null default 'USD',
  original_purchase_price numeric(12,2),
  original_current_price numeric(12,2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.investments add column if not exists currency text not null default 'USD';
alter table public.investments add column if not exists original_purchase_price numeric(12,2);
alter table public.investments add column if not exists original_current_price numeric(12,2);
alter table public.investments add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.investments add column if not exists updated_at timestamptz not null default timezone('utc', now());
update public.investments set original_purchase_price = purchase_price where original_purchase_price is null;
update public.investments set original_current_price = current_price where original_current_price is null;

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  language text not null default 'English',
  currency text not null default 'USD',
  country text not null default 'US',
  date_format text not null default 'MM/DD/YYYY',
  dark_mode boolean not null default false,
  budget_alerts boolean not null default true,
  subscription_reminders boolean not null default true,
  weekly_summary boolean not null default true,
  savings_milestones boolean not null default true,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_settings add column if not exists language text not null default 'English';
alter table public.user_settings add column if not exists currency text not null default 'USD';
alter table public.user_settings add column if not exists country text not null default 'US';
alter table public.user_settings add column if not exists date_format text not null default 'MM/DD/YYYY';
alter table public.user_settings add column if not exists dark_mode boolean not null default false;
alter table public.user_settings add column if not exists budget_alerts boolean not null default true;
alter table public.user_settings add column if not exists subscription_reminders boolean not null default true;
alter table public.user_settings add column if not exists weekly_summary boolean not null default true;
alter table public.user_settings add column if not exists savings_milestones boolean not null default true;
alter table public.user_settings add column if not exists onboarding_completed boolean not null default false;
alter table public.user_settings add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.user_settings add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.linked_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_number text not null,
  card_holder text not null,
  card_type text not null check (card_type in ('credit', 'debit')),
  bank_name text not null,
  auto_import boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.linked_cards add column if not exists auto_import boolean not null default true;
alter table public.linked_cards add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.linked_cards add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_key text not null,
  type text not null check (type in ('info', 'warning', 'success', 'alert')),
  title text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.notifications add column if not exists source_key text;
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists dismissed_at timestamptz;
alter table public.notifications add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.notifications add column if not exists updated_at timestamptz not null default timezone('utc', now());
create unique index if not exists notifications_user_source_key_idx on public.notifications (user_id, source_key);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update
    set full_name = excluded.full_name,
        updated_at = timezone('utc', now());
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.budget_categories enable row level security;
alter table public.subscriptions enable row level security;
alter table public.investments enable row level security;
alter table public.user_settings enable row level security;
alter table public.linked_cards enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id);

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions
  for select
  using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
  on public.transactions
  for update
  using (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
  on public.transactions
  for delete
  using (auth.uid() = user_id);

drop policy if exists "savings_goals_select_own" on public.savings_goals;
create policy "savings_goals_select_own"
  on public.savings_goals
  for select
  using (auth.uid() = user_id);

drop policy if exists "savings_goals_insert_own" on public.savings_goals;
create policy "savings_goals_insert_own"
  on public.savings_goals
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "savings_goals_update_own" on public.savings_goals;
create policy "savings_goals_update_own"
  on public.savings_goals
  for update
  using (auth.uid() = user_id);

drop policy if exists "savings_goals_delete_own" on public.savings_goals;
create policy "savings_goals_delete_own"
  on public.savings_goals
  for delete
  using (auth.uid() = user_id);

drop policy if exists "goal_contributions_select_own" on public.goal_contributions;
create policy "goal_contributions_select_own"
  on public.goal_contributions
  for select
  using (auth.uid() = user_id);

drop policy if exists "goal_contributions_insert_own" on public.goal_contributions;
create policy "goal_contributions_insert_own"
  on public.goal_contributions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "goal_contributions_update_own" on public.goal_contributions;
create policy "goal_contributions_update_own"
  on public.goal_contributions
  for update
  using (auth.uid() = user_id);

drop policy if exists "goal_contributions_delete_own" on public.goal_contributions;
create policy "goal_contributions_delete_own"
  on public.goal_contributions
  for delete
  using (auth.uid() = user_id);

drop policy if exists "budget_categories_select_own" on public.budget_categories;
create policy "budget_categories_select_own"
  on public.budget_categories
  for select
  using (auth.uid() = user_id);

drop policy if exists "budget_categories_insert_own" on public.budget_categories;
create policy "budget_categories_insert_own"
  on public.budget_categories
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "budget_categories_update_own" on public.budget_categories;
create policy "budget_categories_update_own"
  on public.budget_categories
  for update
  using (auth.uid() = user_id);

drop policy if exists "budget_categories_delete_own" on public.budget_categories;
create policy "budget_categories_delete_own"
  on public.budget_categories
  for delete
  using (auth.uid() = user_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
  on public.subscriptions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
  on public.subscriptions
  for update
  using (auth.uid() = user_id);

drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own"
  on public.subscriptions
  for delete
  using (auth.uid() = user_id);

drop policy if exists "investments_select_own" on public.investments;
create policy "investments_select_own"
  on public.investments
  for select
  using (auth.uid() = user_id);

drop policy if exists "investments_insert_own" on public.investments;
create policy "investments_insert_own"
  on public.investments
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "investments_update_own" on public.investments;
create policy "investments_update_own"
  on public.investments
  for update
  using (auth.uid() = user_id);

drop policy if exists "investments_delete_own" on public.investments;
create policy "investments_delete_own"
  on public.investments
  for delete
  using (auth.uid() = user_id);

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
  on public.user_settings
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
  on public.user_settings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
  on public.user_settings
  for update
  using (auth.uid() = user_id);

drop policy if exists "linked_cards_select_own" on public.linked_cards;
create policy "linked_cards_select_own"
  on public.linked_cards
  for select
  using (auth.uid() = user_id);

drop policy if exists "linked_cards_insert_own" on public.linked_cards;
create policy "linked_cards_insert_own"
  on public.linked_cards
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "linked_cards_update_own" on public.linked_cards;
create policy "linked_cards_update_own"
  on public.linked_cards
  for update
  using (auth.uid() = user_id);

drop policy if exists "linked_cards_delete_own" on public.linked_cards;
create policy "linked_cards_delete_own"
  on public.linked_cards
  for delete
  using (auth.uid() = user_id);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own"
  on public.notifications
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  using (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications
  for delete
  using (auth.uid() = user_id);
