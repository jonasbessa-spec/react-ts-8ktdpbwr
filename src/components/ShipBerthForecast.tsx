import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Anchor, CalendarClock, ChevronDown, ExternalLink, Map, RefreshCw, Ship, Signal, TriangleAlert, X } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { assignTentativeBerths, readCachedShips, SHIP_LINEUP_CACHE_KEY, SGO_DATA_CHANGED_EVENT, writeCachedShips } from '../lib/sgoData';

type Berth = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '10';
type ShipStatus = 'PROGRAMADO' | 'AO LARGO / FUNDEADO' | 'EM OPERACAO' | 'CONCLUIDO';
interface ShipForecast {
  id?: string; nomeNavio: string; imo: string; mmsi?: string; tipoCarga: string; bercoProgramado: Berth | null; status: ShipStatus;
  berco_atribuicao_automatica?: boolean;
  eta: string; etd: string; agenciaMaritima: string; quantidadeToneladas: number; fonteDados: string; lat: number; lng: number; velocidadeNos: number;
}
interface ForecastResponse {
  ships?: Array<Partial<ShipForecast> & { cargaGeral?: string; duv?: string | null; bercoProgramado?: number | string | null }>;
  count?: number;
  error?: string;
}

const BERTHS: Array<'TODOS' | 'PENDENTE' | Berth> = ['TODOS', 'PENDENTE', '01', '02', '03', '04', '05', '06', '07', '08', '10'];
const normalizeShip = (ship: Partial<ShipForecast> & { cargaGeral?: string; bercoProgramado?: number | string | null }, index: number): ShipForecast => ({
  id: ship.id || `${ship.imo || 'cipp'}-${index}`, nomeNavio: ship.nomeNavio || 'Navio não informado', imo: ship.imo || 'Não informado', mmsi: ship.mmsi || '',
  tipoCarga: ship.tipoCarga || ship.cargaGeral || 'Carga Geral', bercoProgramado: (() => { const value = String(ship.bercoProgramado ?? '').trim().toUpperCase(); const number = value.replace(/\D/g, ''); return !value || value === 'PENDENTE' || !number ? null : number.padStart(2, '0') as Berth; })(),
  berco_atribuicao_automatica: ship.berco_atribuicao_automatica,
  status: ship.status || 'PROGRAMADO', eta: ship.eta || 'Não informado', etd: ship.etd || 'Não informado', agenciaMaritima: ship.agenciaMaritima || 'Não informado',
  quantidadeToneladas: Number(ship.quantidadeToneladas || 0), fonteDados: ship.fonteDados || 'CIPP Oficial', lat: Number(ship.lat || 0), lng: Number(ship.lng || 0), velocidadeNos: Number(ship.velocidadeNos || 0)
});
const normalizedCargo = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const isContainerCargo = (value: string) => /CONTAINER|CONT[EÊ]INER|PORTA[-\s]?CONTEINER/.test(normalizedCargo(value));
const isValidImo = (value: string) => /^\d{7}$/.test(value.replace(/\D/g, ''));
const formatDate = (value: string) => { if (!value || value === 'Não informado') return value; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date); };
const formatTons = (value: number) => value ? `${new Intl.NumberFormat('pt-BR').format(value)} t` : 'Não informado';
const links = (ship: ShipForecast) => ({ marine: `https://www.marinetraffic.com/en/ais/details/ships/imo:${encodeURIComponent(ship.imo)}`, vessel: `https://www.vesselfinder.com/vessels/details/${encodeURIComponent(ship.imo)}` });

const mockLineup = (): ShipForecast[] => {
  const now = Date.now();
  return [
    { id: 'demo-ship-1', nomeNavio: 'Navio de demonstração 01', imo: 'Não informado', tipoCarga: 'Carga geral', bercoProgramado: null, status: 'PROGRAMADO', eta: new Date(now + 6 * 3600000).toISOString(), etd: new Date(now + 30 * 3600000).toISOString(), agenciaMaritima: 'Dados simulados', quantidadeToneladas: 0, fonteDados: 'Demonstração local (offline)', lat: 0, lng: 0, velocidadeNos: 0 },
    { id: 'demo-ship-2', nomeNavio: 'Navio de demonstração 02', imo: 'Não informado', tipoCarga: 'Granel', bercoProgramado: null, status: 'PROGRAMADO', eta: new Date(now + 30 * 3600000).toISOString(), etd: new Date(now + 54 * 3600000).toISOString(), agenciaMaritima: 'Dados simulados', quantidadeToneladas: 0, fonteDados: 'Demonstração local (offline)', lat: 0, lng: 0, velocidadeNos: 0 },
  ];
};

