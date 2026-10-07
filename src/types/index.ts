export type UserRole = 'admin' | 'gestor' | 'operador' | 'visualizador';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  nome?: string;
  created_at?: string;
}

export interface NavioPrevisao {
  id: string;
  nome_navio: string;
  imo?: string;
  berco_previsto?: string;
  berco_atual?: string;
  data_chegada?: string;
  data_atracacao?: string;
  data_desatracacao?: string;
  status: 'previsto' | 'atracado' | 'fundeado' | 'concluido' | 'pendente';
  carga?: string;
  quantidade_toneladas?: number;
  operador?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}