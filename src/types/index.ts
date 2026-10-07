export interface OperationalDatabaseRow {
  id?: string;
  FROTA?: string | number | null;
  frota?: string | number | null;
  LOCALIZAÇÃO?: string | null;
  LOCALIZACAO?: string | null;
  localizacao?: string | null;
  TIPO?: string | null;
  tipo?: string | null;
  ATIVIDADE?: string | null;
  atividade?: string | null;
  STATUS?: string | null;
  status?: string | null;
  tag?: string | null;
  codigo?: string | null;
  bem?: string | null;
  categoria?: string | null;
  swl?: string | null;
  dias_parado?: number | null;
  observacao?: string | null;
  [column: string]: unknown;
}

export interface CavaloMecanico extends OperationalDatabaseRow {
  FROTA: string | number;
}

export interface SemiReboque extends OperationalDatabaseRow {
  FROTA: string | number;
}

export interface EquipamentoPatio extends OperationalDatabaseRow {
  bem: string;
  categoria: string;
  status: string;
}

export interface OperacaoPranchaRow extends OperationalDatabaseRow {
  operacao_id?: string;
  nome_navio?: string;
  imo_number?: string | null;
  berco_codigo?: string;
  tipo_operacao?: string;
  tipo_carga?: string;
  meta_prancha_ton_h?: number | null;
  prancha_realizada_ton_h?: number | null;
  prancha_real?: number | null;
  percentual_concluido?: number | null;
  horas_operadas?: number | null;
}

export interface ColaboradorRow extends OperationalDatabaseRow {
  nome?: string;
  matricula?: string;
  turno?: string;
  regime?: string;
  area?: string;
}

export interface FiltrosState {
  busca: string;
  localizacao: string;
  tipo: string;
}