const toForecastRow = (row: Record<string, unknown>, index: number): ShipForecast => normalizeShip({
  ...row,
  id: typeof row.id === 'string' ? row.id : undefined,
  nomeNavio: String(row.nome_navio ?? row.nomeNavio ?? ''),
  imo: String(row.imo ?? ''),
  tipoCarga: String(row.tipo_carga ?? row.tipoCarga ?? ''),
  bercoProgramado: (row.berco_programado ?? row.bercoProgramado) as number | string | undefined,
  status: String(row.status ?? 'PROGRAMADO') as ShipStatus,
  eta: String(row.eta ?? ''),
  etd: String(row.etd ?? ''),
  agenciaMaritima: String(row.agencia_maritima ?? row.agenciaMaritima ?? ''),
  quantidadeToneladas: Number(row.quantidade_toneladas ?? row.quantidadeToneladas ?? 0),
  fonteDados: String(row.fonte_dados ?? row.fonteDados ?? ''),
  velocidadeNos: Number(row.velocidade_nos ?? row.velocidadeNos ?? 0),
  berco_atribuicao_automatica: Boolean(row.berco_atribuicao_automatica),
} as Partial<ShipForecast> & { cargaGeral?: string; duv?: string | null; bercoProgramado?: number | string | null }, index);

const assignBerths = (rows: ShipForecast[]) => assignTentativeBerths(rows.map((ship) => ({
  ...ship,
  berco_programado: ship.bercoProgramado,
  tipo_carga: ship.tipoCarga,
}))).map((ship) => ({ ...ship, bercoProgramado: ship.berco_programado as Berth | null }));

