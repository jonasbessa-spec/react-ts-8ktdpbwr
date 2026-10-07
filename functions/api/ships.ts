interface Env {
  CIPP_SHIPS_URL?: string;
}

export interface CippShip {
  nomeNavio: string;
  imo: string | null;
  duv: string | null;
  cargaGeral: string;
  bercoProgramado: number | null;
  status: 'PROGRAMADO' | 'AO LARGO / FUNDEADO' | 'EM OPERACAO' | 'CONCLUIDO';
  eta: string | null;
  etd: string | null;
}

const DEFAULT_SOURCE =
  'https://sic-tos.complexodopecem.com.br/sictossite/pesquisa.aspx?WCI=relEmitirLineUpExt_002';
const ALLOWED_BERTHS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 10]);
const PAST_LINEUP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const FUTURE_LINEUP_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;
const CONTAINER_PATTERN = /CONTAINER|CONT[EÊ]INER|PORTA[-\s]?CONTEINER/;
const GENERAL_CARGO_PATTERN =
  /PLACA|ACO|SIDERURG|BREAKBULK|GENERAL CARGO|CARGA PROJETO|PROJETO|BOBINA|EOLIC|MINERIO|CARVAO|HULHA|GRAO|GRAOS|GRANEIS? SECOS?|MAQUINA|EQUIPAMENTO|FERRO|STEEL|CEMENT|CLINKER|GRANITO|PORFIRO|BASALTO|ARENITO|PEDRA|MARMORE/;
const LIQUID_CARGO_PATTERN =
  /\b(OIL|GAS|CHEMICAL|TANKER|PETROLEIRO|TANQUE|COMBUSTIVEL|NAFTA|GASOLINA|DIESEL|METANOL|AMONIA|OLEO)\b/;

const normalize = (value: string) =>
  decodeEntities(value)
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

function decodeEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    nbsp: ' ',
    quot: '"',
    lt: '<',
    gt: '>',
    ccedil: 'ç',
    Ccedil: 'Ç',
    atilde: 'ã',
    Atilde: 'Ã',
    otilde: 'õ',
    Otilde: 'Õ',
    aacute: 'á',
    Aacute: 'Á',
    eacute: 'é',
    Eacute: 'É',
    iacute: 'í',
    Iacute: 'Í',
    oacute: 'ó',
    Oacute: 'Ó',
    uacute: 'ú',
    Uacute: 'Ú',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      const point = Number.parseInt(code.slice(2), 16);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff && (point < 0xd800 || point > 0xdfff)
        ? String.fromCodePoint(point)
        : entity;
    }
    if (code.startsWith('#')) {
      const point = Number.parseInt(code.slice(1), 10);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff && (point < 0xd800 || point > 0xdfff)
        ? String.fromCodePoint(point)
        : entity;
    }
    return namedEntities[code] ?? entity;
  });
}

const cellsFromRow = (row: string) =>
  [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => normalize(match[1]));

const indexOfHeader = (headers: string[], patterns: RegExp[]) =>
  headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));

const parseStatus = (value: string): CippShip['status'] | null => {
  const status = normalize(value);
  if (/PROGRAMADO|PREVISTO/.test(status)) return 'PROGRAMADO';
  if (/AO LARGO|FUNDEADO/.test(status)) return 'AO LARGO / FUNDEADO';
  if (/OPERANDO|ATRACADO/.test(status)) return 'EM OPERACAO';
  if (/DESATRACADO|CONCLUIDO/.test(status)) return 'CONCLUIDO';
  return null;
};

