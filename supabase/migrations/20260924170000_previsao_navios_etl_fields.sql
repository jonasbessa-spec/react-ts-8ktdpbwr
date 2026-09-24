alter table public.previsao_navios
  add column if not exists duv text;

alter table public.previsao_navios
  drop constraint if exists previsao_navios_fonte_dados_check;

alter table public.previsao_navios
  add constraint previsao_navios_fonte_dados_check
  check (fonte_dados in (
    'CIPP Oficial',
    'SIC-TOS Oficial CIPP',
    'MarineTraffic AIS',
    'VesselFinder',
    'Praticagem'
  ));

create unique index if not exists previsao_navios_duv_uidx
  on public.previsao_navios (duv)
  where duv is not null and length(trim(duv)) > 0;

create unique index if not exists previsao_navios_imo_eta_uidx
  on public.previsao_navios (imo, eta)
  where eta is not null;

create index if not exists previsao_navios_atualizado_idx
  on public.previsao_navios (atualizado_em desc);
