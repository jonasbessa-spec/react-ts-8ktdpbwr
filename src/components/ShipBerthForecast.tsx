import { useCallback, useEffect, useMemo, useState } from 'react';
import { Anchor, CalendarClock, ChevronDown, ExternalLink, Map, RefreshCw, Ship, Signal, TriangleAlert, X } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Berth = '05' | '06' | '07' | '08';
type ShipStatus = 'PROGRAMADO' | 'AO LARGO / FUNDEADO' | 'EM OPERACAO' | 'CONCLUIDO';
interface ShipForecast {
  id?: string; nomeNavio: string; imo: string; mmsi?: string; tipoCarga: string; bercoProgramado: Berth; status: ShipStatus;
  eta: string; etd: string; agenciaMaritima: string; quantidadeToneladas: number; fonteDados: string; lat: number; lng: number; velocidadeNos: number;
}
interface ForecastResponse { ships?: Array<Partial<ShipForecast> & { cargaGeral?: string; bercoProgramado?: number }>; error?: string; }

const BERTHS: Array<'TODOS' | Berth> = ['TODOS', '05', '06', '07', '08'];
const normalizeShip = (ship: Partial<ShipForecast> & { cargaGeral?: string; bercoProgramado?: number }, index: number): ShipForecast => ({
  id: ship.id || `${ship.imo || 'cipp'}-${index}`, nomeNavio: ship.nomeNavio || 'Navio não informado', imo: ship.imo || 'Não informado', mmsi: ship.mmsi || '',
  tipoCarga: ship.tipoCarga || ship.cargaGeral || 'Carga Geral', bercoProgramado: String(ship.bercoProgramado || '').padStart(2, '0') as Berth,
  status: ship.status || 'PROGRAMADO', eta: ship.eta || 'Não informado', etd: ship.etd || 'Não informado', agenciaMaritima: ship.agenciaMaritima || 'Não informado',
  quantidadeToneladas: Number(ship.quantidadeToneladas || 0), fonteDados: ship.fonteDados || 'CIPP Oficial', lat: Number(ship.lat || 0), lng: Number(ship.lng || 0), velocidadeNos: Number(ship.velocidadeNos || 0)
});
const formatDate = (value: string) => { if (!value || value === 'Não informado') return value; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date); };
const formatTons = (value: number) => value ? `${new Intl.NumberFormat('pt-BR').format(value)} t` : 'Não informado';
const links = (ship: ShipForecast) => ({ marine: `https://www.marinetraffic.com/en/ais/details/ships/imo:${encodeURIComponent(ship.imo)}`, vessel: `https://www.vesselfinder.com/vessels/details/${encodeURIComponent(ship.imo)}` });

