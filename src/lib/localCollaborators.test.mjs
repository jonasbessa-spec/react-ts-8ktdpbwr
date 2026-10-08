import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  initializeLocalCollaborators,
  LOCAL_COLLABORATORS_KEY,
  parseCollaboratorCsv,
  saveLocalCollaborators,
} from './localCollaborators.ts';

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

test('seeds three demo collaborators and persists updates in localStorage', () => {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };

  const initial = initializeLocalCollaborators();
  assert.equal(initial.collaborators.length, 3);
  assert.equal(initial.persistenceAvailable, true);
  assert.equal(initial.collaborators[0].nome, 'Carlos Silva');
  assert.equal(JSON.parse(values.get(LOCAL_COLLABORATORS_KEY)).length, 3);

  const changed = [...initial.collaborators, { ...initial.collaborators[0], id: '4', nome: 'Nova pessoa' }];
  saveLocalCollaborators(changed);
  assert.equal(initializeLocalCollaborators().collaborators.length, 4);
});

test('imports quoted CSV cells, normalized headers, and Brazilian dates', () => {
  const rows = parseCollaboratorCsv(`Nome;CPF;Cargo;Turno;Data de admissão;Início do período aquisitivo;Fim do período concessivo
"Silva, Carlos";123.456;Operador;Turno A;15/03/2022;15/03/2025;15/12/2026`);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].nome, 'Silva, Carlos');
  assert.equal(rows[0].data_admissao, '2022-03-15');
  assert.equal(rows[0].fim_periodo_concessivo, '2026-12-15');
});
