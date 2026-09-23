const SOURCE_URL = 'http://sic-tos.complexodopecem.br/sictossite/pesquisa.aspx?WCI=relEmitirLineUpExt_002';
const ALLOWED_BERTHS = new Set([5, 6, 7, 8]);

const clean = (value) => value.replace(/&nbsp;|&#160;/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const normalize = (value) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const cellsFromRow = (row) => [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => clean(match[1]));
const findHeader = (headers, patterns) => headers.findIndex((header) => patterns.some((pattern) => pattern.test(normalize(header))));

function parseShips(html) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => cellsFromRow(match[1])).filter((cells) => cells.length >= 4);
  const header = rows.find((cells) => cells.some((cell) => /STATUS|BERCO|NAVIO|IMO/i.test(normalize(cell))));
  if (!header) return [];
  const headers = header.map(normalize);
  const ship = findHeader(headers, [/NOME.*NAVIO/, /^NAVIO$/, /EMBARCACAO/]);
  const imo = findHeader(headers, [/^IMO$/, /IMO/]);
  const cargo = findHeader(headers, [/CARGA/, /MERCADORIA/]);
  const berth = findHeader(headers, [/BERCO.*ATRACACAO/, /^BERCO$/, /BERTH/]);
  const eta = findHeader(headers, [/^ETA$/, /PREV.*CHEGADA/, /ESTIMATIVA.*CHEGADA/]);
  const etd = findHeader(headers, [/^ETD$/, /PREV.*SAIDA/, /ESTIMATIVA.*SAIDA/]);
  const status = findHeader(headers, [/^STATUS$/, /SITUACAO/]);
  if ([ship, berth, status].some((index) => index < 0)) return [];
  return rows.slice(rows.indexOf(header) + 1).flatMap((cells) => {
    const berthMatch = cells[berth].match(/\b([5-8])\b/);
    const berthNumber = berthMatch ? Number(berthMatch[1]) : NaN;
    if (!ALLOWED_BERTHS.has(berthNumber) || normalize(cells[status]) !== 'PROGRAMADO') return [];
    return [{
      nomeNavio: cells[ship] || 'Não informado',
      imo: imo >= 0 ? cells[imo] || 'Não informado' : 'Não informado',
      cargaGeral: cargo >= 0 ? cells[cargo] || 'Não informado' : 'Não informado',
      bercoProgramado: berthNumber,
      eta: eta >= 0 ? cells[eta] || 'Não informado' : 'Não informado',
      etd: etd >= 0 ? cells[etd] || 'Não informado' : 'Não informado',
    }];
  });
}

async function shipsResponse() {
  try {
    const response = await fetch(SOURCE_URL, {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'CIPP-Pecem-Operations/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`A fonte CIPP retornou HTTP ${response.status}.`);
    const ships = parseShips(await response.text());
    return Response.json({ source: SOURCE_URL, updatedAt: new Date().toISOString(), count: ships.length, ships });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Não foi possível consultar a programação da CIPP.' }, { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ships') return shipsResponse();
    return env.ASSETS.fetch(request);
  },
};
