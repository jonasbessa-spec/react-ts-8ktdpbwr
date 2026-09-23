create table if not exists public.previsao_navios_pecem (
  id uuid primary key default gen_random_uuid(),
  nome_navio text not null,
  imo text not null unique,
  mmsi text,
  tipo_carga text not null default 'Carga Geral',
  berco_programado text not null check (berco_programado in ('05', '06', '07', '08')),
  status text not null check (status in ('PROGRAMADO', 'AO LARGO / FUNDEADO', 'EM OPERACAO', 'CONCLUIDO')),
  eta timestamptz, etd timestamptz, agencia_maritima text,
  quantidade_toneladas numeric check (quantidade_toneladas is null or quantidade_toneladas >= 0),
  fonte_dados text not null check (fonte_dados in ('CIPP Oficial', 'MarineTraffic AIS', 'VesselFinder', 'Praticagem', 'Demonstração')),
  lat numeric check (lat is null or lat between -90 and 90),
  lng numeric check (lng is null or lng between -180 and 180),
  velocidade_nos numeric check (velocidade_nos is null or velocidade_nos >= 0),
  atualizado_em timestamptz not null default now()
);
create index if not exists previsao_navios_pecem_berco_eta_idx on public.previsao_navios_pecem (berco_programado, eta);
create index if not exists previsao_navios_pecem_status_idx on public.previsao_navios_pecem (status);
alter table public.previsao_navios_pecem enable row level security;
drop policy if exists "Previsão pública de navios é legível" on public.previsao_navios_pecem;
create policy "Previsão pública de navios é legível" on public.previsao_navios_pecem for select using (true);
