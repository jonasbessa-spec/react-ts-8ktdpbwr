import { useCallback, useEffect, useMemo, useState } from 'react';
import { Anchor, CalendarClock, ChevronDown, ExternalLink, Map, RefreshCw, Ship, Signal, TriangleAlert, X } from 'lucide-react';

type Berth = '05' | '06' | '07' | '08';
type ShipStatus = 'PROGRAMADO' | 'AO LARGO / FUNDEADO' | 'EM OPERACAO' | 'CONCLUIDO';
interface ShipForecast {
  id?: string; nomeNavio: string; imo: string; mmsi?: string; tipoCarga: string; bercoProgramado: Berth; status: ShipStatus;
  eta: string; etd: string; agenciaMaritima: string; quantidadeToneladas: number; fonteDados: string; lat: number; lng: number; velocidadeNos: number;
}
interface ForecastResponse { ships?: Array<Partial<ShipForecast> & { cargaGeral?: string; bercoProgramado?: number }>; error?: string; }

const BERTHS: Array<'TODOS' | Berth> = ['TODOS', '05', '06', '07', '08'];
const PECEM = { lat: -3.56, lng: -38.81 };
const mockShips: ShipForecast[] = [
  { nomeNavio: 'MV Fortaleza Trader', imo: '9384512', tipoCarga: 'Carga Geral', bercoProgramado: '05', status: 'PROGRAMADO', eta: '2026-09-25T06:00:00-03:00', etd: '2026-09-27T18:00:00-03:00', agenciaMaritima: 'Ceará Marítima', quantidadeToneladas: 28500, fonteDados: 'Demonstração', lat: -3.38, lng: -38.72, velocidadeNos: 10.4 },
  { nomeNavio: 'MV Atlantic Cedar', imo: '9527810', tipoCarga: 'Carga Geral', bercoProgramado: '06', status: 'AO LARGO / FUNDEADO', eta: '2026-09-24T14:30:00-03:00', etd: '2026-09-26T20:00:00-03:00', agenciaMaritima: 'Pecém Shipping', quantidadeToneladas: 41200, fonteDados: 'Demonstração', lat: -3.62, lng: -38.86, velocidadeNos: 0.6 },
  { nomeNavio: 'MV Nordeste Star', imo: '9712048', tipoCarga: 'Carga Geral', bercoProgramado: '07', status: 'PROGRAMADO', eta: '2026-09-28T08:00:00-03:00', etd: '2026-09-30T22:00:00-03:00', agenciaMaritima: 'Mar Azul Agência', quantidadeToneladas: 33750, fonteDados: 'Demonstração', lat: -3.15, lng: -38.55, velocidadeNos: 12.2 },
  { nomeNavio: 'MV Ceará Pacific', imo: '9864201', tipoCarga: 'Carga Geral', bercoProgramado: '08', status: 'EM OPERACAO', eta: '2026-09-22T04:00:00-03:00', etd: '2026-09-24T23:00:00-03:00', agenciaMaritima: 'CIPP Operações', quantidadeToneladas: 19800, fonteDados: 'Demonstração', lat: -3.57, lng: -38.80, velocidadeNos: 0 },
  { nomeNavio: 'MV Guará Express', imo: '9456732', tipoCarga: 'Carga Geral', bercoProgramado: '05', status: 'PROGRAMADO', eta: '2026-10-02T11:00:00-03:00', etd: '2026-10-04T16:00:00-03:00', agenciaMaritima: 'Navega Ceará', quantidadeToneladas: 25600, fonteDados: 'Demonstração', lat: -3.82, lng: -39.03, velocidadeNos: 9.1 },
  { nomeNavio: 'MV Aracati Bulk', imo: '9603187', tipoCarga: 'Carga Geral', bercoProgramado: '07', status: 'PROGRAMADO', eta: '2026-10-05T07:30:00-03:00', etd: '2026-10-07T19:30:00-03:00', agenciaMaritima: 'Demonstração', quantidadeToneladas: 30100, fonteDados: 'Demonstração', lat: -3.24, lng: -38.64, velocidadeNos: 11.7 }
];

const normalizeShip = (ship: Partial<ShipForecast> & { cargaGeral?: string; bercoProgramado?: number }, index: number): ShipForecast => ({
  id: ship.id || `${ship.imo || 'cipp'}-${index}`, nomeNavio: ship.nomeNavio || 'Navio não informado', imo: ship.imo || 'Não informado', mmsi: ship.mmsi || '',
  tipoCarga: ship.tipoCarga || ship.cargaGeral || 'Carga Geral', bercoProgramado: String(ship.bercoProgramado || '05').padStart(2, '0') as Berth,
  status: ship.status || 'PROGRAMADO', eta: ship.eta || 'Não informado', etd: ship.etd || 'Não informado', agenciaMaritima: ship.agenciaMaritima || 'Não informado',
  quantidadeToneladas: Number(ship.quantidadeToneladas || 0), fonteDados: ship.fonteDados || 'CIPP Oficial', lat: Number(ship.lat || PECEM.lat), lng: Number(ship.lng || PECEM.lng), velocidadeNos: Number(ship.velocidadeNos || 0)
});
const formatDate = (value: string) => { if (!value || value === 'Não informado') return value; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date); };
const formatTons = (value: number) => value ? `${new Intl.NumberFormat('pt-BR').format(value)} t` : 'Não informado';
const links = (ship: ShipForecast) => ({ marine: `https://www.marinetraffic.com/en/ais/details/ships/imo:${encodeURIComponent(ship.imo)}`, vessel: `https://www.vesselfinder.com/vessels/details/${encodeURIComponent(ship.imo)}` });