export default function ShipBerthForecast({ demoMode = false }: { demoMode?: boolean }) {
  const { canWrite } = useAuth();
  const loadSequence = useRef(0);
  const [ships, setShips] = useState<ShipForecast[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'Supabase' | 'Cache local' | 'Demonstração offline'>('Supabase');
  const [expanded, setExpanded] = useState<string | null>(null); const [selected, setSelected] = useState<ShipForecast | null>(null); const [syncing, setSyncing] = useState(false);
  const [berth, setBerth] = useState<'TODOS' | 'PENDENTE' | Berth>('TODOS'); const [period, setPeriod] = useState('30');
  const loadShips = useCallback(async () => {
    const requestId = ++loadSequence.current;
    setLoading(true);
    try {
      if (!demoMode && supabaseConfigured) {
        const { data, error: queryError } = await supabase.from('previsao_navios').select('*').order('eta', { ascending: true });
        if (requestId !== loadSequence.current) return;
        if (!queryError && data?.length) {
          const remote = data.map((row, index) => toForecastRow(row as Record<string, unknown>, index))
            .filter((ship) => !isContainerCargo(ship.tipoCarga));
          const assigned = assignBerths(remote);
          setShips(assigned);
          setDataSource('Supabase');
          setError(null);
          writeCachedShips(SHIP_LINEUP_CACHE_KEY, assigned);
          setLoading(false);
          return;
        }
        setError(queryError?.message ?? 'A tabela Supabase não contém navios; exibindo o fallback local.');
      } else {
        setError(demoMode
          ? 'Modo WebContainer: exibindo cache local ou dados de demonstração.'
          : 'Supabase não configurado; exibindo dados locais.');
      }
    } catch (cause) {
      if (requestId !== loadSequence.current) return;
      setError(cause instanceof Error ? cause.message : 'A consulta de navios falhou; exibindo dados locais.');
    }

    if (requestId !== loadSequence.current) return;
    const cached = readCachedShips<ShipForecast>(SHIP_LINEUP_CACHE_KEY)
      .filter((ship) => !isContainerCargo(String(ship.tipoCarga ?? '')));
    if (cached.length) {
      setShips(assignBerths(cached));
      setDataSource('Cache local');
    } else {
      setShips(assignBerths(mockLineup()));
      setDataSource('Demonstração offline');
    }
    setLoading(false);
  }, [demoMode]);
  useEffect(() => {
    void loadShips();
    const onSgoDataChanged = () => { void loadShips(); };
    window.addEventListener(SGO_DATA_CHANGED_EVENT, onSgoDataChanged);
    return () => window.removeEventListener(SGO_DATA_CHANGED_EVENT, onSgoDataChanged);
  }, [loadShips]);
  const importCippLineup = async () => {
    if (!canWrite) return;
    setSyncing(true); setError(null);
    try {
      const response = await fetch('/api/ships', { headers: { Accept: 'application/json' } });
      const payload = await response.json() as ForecastResponse;
      if (!response.ok) throw new Error(payload.error || 'A fonte pública da CIPP está indisponível.');
      const rows = (payload.ships || []).flatMap((ship) => {
        const imo = String(ship.imo || '').replace(/\D/g, '');
        const name = String(ship.nomeNavio || '').trim();
        const cargo = String(ship.tipoCarga || ship.cargaGeral || '').trim();
        const eta = ship.eta ? new Date(ship.eta) : null;
        const status = ship.status;
        if (!name || !isValidImo(imo) || !eta || Number.isNaN(eta.getTime()) || !status || isContainerCargo(cargo)) return [];
        const berthNumber = ship.bercoProgramado == null ? null : Number(ship.bercoProgramado);
        const berth = berthNumber !== null && Number.isInteger(berthNumber)
          ? String(berthNumber).padStart(2, '0')
          : null;
        if (berth && !BERTHS.includes(berth as Berth)) return [];
        return [{
          nome_navio: name,
          imo,
          duv: ship.duv || null,
          tipo_carga: cargo || 'Carga Geral',
          berco_programado: berth,
          status,
          eta: eta.toISOString(),
          etd: ship.etd && !Number.isNaN(new Date(ship.etd).getTime()) ? new Date(ship.etd).toISOString() : null,
          fonte_dados: 'SIC-TOS Oficial CIPP',
        }];
      });
      if (!rows.length) {
        const count = payload.count ?? payload.ships?.length ?? 0;
        setError(count
          ? `${count} registros elegíveis recebidos, mas nenhum contém IMO e ETA válidos para gravação. O SIC-TOS público pode omitir o IMO; enriqueça os dados antes de importar.`
          : 'A fonte SIC-TOS não retornou navios de carga geral para importar.');
        return;
      }
      const { error: upsertError } = await supabase.from('previsao_navios').upsert(rows, { onConflict: 'imo' });
      if (upsertError) throw upsertError;
      await loadShips();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível sincronizar MarineTraffic.'); } finally { setSyncing(false); }
  };
  const changeBerth = async (ship: ShipForecast, nextBerth: Berth) => {
    if (!canWrite || !ship.id) return;
    const { error: updateError } = await supabase.from('previsao_navios').update({ berco_programado: nextBerth }).eq('id', ship.id);
    if (updateError) setError(updateError.message);
    else await loadShips();
  };
  const filteredShips = useMemo(() => { const cutoff = period === 'all' ? Infinity : Date.now() + Number(period) * 86400000; return ships.filter((ship) => { const eta = new Date(ship.eta).getTime(); const berthMatches = berth === 'TODOS' || (berth === 'PENDENTE' ? !ship.bercoProgramado : ship.bercoProgramado === berth); return berthMatches && (period === 'all' || Number.isNaN(eta) || eta <= cutoff); }); }, [berth, period, ships]);
  return <section className="ship-forecast-module" aria-label="Painel de previsão e rastreamento de navios">
    <div className="module-card-header forecast-heading"><div><span className="module-kicker"><Ship size={13} /> Carga geral · lineup CIPP · {dataSource}</span><h3 className="forecast-title">Previsão e rastreamento · Berços CIPP</h3><p>Berços automáticos são sugestões por fila, carga e janela de ocupação; confirme a disponibilidade operacional.</p></div><div className="forecast-actions"><button type="button" className="forecast-refresh" onClick={loadShips} disabled={loading}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar dados</button>{canWrite && <button type="button" className="forecast-refresh" onClick={importCippLineup} disabled={syncing}><Signal size={14} className={syncing ? 'animate-pulse' : ''} /> Importar lineup CIPP</button>}</div></div>
    <div className="forecast-controls"><div className="forecast-berths" aria-label="Filtrar por berço">{BERTHS.map((value) => <button key={value} type="button" className={berth === value ? 'active' : ''} onClick={() => setBerth(value)}>{value === 'TODOS' ? value : `Berço ${value}`}</button>)}</div><label>Período<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7">Próximos 7 dias</option><option value="30">Próximos 30 dias</option><option value="all">Todos</option></select></label></div>
    {loading && <div className="forecast-state"><RefreshCw size={22} className="animate-spin" /> Consultando programação...</div>}
    {!loading && error && <div className="forecast-state forecast-error"><TriangleAlert size={18} /><span>{error}<small>Fonte exibida: {dataSource}. Sugestões automáticas de berço não substituem a confirmação operacional.</small></span></div>}
    {!loading && !filteredShips.length && !error && <div className="forecast-state"><CalendarClock size={18} /> Nenhum navio de carga geral encontrado no lineup atual.</div>}
    {!loading && filteredShips.length > 0 && <div className="forecast-table-wrap"><table className="forecast-table forecast-table-expanded"><thead><tr><th>Status</th><th>Navio / IMO</th><th>Berço</th><th>Tipo de carga</th><th>Volume</th><th>ETA</th><th>ETD</th><th>Fonte</th><th /></tr></thead><tbody>{filteredShips.map((ship) => { const key = ship.id || ship.imo; const isOpen = expanded === key; const statusClass = ship.status.toLowerCase().replace(/ /g, '-').replace(/\//g, ''); return <tr key={key} className={isOpen ? 'forecast-open' : ''} onClick={() => setExpanded(isOpen ? null : key)}><td><span className={`ship-status status-${statusClass}`}>{ship.status}</span></td><td><button type="button" className="forecast-vessel"><Anchor size={14} /><span><strong>{ship.nomeNavio}</strong><small>IMO {ship.imo}</small></span><ChevronDown size={14} className="mobile-chevron" /></button></td><td><span className="berth-badge" title={ship.berco_atribuicao_automatica ? 'Sugestão automática provisória; confirme a disponibilidade' : undefined}>{ship.bercoProgramado ? `${ship.bercoProgramado}${ship.berco_atribuicao_automatica ? ' · est.' : ''}` : 'Pendente'}</span></td><td>{ship.tipoCarga}</td><td>{formatTons(ship.quantidadeToneladas)}</td><td>{formatDate(ship.eta)}</td><td>{formatDate(ship.etd)}</td><td>{ship.fonteDados}</td><td><button type="button" className="forecast-map-button" onClick={(event) => { event.stopPropagation(); setSelected(ship); }}><Map size={14} /> Ver mapa</button></td></tr>; })}</tbody></table></div>}
    <p className="forecast-legend"><Signal size={13} /> Berços com “est.” são sugestões heurísticas pelo tipo de carga e horário; confirme o planejamento oficial. Se Supabase estiver indisponível, cache/demonstração são identificados no cabeçalho.</p><a className="forecast-source" href="https://www.complexodopecem.br/" target="_blank" rel="noreferrer"><ExternalLink size={12} /> Consultar fonte pública da CIPP</a>
    {selected && <div className="forecast-modal-backdrop" role="presentation" onClick={() => setSelected(null)}><div className="forecast-drawer" role="dialog" aria-modal="true" aria-label={`Rastreamento de ${selected.nomeNavio}`} onClick={(event) => event.stopPropagation()}><button type="button" className="forecast-close" onClick={() => setSelected(null)} aria-label="Fechar"><X size={18} /></button><span className="module-kicker"><Map size={13} /> Rastreamento público</span><h3>{selected.nomeNavio}</h3><p>IMO {selected.imo} · posição {selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}</p><div className="forecast-drawer-grid"><span>Status<strong>{selected.status}</strong></span><span>Velocidade<strong>{selected.velocidadeNos.toFixed(1)} nós</strong></span><span>Berço<strong>{selected.bercoProgramado || 'Pendente'}</strong></span><span>Volume<strong>{formatTons(selected.quantidadeToneladas)}</strong></span></div>{canWrite && <label className="forecast-edit-field">Alterar berço<select value={selected.bercoProgramado || ''} onChange={(event) => { const next = (event.target.value || null) as Berth | null; setSelected({ ...selected, bercoProgramado: next }); if (next) void changeBerth(selected, next); }}>{BERTHS.filter((value): value is Berth => value !== 'TODOS' && value !== 'PENDENTE').map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}<a className="forecast-tracking-link" href={links(selected).marine} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir MarineTraffic</a><a className="forecast-tracking-link secondary" href={links(selected).vessel} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir VesselFinder</a></div></div>}
  </section>;
}
