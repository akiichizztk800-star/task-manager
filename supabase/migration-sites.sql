-- 既存のシフト作成アプリに、拠点・雇用区分・名前非表示を追加します。
-- Supabase の SQL Editor で、一度だけ実行してください。
-- いま入っている従業員は拠点「本店」に付きます。最初の合言葉は change-me です。入ったあと変更してください。

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sites (
  id text primary key,
  name text not null unique,
  passcode_hash text not null,
  hide_names boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.sites (id, name, passcode_hash, hide_names)
values (
  'site-main',
  '本店',
  extensions.crypt('change-me', extensions.gen_salt('bf')),
  true
)
on conflict (id) do nothing;

alter table public.employees add column if not exists site_id text;
alter table public.employees add column if not exists code text;
alter table public.employees add column if not exists employment_type text default 'fulltime';

update public.employees set site_id = 'site-main' where site_id is null;
update public.employees set employment_type = 'fulltime' where employment_type is null;
update public.employees
set code = 'E-' || lpad(substring(id from 5), 2, '0')
where code is null and id ~ '^emp-[0-9]+$';
update public.employees set code = left(id, 8) where code is null;

alter table public.employees alter column site_id set not null;
alter table public.employees alter column code set not null;
alter table public.employees alter column employment_type set not null;

alter table public.employees drop constraint if exists employees_employment_type_check;
alter table public.employees
  add constraint employees_employment_type_check
  check (employment_type in ('fulltime', 'parttime', 'doubletrack'));

alter table public.employees drop constraint if exists employees_site_id_fkey;
alter table public.employees
  add constraint employees_site_id_fkey
  foreign key (site_id) references public.sites (id);

alter table public.employees drop constraint if exists employees_site_code_key;
alter table public.employees
  add constraint employees_site_code_key unique (site_id, code);

alter table public.shift_plans add column if not exists site_id text;
update public.shift_plans set site_id = 'site-main' where site_id is null;
alter table public.shift_plans alter column site_id set not null;

alter table public.shift_plans drop constraint if exists shift_plans_site_id_fkey;
alter table public.shift_plans
  add constraint shift_plans_site_id_fkey
  foreign key (site_id) references public.sites (id);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.shift_plans'::regclass
      and conname = 'shift_plans_pkey'
      and pg_get_constraintdef(oid) not like '%site_id%'
  ) then
    alter table public.shift_plans drop constraint shift_plans_pkey;
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.shift_plans'::regclass
      and contype = 'p'
  ) then
    alter table public.shift_plans add primary key (site_id, month);
  end if;
end $$;

create or replace function public.request_header(header_name text)
returns text
language sql
stable
as $$
  select nullif(current_setting('request.headers', true)::json->>lower(header_name), '');
$$;

create or replace function public.request_passcode()
returns text
language plpgsql
stable
as $$
declare
  raw text;
begin
  raw := public.request_header('x-site-key');
  if raw is null then
    return null;
  end if;
  return convert_from(decode(raw, 'base64'), 'utf8');
exception
  when others then
    return null;
end;
$$;

create or replace function public.site_unlocked()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.sites
    where id = public.request_header('x-site-id')
      and passcode_hash = extensions.crypt(public.request_passcode(), passcode_hash)
  );
$$;

create or replace function public.enter_site(p_name text, p_passcode text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  found public.sites%rowtype;
begin
  select * into found
  from public.sites
  where name = btrim(p_name)
    and passcode_hash = extensions.crypt(p_passcode, passcode_hash);
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', found.id,
    'name', found.name,
    'hide_names', found.hide_names
  );
end;
$$;

create or replace function public.create_site(p_name text, p_passcode text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  found public.sites%rowtype;
  clean_name text := btrim(p_name);
begin
  if clean_name = '' then
    raise exception '拠点名を入力してください';
  end if;
  if char_length(p_passcode) < 4 then
    raise exception '合言葉は4文字以上にしてください';
  end if;
  if exists (select 1 from public.sites where name = clean_name) then
    raise exception '同じ名前の拠点があります';
  end if;
  insert into public.sites (id, name, passcode_hash, hide_names)
  values (
    'site-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
    clean_name,
    extensions.crypt(p_passcode, extensions.gen_salt('bf')),
    true
  )
  returning * into found;
  return jsonb_build_object(
    'id', found.id,
    'name', found.name,
    'hide_names', found.hide_names
  );
end;
$$;

create or replace function public.set_hide_names(p_hide boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  found public.sites%rowtype;
begin
  if not public.site_unlocked() then
    raise exception '拠点の確認に失敗しました';
  end if;
  update public.sites
  set hide_names = p_hide
  where id = public.request_header('x-site-id')
  returning * into found;
  return jsonb_build_object(
    'id', found.id,
    'name', found.name,
    'hide_names', found.hide_names
  );
end;
$$;

revoke all on public.sites from anon, authenticated;
grant select, insert, update, delete on public.employees to anon, authenticated;
grant select, insert, update, delete on public.shift_preferences to anon, authenticated;
grant select, insert, update, delete on public.shift_plans to anon, authenticated;

drop policy if exists "prototype_all_employees" on public.employees;
drop policy if exists "prototype_all_shift_preferences" on public.shift_preferences;
drop policy if exists "prototype_all_shift_plans" on public.shift_plans;
drop policy if exists "site_employees" on public.employees;
drop policy if exists "site_shift_preferences" on public.shift_preferences;
drop policy if exists "site_shift_plans" on public.shift_plans;

create policy "site_employees"
  on public.employees
  for all
  to anon, authenticated
  using (site_id = public.request_header('x-site-id') and public.site_unlocked())
  with check (site_id = public.request_header('x-site-id') and public.site_unlocked());

create policy "site_shift_preferences"
  on public.shift_preferences
  for all
  to anon, authenticated
  using (
    public.site_unlocked()
    and exists (
      select 1 from public.employees
      where employees.id = shift_preferences.employee_id
        and employees.site_id = public.request_header('x-site-id')
    )
  )
  with check (
    public.site_unlocked()
    and exists (
      select 1 from public.employees
      where employees.id = shift_preferences.employee_id
        and employees.site_id = public.request_header('x-site-id')
    )
  );

create policy "site_shift_plans"
  on public.shift_plans
  for all
  to anon, authenticated
  using (site_id = public.request_header('x-site-id') and public.site_unlocked())
  with check (site_id = public.request_header('x-site-id') and public.site_unlocked());

grant execute on function public.enter_site(text, text) to anon, authenticated;
grant execute on function public.create_site(text, text) to anon, authenticated;
grant execute on function public.set_hide_names(boolean) to anon, authenticated;
grant execute on function public.site_unlocked() to anon, authenticated;
grant execute on function public.request_header(text) to anon, authenticated;
grant execute on function public.request_passcode() to anon, authenticated;