export default function ShipBerthForecast() {
  const [ships, setShips] = useState<ShipForecast[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false); const [expanded, setExpanded] = useState<string | null>(null); const [selected, setSelected] = useState<ShipForecast | null>(null);
  const [berth, setBerth] = useState<'TODOS' | Berth>('TODOS'); const [period, setPeriod] = useState('30');
  const loadShips = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/ships', { headers: { Accept: 'application/json' } }); const payload = await response.json() as ForecastResponse;
      if (!response.ok) throw new Error(payload.error || 'A API da CIPP está indisponível.');
      setShips((payload.ships || []).map(normalizeShip).filter((ship) => ['05', '06', '07', '08'].includes(ship.bercoProgramado) && /CARGA GERAL/i.test(ship.tipoCarga))); setUsingMock(false);
    } catch (cause) { setShips(mockShips); setUsingMock(true); setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a CIPP.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadShips(); }, [loadShips]);
  const filteredShips = useMemo(() => { const cutoff = period === 'all' ? Infinity : Date.now() + Number(period) * 86400000; return ships.filter((ship) => { const eta = new Date(ship.eta).getTime(); return (berth === 'TODOS' || ship.bercoProgramado === berth) && (period === 'all' || Number.isNaN(eta) || eta <= cutoff); }); }, [berth, period, ships]);
  return <section className="ship-forecast-module" aria-label="Painel de previsão e rastreamento de navios">
    <div className="module-card-header forecast-heading"><div><span className="module-kicker"><Ship size={13} /> Carga geral · AIS público</span><h3 className="forecast-title">Previsão e rastreamento · Berços 05–08</h3><p>Lineup oficial cruzado com links públicos de rastreamento por IMO.</p></div><button type="button" className="forecast-refresh" onClick={loadShips} disabled={loading}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar dados</button></div>
    <div className="forecast-controls"><div className="forecast-berths" aria-label="Filtrar por berço">{BERTHS.map((value) => <button key={value} type="button" className={berth === value ? 'active' : ''} onClick={() => setBerth(value)}>{value === 'TODOS' ? value : `Berço ${value}`}</button>)}</div><label>Período<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7">Próximos 7 dias</option><option value="30">Próximos 30 dias</option><option value="all">Todos</option></select></label></div>
    {loading && <div className="forecast-state"><RefreshCw size={22} className="animate-spin" /> Consultando programação...</div>}
    {!loading && error && <div className="forecast-state forecast-error"><TriangleAlert size={18} /><span>{usingMock ? 'Fonte externa indisponível; exibindo 6 navios demonstrativos.' : error}<small>{error}</small></span></div>}
    {!loading && !filteredShips.length && <div className="forecast-state"><CalendarClock size={18} /> Nenhum navio encontrado para os filtros selecionados.</div>}
    {!loading && filteredShips.length > 0 && <div className="forecast-table-wrap"><table className="forecast-table forecast-table-expanded"><thead><tr><th>Status</th><th>Navio / IMO</th><th>Berço</th><th>Tipo de carga</th><th>Volume</th><th>ETA</th><th>ETD</th><th>Fonte</th><th /></tr></thead><tbody>{filteredShips.map((ship) => { const key = ship.id || ship.imo; const isOpen = expanded === key; const statusClass = ship.status.toLowerCase().replace(/ /g, '-').replace(/\//g, ''); return <tr key={key} className={isOpen ? 'forecast-open' : ''} onClick={() => setExpanded(isOpen ? null : key)}><td><span className={`ship-status status-${statusClass}`}>{ship.status}</span></td><td><button type="button" className="forecast-vessel"><Anchor size={14} /><span><strong>{ship.nomeNavio}</strong><small>IMO {ship.imo}</small></span><ChevronDown size={14} className="mobile-chevron" /></button></td><td><span className="berth-badge">{ship.bercoProgramado}</span></td><td>{ship.tipoCarga}</td><td>{formatTons(ship.quantidadeToneladas)}</td><td>{formatDate(ship.eta)}</td><td>{formatDate(ship.etd)}</td><td>{ship.fonteDados}</td><td><button type="button" className="forecast-map-button" onClick={(event) => { event.stopPropagation(); setSelected(ship); }}><Map size={14} /> Ver mapa</button></td></tr>; })}</tbody></table></div>}
    <p className="forecast-legend"><Signal size={13} /> {usingMock ? 'Dados demonstrativos: configure a fonte CIPP/AIS para dados operacionais.' : 'AIS público depende da disponibilidade e cobertura da fonte.'}</p><a className="forecast-source" href="https://www.complexodopecem.com.br/" target="_blank" rel="noreferrer"><ExternalLink size={12} /> Consultar fonte pública da CIPP</a>
    {selected && <div className="forecast-modal-backdrop" role="presentation" onClick={() => setSelected(null)}><div className="forecast-drawer" role="dialog" aria-modal="true" aria-label={`Rastreamento de ${selected.nomeNavio}`} onClick={(event) => event.stopPropagation()}><button type="button" className="forecast-close" onClick={() => setSelected(null)} aria-label="Fechar"><X size={18} /></button><span className="module-kicker"><Map size={13} /> Rastreamento público</span><h3>{selected.nomeNavio}</h3><p>IMO {selected.imo} · posição estimada {selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}</p><div className="forecast-drawer-grid"><span>Status<strong>{selected.status}</strong></span><span>Velocidade<strong>{selected.velocidadeNos.toFixed(1)} nós</strong></span><span>Berço<strong>{selected.bercoProgramado}</strong></span><span>Volume<strong>{formatTons(selected.quantidadeToneladas)}</strong></span></div><a className="forecast-tracking-link" href={links(selected).marine} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir MarineTraffic</a><a className="forecast-tracking-link secondary" href={links(selected).vessel} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir VesselFinder</a></div></div>}
  </section>;
}
