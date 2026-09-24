do $$
begin
  if to_regclass('public.previsao_navios') is null
     and to_regclass('public.previsao_navios_pecem') is not null then
    alter table public.previsao_navios_pecem rename to previsao_navios;
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'developer', 'viewer')),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles for select to authenticated using (id = auth.uid());

alter table public.previsao_navios enable row level security;
drop policy if exists "previsao_navios_authenticated_select" on public.previsao_navios;
create policy "previsao_navios_authenticated_select" on public.previsao_navios for select to authenticated using (true);
drop policy if exists "previsao_navios_write_roles" on public.previsao_navios;
create policy "previsao_navios_write_roles" on public.previsao_navios for all to authenticated using (public.has_operations_write_role()) with check (public.has_operations_write_role());
