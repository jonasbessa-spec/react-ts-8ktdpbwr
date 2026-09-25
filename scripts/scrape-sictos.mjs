import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';

export const DEFAULT_SICTOS_URL =
  'https://sic-tos.complexodopecem.com.br/sictossite/pesquisa.aspx?WCI=relEmitirLineUpExt_002';
const ALLOWED_BERTHS = new Set(['01', '02', '03', '04', '05', '06', '07', '08', '10']);
const CONTAINER_PATTERN = /container|cont[eê]iner|porta[-\s]?cont[eê]iner/i;
const GENERAL_CARGO_PATTERN = /placa|aço|siderúrg|breakbulk|general cargo|carga projeto|projeto|bobina|eólic|minério|carvão|hulha|granéis? secos?|máquina|equipamento|ferro|steel|cement|clinker/i;
const LIQUID_BULK_PATTERN = /oil|gas|chemical|tanker|petroleiro|tanque|combustível|nafta|gasolina|diesel|metanol|amônia|óleo/i;

const normalize = (value = '') =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();

export function mapStatus(value = '') {
  const status = normalize(value);
  if (/PROGRAMADO|PREVISTO/.test(status)) return 'PROGRAMADO';
  if (/AO LARGO|FUNDEADO/.test(status)) return 'AO LARGO / FUNDEADO';
  if (/OPERANDO|ATRACADO/.test(status)) return 'EM OPERACAO';
  if (/DESATRACADO|CONCLUIDO/.test(status)) return 'CONCLUIDO';
  return null;
}

const parseDate = (value) => {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:00-03:00`;
};

export function filterAndMapShips(rows) {
  return rows.flatMap((row) => {
    const berth = String(row.berco || '').match(/(?:BERCO|BERÇO)?\s*0?([5-8])\b/i)?.[1];
    const normalizedBerth = berth ? berth.padStart(2, '0') : '';
    const status = mapStatus(row.status);
    const cargo = String(row.tipoCarga || '').trim();
    const imo = String(row.imo || '').replace(/\D/g, '');
    if (!row.nomeNavio || !imo || !status || !GENERAL_CARGO_PATTERN.test(cargo) || CONTAINER_PATTERN.test(cargo)) return [];
    if (LIQUID_BULK_PATTERN.test(cargo) && !/carga\s+projeto|project\s+cargo/i.test(cargo)) return [];
    const eta = parseDate(row.eta);
    if (!eta) return [];
    return [{
      nome_navio: row.nomeNavio.trim(),
      imo,
      tipo_carga: cargo || 'Carga Geral',
      berco_programado: normalizedBerth || null,
      status,
      eta,
      etd: parseDate(row.etd),
      fonte_dados: 'SIC-TOS Oficial CIPP',
      atualizado_em: new Date().toISOString(),
    }];
  });
}

async function extractRows(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('table')).flatMap((table) => {
    const status = table.querySelector('thead tr:first-child th')?.textContent?.trim() || '';
    const headers = Array.from(table.querySelectorAll('thead tr:last-child th')).map((cell) => cell.textContent?.trim() || '');
    return Array.from(table.querySelectorAll('tbody tr')).map((row) => {
      const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() || '');
      const value = (pattern) => cells[headers.findIndex((header) => pattern.test(header.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()))] || '';
      return {
        nomeNavio: value(/NAVIO/),
        imo: value(/^IMO$/),
        berco: value(/BERCO|BERÇO/),
        tipoCarga: value(/MERCADORIA|CARGA/),
        status,
        eta: value(/CHEGADA|ETA/),
        etd: value(/SAIDA|SAÍDA|ETD/),
      };
    });
  }));
}

export async function runSicTosScraper({
  sourceUrl = process.env.SICTOS_URL || DEFAULT_SICTOS_URL,
  supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  executablePath = process.env.PUPPETEER_EXECUTABLE_PATH,
} = {}) {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.goto(sourceUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    const rawRows = await extractRows(page);
    const ships = filterAndMapShips(rawRows);
    if (ships.length) {
      const { error } = await supabase.from('previsao_navios').upsert(ships, { onConflict: 'imo' });
      if (error) throw error;
    }
    return { success: true, totalExtracted: rawRows.length, totalEligible: ships.length, ships };
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSicTosScraper()
    .then((result) => { console.log(JSON.stringify(result, null, 2)); })
    .catch((error) => { console.error('Erro no scraping do SIC-TOS:', error); process.exitCode = 1; });
}