export default function ShipBerthForecast() {
  const { canWrite } = useAuth();
  const [ships, setShips] = useState<ShipForecast[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null); const [selected, setSelected] = useState<ShipForecast | null>(null); const [syncing, setSyncing] = useState(false);
  const [berth, setBerth] = useState<'TODOS' | Berth>('TODOS'); const [period, setPeriod] = useState('30');
  const loadShips = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (!supabaseConfigured) throw new Error('Supabase não configurado.');
      const { data, error: queryError } = await supabase.from('previsao_navios').select('*').in('berco_programado', ['05', '06', '07', '08']).order('eta', { ascending: true });
      if (queryError) throw queryError;
      setShips((data || []).map((row, index) => normalizeShip({ ...row, nomeNavio: row.nome_navio, tipoCarga: row.tipo_carga, bercoProgramado: row.berco_programado, agenciaMaritima: row.agencia_maritima, quantidadeToneladas: row.quantidade_toneladas, fonteDados: row.fonte_dados, velocidadeNos: row.velocidade_nos }, index)).filter((ship) => ['05', '06', '07', '08'].includes(ship.bercoProgramado) && !/container|porta[- ]?conteineres/i.test(ship.tipoCarga)));
    } catch (cause) { setShips([]); setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a previsão real.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    loadShips();
    if (!supabaseConfigured) return;
    const channel = supabase.channel('previsao-navios-live').on('postgres_changes', { event: '*', schema: 'public', table: 'previsao_navios' }, loadShips).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadShips]);
  const syncMarineTraffic = async () => {
    if (!canWrite) return;
    setSyncing(true); setError(null);
    try {
      const response = await fetch('/api/ships', { headers: { Accept: 'application/json' } }); const payload = await response.json() as ForecastResponse;
      if (!response.ok) throw new Error(payload.error || 'A fonte CIPP/AIS está indisponível.');
      const rows = (payload.ships || []).map((ship, index) => {
        const normalized = normalizeShip(ship, index);
        return { ...normalized, nome_navio: normalized.nomeNavio, imo: normalized.imo, tipo_carga: normalized.tipoCarga, berco_programado: normalized.bercoProgramado, status: normalized.status, eta: normalized.eta, etd: normalized.etd, fonte_dados: 'CIPP Oficial' };
      }).filter((ship) => ['05', '06', '07', '08'].includes(ship.berco_programado) && !/container|porta[- ]?conteineres/i.test(ship.tipo_carga));
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
  const filteredShips = useMemo(() => { const cutoff = period === 'all' ? Infinity : Date.now() + Number(period) * 86400000; return ships.filter((ship) => { const eta = new Date(ship.eta).getTime(); return (berth === 'TODOS' || ship.bercoProgramado === berth) && (period === 'all' || Number.isNaN(eta) || eta <= cutoff); }); }, [berth, period, ships]);
  return <section className="ship-forecast-module" aria-label="Painel de previsão e rastreamento de navios">
    <div className="module-card-header forecast-heading"><div><span className="module-kicker"><Ship size={13} /> Carga geral · AIS público</span><h3 className="forecast-title">Previsão e rastreamento · Berços 05–08</h3><p>Dados reais de `previsao_navios`, filtrados por carga geral.</p></div><div className="forecast-actions"><button type="button" className="forecast-refresh" onClick={loadShips} disabled={loading}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar dados</button>{canWrite && <button type="button" className="forecast-refresh" onClick={syncMarineTraffic} disabled={syncing}><Signal size={14} className={syncing ? 'animate-pulse' : ''} /> Sincronizar AIS</button>}</div></div>
    <div className="forecast-controls"><div className="forecast-berths" aria-label="Filtrar por berço">{BERTHS.map((value) => <button key={value} type="button" className={berth === value ? 'active' : ''} onClick={() => setBerth(value)}>{value === 'TODOS' ? value : `Berço ${value}`}</button>)}</div><label>Período<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7">Próximos 7 dias</option><option value="30">Próximos 30 dias</option><option value="all">Todos</option></select></label></div>
    {loading && <div className="forecast-state"><RefreshCw size={22} className="animate-spin" /> Consultando programação...</div>}
    {!loading && error && <div className="forecast-state forecast-error"><TriangleAlert size={18} /><span>{error}<small>Os dados fictícios foram removidos; verifique a sessão e a tabela no Supabase.</small></span></div>}
    {!loading && !filteredShips.length && !error && <div className="forecast-state"><CalendarClock size={18} /> Nenhum navio de carga geral programado para os berços 05, 06, 07 ou 08 no momento.</div>}
    {!loading && filteredShips.length > 0 && <div className="forecast-table-wrap"><table className="forecast-table forecast-table-expanded"><thead><tr><th>Status</th><th>Navio / IMO</th><th>Berço</th><th>Tipo de carga</th><th>Volume</th><th>ETA</th><th>ETD</th><th>Fonte</th><th /></tr></thead><tbody>{filteredShips.map((ship) => { const key = ship.id || ship.imo; const isOpen = expanded === key; const statusClass = ship.status.toLowerCase().replace(/ /g, '-').replace(/\//g, ''); return <tr key={key} className={isOpen ? 'forecast-open' : ''} onClick={() => setExpanded(isOpen ? null : key)}><td><span className={`ship-status status-${statusClass}`}>{ship.status}</span></td><td><button type="button" className="forecast-vessel"><Anchor size={14} /><span><strong>{ship.nomeNavio}</strong><small>IMO {ship.imo}</small></span><ChevronDown size={14} className="mobile-chevron" /></button></td><td><span className="berth-badge">{ship.bercoProgramado}</span></td><td>{ship.tipoCarga}</td><td>{formatTons(ship.quantidadeToneladas)}</td><td>{formatDate(ship.eta)}</td><td>{formatDate(ship.etd)}</td><td>{ship.fonteDados}</td><td><button type="button" className="forecast-map-button" onClick={(event) => { event.stopPropagation(); setSelected(ship); }}><Map size={14} /> Ver mapa</button></td></tr>; })}</tbody></table></div>}
    <p className="forecast-legend"><Signal size={13} /> AIS público depende da disponibilidade e cobertura da fonte.</p><a className="forecast-source" href="https://www.complexodopecem.br/" target="_blank" rel="noreferrer"><ExternalLink size={12} /> Consultar fonte pública da CIPP</a>
    {selected && <div className="forecast-modal-backdrop" role="presentation" onClick={() => setSelected(null)}><div className="forecast-drawer" role="dialog" aria-modal="true" aria-label={`Rastreamento de ${selected.nomeNavio}`} onClick={(event) => event.stopPropagation()}><button type="button" className="forecast-close" onClick={() => setSelected(null)} aria-label="Fechar"><X size={18} /></button><span className="module-kicker"><Map size={13} /> Rastreamento público</span><h3>{selected.nomeNavio}</h3><p>IMO {selected.imo} · posição {selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}</p><div className="forecast-drawer-grid"><span>Status<strong>{selected.status}</strong></span><span>Velocidade<strong>{selected.velocidadeNos.toFixed(1)} nós</strong></span><span>Berço<strong>{selected.bercoProgramado}</strong></span><span>Volume<strong>{formatTons(selected.quantidadeToneladas)}</strong></span></div>{canWrite && <label className="forecast-edit-field">Alterar berço<select value={selected.bercoProgramado} onChange={(event) => { const next = event.target.value as Berth; setSelected({ ...selected, bercoProgramado: next }); void changeBerth(selected, next); }}>{BERTHS.filter((value): value is Berth => value !== 'TODOS').map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}<a className="forecast-tracking-link" href={links(selected).marine} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir MarineTraffic</a><a className="forecast-tracking-link secondary" href={links(selected).vessel} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir VesselFinder</a></div></div>}
  </section>;
}
