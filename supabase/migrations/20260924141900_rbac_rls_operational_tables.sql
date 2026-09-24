-- Execute after creating the operational tables. The role is read from
-- app_metadata.role so it cannot be changed by the client.
create or replace function public.has_operations_write_role()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'developer');
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['cm', 'sr', 'equipamentos_patio', 'colaboradores', 'previsao_navios_pecem']
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists "%I_authenticated_select" on public.%I', table_name, table_name);
      execute format('create policy "%I_authenticated_select" on public.%I for select to authenticated using (true)', table_name, table_name);
      execute format('drop policy if exists "%I_write_roles" on public.%I', table_name, table_name);
      execute format('create policy "%I_write_roles" on public.%I for all to authenticated using (public.has_operations_write_role()) with check (public.has_operations_write_role())', table_name, table_name);
    end if;
  end loop;
end $$;
