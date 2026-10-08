import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  assignTentativeBerths,
  getCollaboratorFallback,
  normalizeCollaborators,
  UNILINK_COLLABORATORS_KEY,
} from './sgoData.ts';

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

test('maps hybrid Unilink collaborator fields and defaults missing status to active', () => {
  const [collaborator] = normalizeCollaborators([
    { id: 9, colaborador: 'Ana Souza', funcao: 'Supervisora', escala: 'Turno B' },
  ], 'supabase');

  assert.equal(collaborator.nome, 'Ana Souza');
  assert.equal(collaborator.cargo, 'Supervisora');
  assert.equal(collaborator.turno, 'Turno B');
  assert.equal(collaborator.status, 'Ativo');
});

test('uses Unilink localStorage records or five clearly marked demo records', () => {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };

  const sample = getCollaboratorFallback();
  assert.equal(sample.collaborators.length, 5);
  assert.equal(sample.source, 'demonstração');

  values.set(UNILINK_COLLABORATORS_KEY, JSON.stringify([{ id: '1', name: 'Unilink person', shift: 'B' }]));
  const cached = getCollaboratorFallback();
  assert.equal(cached.source, 'cache local');
  assert.equal(cached.collaborators[0].nome, 'Unilink person');
});

test('allocates pending ships by ETA without overlapping berth bookings', () => {
  const start = Date.parse('2026-10-08T12:00:00.000Z');
  const assigned = assignTentativeBerths([
    { id: 'late', berco_programado: 'PENDENTE', berco_atribuicao_automatica: false, tipo_carga: 'Carga geral', eta: new Date(start + 12 * 3600000).toISOString(), etd: null },
    { id: 'early', berco_programado: null, berco_atribuicao_automatica: false, tipo_carga: 'Granel', eta: new Date(start).toISOString(), etd: new Date(start + 24 * 3600000).toISOString() },
    { id: 'confirmed', berco_programado: '08', tipo_carga: 'Carga geral', eta: new Date(start).toISOString(), etd: new Date(start + 48 * 3600000).toISOString() },
  ]);
  const byId = new Map(assigned.map((ship) => [ship.id, ship]));

  assert.equal(byId.get('early').berco_programado, '01');
  assert.equal(byId.get('early').berco_atribuicao_automatica, true);
  assert.notEqual(byId.get('late').berco_programado, byId.get('early').berco_programado);
  assert.equal(byId.get('confirmed').berco_programado, '08');
  assert.equal(byId.get('confirmed').berco_atribuicao_automatica, false);
});