const parseDate = (value: string): string | null => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:00-03:00`;
};

const parseBerth = (value: string): number | null => {
  const match = value.match(/\b(?:BERCO\s*)?0?(10|[1-8])\b/);
  if (!match) return null;
  const berth = Number(match[1]);
  return ALLOWED_BERTHS.has(berth) ? berth : null;
};

function isGeneralCargo(cargo: string): boolean {
  const normalized = normalize(cargo);
  if (!normalized || CONTAINER_PATTERN.test(normalized)) return false;
  if (LIQUID_CARGO_PATTERN.test(normalized) && !/CARGA PROJETO|PROJECT CARGO/.test(normalized)) return false;
  return GENERAL_CARGO_PATTERN.test(normalized);
}

export function parseShips(html: string): CippShip[] {
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  const ships: CippShip[] = [];

  for (const table of tables) {
    const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((match) => cellsFromRow(match[1]))
      .filter((cells) => cells.length > 0);
    const status = rows.map((cells) => parseStatus(cells.join(' '))).find(Boolean);
    if (!status) continue;

    const headerIndex = rows.findIndex((cells) =>
      cells.some((cell) => /^(NAVIO|EMBARCACAO)$/.test(cell)) &&
      cells.some((cell) => /^MERCADORIA$|^CARGA$/.test(cell)),
    );
    if (headerIndex < 0) continue;

    const headers = rows[headerIndex];
    const shipIndex = indexOfHeader(headers, [/^(NAVIO|EMBARCACAO)$/]);
    const imoIndex = indexOfHeader(headers, [/^IMO$/]);
    const duvIndex = indexOfHeader(headers, [/^DUV$/]);
    const cargoIndex = indexOfHeader(headers, [/^MERCADORIA$/, /^CARGA$/]);
    const berthIndex = indexOfHeader(headers, [/BERCO.*ATRACACAO/, /^BERCO$/, /^BERTH$/]);
    const etaIndex = indexOfHeader(headers, [/^CHEGADA$/, /^ETA$/]);
    const etdIndex = indexOfHeader(headers, [/^SAIDA$/, /^ETD$/]);

    for (const cells of rows.slice(headerIndex + 1)) {
      if (cells.length <= shipIndex || cells.length <= cargoIndex) continue;
      const name = cells[shipIndex];
      const cargo = cells[cargoIndex];
      if (!name || !cargo || headers.includes(name) || !isGeneralCargo(cargo)) continue;
      const rawImo = imoIndex >= 0 ? cells[imoIndex] : '';
      const imoDigits = rawImo.replace(/\D/g, '');
      ships.push({
        nomeNavio: name,
        imo: imoDigits.length === 7 ? imoDigits : null,
        duv: duvIndex >= 0 ? cells[duvIndex] || null : null,
        cargaGeral: cargo,
        bercoProgramado: berthIndex >= 0 ? parseBerth(cells[berthIndex] || '') : null,
        status,
        eta: etaIndex >= 0 ? parseDate(cells[etaIndex] || '') : null,
        etd: etdIndex >= 0 ? parseDate(cells[etdIndex] || '') : null,
      });
    }
  }
  return ships;
}

export function filterCurrentLineup(ships: CippShip[], now = Date.now()): CippShip[] {
  return ships.filter((ship) => {
    if (!ship.eta || ship.status === 'CONCLUIDO') return false;
    const eta = Date.parse(ship.eta);
    return Number.isFinite(eta) &&
      eta >= now - PAST_LINEUP_WINDOW_MS &&
      eta <= now + FUTURE_LINEUP_WINDOW_MS;
  });
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const sourceUrl = context.env.CIPP_SHIPS_URL || DEFAULT_SOURCE;
  try {
    const parsedSource = new URL(sourceUrl);
    if (parsedSource.protocol !== 'https:') {
      throw new Error('A fonte SIC-TOS deve usar HTTPS.');
    }
    const upstream = await fetch(parsedSource, {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'CIPP-Pecem-Operations/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok) throw new Error(`A fonte CIPP retornou HTTP ${upstream.status}.`);
    const ships = filterCurrentLineup(parseShips(await upstream.text()));
    return Response.json(
      { source: parsedSource.toString(), updatedAt: new Date().toISOString(), count: ships.length, ships },
      { headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Não foi possível consultar a programação da CIPP.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
