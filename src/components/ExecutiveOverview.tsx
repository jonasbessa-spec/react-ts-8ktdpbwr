import type { CSSProperties } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Gauge,
  Layers3,
  Ship,
  Truck,
  Wrench,
} from 'lucide-react';

interface ExecutiveOverviewProps {
  totalCM: number;
  dispCM: number;
  totalSR: number;
  dispSR: number;
  totalPatio: number;
  dispPatio: number;
  conjuntosProntos: number;
  percCM: number;
  percSR: number;
  percPatio: number;
}

const formatDate = () =>
  new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

export default function ExecutiveOverview({
  totalCM,
  dispCM,
  totalSR,
  dispSR,
  totalPatio,
  dispPatio,
  conjuntosProntos,
  percCM,
  percSR,
  percPatio,
}: ExecutiveOverviewProps) {
  const readiness = Math.round((percCM + percSR + percPatio) / 3);
  const attention = [percCM, percSR, percPatio].filter((value) => value < 80).length;
  const status = readiness >= 80 ? 'Operação estável' : 'Atenção requerida';

  const metrics = [
    { label: 'CM disponíveis', value: dispCM, total: totalCM, icon: Truck, tone: 'cyan' },
    { label: 'SR disponíveis', value: dispSR, total: totalSR, icon: Layers3, tone: 'blue' },
    { label: 'Pátio disponível', value: dispPatio, total: totalPatio, icon: Wrench, tone: 'violet' },
  ];

  return (
    <section className="executive-overview" aria-label="Resumo executivo operacional">
      <div className="executive-hero">
        <div>
          <div className="executive-eyebrow"><span className="live-dot" /> Cockpit executivo <span>•</span> 24/7</div>
          <h2>Comando operacional do terminal</h2>
          <p>{formatDate()} · visão consolidada de frota, berços e produtividade marítima.</p>
        </div>
        <div className="executive-hero-status">
          <div className="status-icon"><Activity size={18} /></div>
          <div><span>Status da operação</span><strong>{status}</strong></div>
          <ArrowUpRight size={18} className="status-arrow" />
        </div>
      </div>

      <div className="executive-grid">
        <div className="executive-readiness">
          <div className="readiness-ring" style={{ '--progress': `${readiness * 3.6}deg` } as CSSProperties}>
            <div><strong>{readiness}%</strong><span>prontidão</span></div>
          </div>
          <div>
            <p className="executive-card-label">Índice de prontidão</p>
            <h3>{conjuntosProntos} <small>conjuntos aptos</small></h3>
            <p className="executive-muted">Capacidade imediata CM + SR para operação.</p>
          </div>
        </div>

        {metrics.map(({ label, value, total, icon: Icon, tone }) => {
          const percentage = total ? Math.round((value / total) * 100) : 0;
          return (
            <div className="executive-metric" key={label}>
              <div className={`metric-icon metric-${tone}`}><Icon size={18} /></div>
              <div className="metric-copy"><span>{label}</span><strong>{value}<small> / {total}</small></strong></div>
              <div className="metric-progress"><span style={{ width: `${percentage}%` }} /></div>
              <em>{percentage}% em condição operacional</em>
            </div>
          );
        })}
      </div>

      <div className="executive-footer">
        <span><Clock3 size={14} /> Atualização contínua via Supabase Realtime</span>
        <span className={attention ? 'attention-text' : 'healthy-text'}>
          {attention ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {attention ? `${attention} indicadores requerem atenção` : 'Todos os indicadores dentro do alvo'}
        </span>
        <span><Gauge size={14} /> Meta de prontidão: 80%</span>
        <span><Ship size={14} /> Operação marítima integrada</span>
      </div>
    </section>
  );
}
