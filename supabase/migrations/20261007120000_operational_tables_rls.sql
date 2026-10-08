-- Garante RLS nas tabelas usadas pelo app que não eram cobertas pelas
-- migrations anteriores. Só age sobre as tabelas que já existem.
-- Leitura: qualquer usuário autenticado. Escrita: admin/developer
-- (public.has_operations_write_role), exceto o apontamento de paradas,
-- que qualquer usuário autenticado pode registrar.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'frotas', 'operacoes_navio', 'equipamentos', 'lineup_navios', 'calendario_operacional'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_select', table_name);
      execute format('create policy %I on public.%I for select to authenticated using (true)', table_name || '_authenticated_select', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_write_roles', table_name);
      execute format('create policy %I on public.%I for all to authenticated using (public.has_operations_write_role()) with check (public.has_operations_write_role())', table_name || '_write_roles', table_name);
    end if;
  end loop;

  if to_regclass('public.interrupcoes_operacionais') is not null then
    alter table public.interrupcoes_operacionais enable row level security;
    drop policy if exists "interrupcoes_select" on public.interrupcoes_operacionais;
    create policy "interrupcoes_select" on public.interrupcoes_operacionais for select to authenticated using (true);
    drop policy if exists "interrupcoes_insert" on public.interrupcoes_operacionais;
    create policy "interrupcoes_insert" on public.interrupcoes_operacionais for insert to authenticated with check (true);
    drop policy if exists "interrupcoes_write_roles" on public.interrupcoes_operacionais;
    create policy "interrupcoes_write_roles" on public.interrupcoes_operacionais for update to authenticated using (public.has_operations_write_role()) with check (public.has_operations_write_role());
    drop policy if exists "interrupcoes_delete_roles" on public.interrupcoes_operacionais;
    create policy "interrupcoes_delete_roles" on public.interrupcoes_operacionais for delete to authenticated using (public.has_operations_write_role());
  end if;
end $$;

-- Correção: a tabela foi renomeada de previsao_navios_pecem para
-- previsao_navios, mas a constraint antiga de fonte_dados manteve o nome
-- original e continuou ativa, recusando 'SIC-TOS Oficial CIPP' (valor usado
-- pelo scraper e pelo ETL). A constraint nova já cobre todos os valores.
alter table if exists public.previsao_navios
  drop constraint if exists previsao_navios_pecem_fonte_dados_check;
