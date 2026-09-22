export interface CavaloMecanico {
  id?: string;
  FROTA: string;
  LOCALIZAÇÃO?: string;
  TIPO?: string;
  ATIVADE?: string;
  ATIVIDADE?: string;
  'QNT. EIXOS'?: string;
  STATUS?: string;
  [key: string]: any;
}

export interface SemiReboque {
  id?: string;
  FROTA: string;
  LOCALIZAÇÃO?: string;
  TIPO?: string;
  ATIVIDADE?: string;
  'QNT. EIXOS'?: string;
  STATUS?: string;
  [key: string]: any;
}

export interface FiltrosState {
  busca: string;
  localizacao: string;
  tipo: string;
}