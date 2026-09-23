interface Env {
  CIPP_SHIPS_URL?: string;
}

interface ShipForecast {
  nomeNavio: string;
  imo: string;
  cargaGeral: string;
  bercoProgramado: number;
  eta: string;
  etd: string;
}

const DEFAULT_SOURCE =
  'http://s2gpr.sefaz.ce.gov.br/licita-web/paginas/licita/PublicacaoList.seam';
const ALLOWED_BERTHS = new Set([5, 6, 7, 8]);

const clean = (value: string) =>
  value.replace(/&nbsp;|&#160;/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const normalize = (value: string) =>
  clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

const cellsFromRow = (row: string) =>
  [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => clean(match[1]));

const indexOfHeader = (headers: string[], patterns: RegExp[]) =>
  headers.findIndex((header) => patterns.some((pattern) => pattern.test(normalize(header))));

function parseShips(html: string): ShipForecast[] {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => cellsFromRow(match[1]))
    .filter((cells) => cells.length >= 4);
  const headerRow = rows.find((cells) => cells.some((cell) => /STATUS|BERCO|NAVIO|IMO/i.test(normalize(cell))));
  if (!headerRow) return [];

  const headers = headerRow.map(normalize);
  const rowsAfterHeader = rows.slice(rows.indexOf(headerRow) + 1);
  const shipIndex = indexOfHeader(headers, [/NOME.*NAVIO/, /^NAVIO$/, /EMBARCACAO/]);
  const imoIndex = indexOfHeader(headers, [/^IMO$/, /IMO/]);
  const cargoIndex = indexOfHeader(headers, [/CARGA/, /MERCADORIA/]);
  const berthIndex = indexOfHeader(headers, [/BERCO.*ATRACACAO/, /^BERCO$/, /BERTH/]);
  const etaIndex = indexOfHeader(headers, [/^ETA$/, /PREV.*CHEGADA/, /ESTIMATIVA.*CHEGADA/]);
  const etdIndex = indexOfHeader(headers, [/^ETD$/, /PREV.*SAIDA/, /ESTIMATIVA.*SAIDA/]);
  const statusIndex = indexOfHeader(headers, [/^STATUS$/, /SITUACAO/]);

  if ([shipIndex, berthIndex, statusIndex].some((index) => index < 0)) return [];

  return rowsAfterHeader.flatMap((cells) => {
    const berthMatch = cells[berthIndex].match(/\b([5-8])\b/);
    const berth = berthMatch ? Number(berthMatch[1]) : NaN;
    if (!ALLOWED_BERTHS.has(berth) || normalize(cells[statusIndex]) !== 'PROGRAMADO') return [];
    return [{
      nomeNavio: cells[shipIndex] || 'Não informado',
      imo: imoIndex >= 0 ? cells[imoIndex] || 'Não informado' : 'Não informado',
      cargaGeral: cargoIndex >= 0 ? cells[cargoIndex] || 'Não informado' : 'Não informado',
      bercoProgramado: berth,
      eta: etaIndex >= 0 ? cells[etaIndex] || 'Não informado' : 'Não informado',
      etd: etdIndex >= 0 ? cells[etdIndex] || 'Não informado' : 'Não informado',
    }];
  });
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const sourceUrl = context.env.CIPP_SHIPS_URL || DEFAULT_SOURCE;
  try {
    const upstream = await fetch(sourceUrl, {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'CIPP-Pecem-Operations/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok) throw new Error(`A fonte CIPP retornou HTTP ${upstream.status}.`);
    const ships = parseShips(await upstream.text());
    return Response.json({ source: sourceUrl, updatedAt: new Date().toISOString(), count: ships.length, ships });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Não foi possível consultar a programação da CIPP.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

