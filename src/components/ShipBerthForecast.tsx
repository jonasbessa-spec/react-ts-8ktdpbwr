import { useCallback, useEffect, useState } from 'react';
import { Anchor, CalendarClock, ChevronDown, ExternalLink, RefreshCw, Ship, TriangleAlert } from 'lucide-react';

interface ShipForecast {
  nomeNavio: string;
  imo: string;
  cargaGeral: string;
  bercoProgramado: number;
  eta: string;
  etd: string;
}

interface ForecastResponse {
  ships?: ShipForecast[];
  error?: string;
}

export default function ShipBerthForecast() {
  const [ships, setShips] = useState<ShipForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadShips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ships', { headers: { Accept: 'application/json' } });
      const payload = (await response.json()) as ForecastResponse;
      if (!response.ok) throw new Error(payload.error || 'A API de programação está indisponível.');
      setShips(payload.ships || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar os navios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadShips(); }, [loadShips]);

  return (
    <section className="ship-forecast-module" aria-label="Previsão de navios nos berços 5 a 8">
      <div className="module-card-header">
        <div>
          <span className="module-kicker"><Ship size={13} /> Fonte CIPP · filtro estrito</span>
          <h3 className="forecast-title">Previsão de navios · Berços 5–8</h3>
          <p>Somente status PROGRAMADO e berços de atracação 5, 6, 7 ou 8.</p>
        </div>
        <button type="button" className="forecast-refresh" onClick={loadShips} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar dados
        </button>
      </div>

      {loading && <div className="forecast-state"><RefreshCw size={22} className="animate-spin" /> Consultando programação da CIPP...</div>}
      {error && <div className="forecast-state forecast-error"><TriangleAlert size={18} /><span>{error}<small>Verifique a disponibilidade da fonte CIPP e tente novamente.</small></span></div>}
      {!loading && !error && !ships.length && <div className="forecast-state"><CalendarClock size={18} /> Nenhum navio PROGRAMADO nos berços 5–8 foi retornado.</div>}

      {!loading && !error && ships.length > 0 && (
        <div className="forecast-table-wrap">
          <table className="forecast-table">
            <thead><tr><th>Navio</th><th>IMO</th><th>Carga geral</th><th>Berço</th><th>ETA</th><th>ETD</th></tr></thead>
            <tbody>{ships.map((ship) => {
              const key = `${ship.imo}-${ship.nomeNavio}`;
              const isOpen = expanded === key;
              return <tr key={key} onClick={() => setExpanded(isOpen ? null : key)} className={isOpen ? 'forecast-open' : ''}>
                <td><button type="button" className="forecast-vessel"><Anchor size={14} /><span><strong>{ship.nomeNavio}</strong><small>PROGRAMADO</small></span><ChevronDown size={14} className="mobile-chevron" /></button></td>
                <td className="forecast-desktop-cell">{ship.imo}</td><td className="forecast-desktop-cell">{ship.cargaGeral}</td>
                <td><span className="berth-badge">{ship.bercoProgramado}</span></td>
                <td className={isOpen ? 'forecast-detail-open' : ''}><span className="forecast-label">ETA</span>{ship.eta}</td>
                <td className={isOpen ? 'forecast-detail-open' : ''}><span className="forecast-label">ETD</span>{ship.etd}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
      <a className="forecast-source" href="https://www.complexodopecem.com.br/" target="_blank" rel="noreferrer"><ExternalLink size={12} /> Consultar fonte pública da CIPP</a>
    </section>
  );
}

