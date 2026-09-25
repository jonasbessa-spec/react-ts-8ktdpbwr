alter table public.previsao_navios
  alter column berco_programado drop not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.previsao_navios'::regclass
      and pg_get_constraintdef(con.oid) ilike '%berco_programado%'
  loop
    execute format(
      'alter table public.previsao_navios drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.previsao_navios
  add constraint previsao_navios_berco_programado_check
  check (
    berco_programado is null
    or berco_programado in ('01', '02', '03', '04', '05', '06', '07', '08', '10')
  );
