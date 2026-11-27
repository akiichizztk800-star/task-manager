-- シフト作成アプリのテーブルをまとめて作ります。
-- Supabase の SQL Editor に貼り付けて、一度だけ実行してください。

create table if not exists public.employees (
  id text primary key,
  name text not null,
  supervisor boolean not null default false,
  engineer boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.shift_preferences (
  id bigint generated always as identity primary key,
  employee_id text not null references public.employees (id) on delete cascade,
  month text not null,
  days jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (employee_id, month)
);

create table if not exists public.shift_plans (
  month text primary key,
  holiday_quota integer not null default 8 check (holiday_quota >= 0),
  assignments jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.employees to anon, authenticated;
grant select, insert, update, delete on public.shift_preferences to anon, authenticated;
grant select, insert, update, delete on public.shift_plans to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

alter table public.employees enable row level security;
alter table public.shift_preferences enable row level security;
alter table public.shift_plans enable row level security;

drop policy if exists "prototype_all_employees" on public.employees;
create policy "prototype_all_employees"
  on public.employees
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "prototype_all_shift_preferences" on public.shift_preferences;
create policy "prototype_all_shift_preferences"
  on public.shift_preferences
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "prototype_all_shift_plans" on public.shift_plans;
create policy "prototype_all_shift_plans"
  on public.shift_plans
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 店長画面が、別のスマホからの保存を即座に受け取れるようにします。
do $$
begin
  alter publication supabase_realtime add table public.employees;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shift_preferences;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shift_plans;
exception
  when duplicate_object then null;
end $$;
