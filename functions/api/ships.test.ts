import assert from 'node:assert/strict';
import test from 'node:test';
import { filterCurrentLineup, parseShips } from './ships.ts';

const lineup = `
  <table>
    <tr><th colspan="9">PROGRAMADO</th></tr>
    <tr><th>Navio</th><th>Nº Programação</th><th>DUV</th><th>Chegada</th><th>Serviço</th><th>Armador</th><th>Agência</th><th>Mercadoria</th><th>Confirmada Atracação</th></tr>
    <tr><td>STAR NAVARRA</td><td>16012</td><td>461882026</td><td>02/10/2026 12:00</td><td></td><td>G2 OCEAN AS</td><td>ORION RODOS</td><td>PLACA DE AÇO (SLAB)</td><td>SIM</td></tr>
    <tr><td>JAPIN ARROW</td><td>16009</td><td>460342026</td><td>02/10/2026 01:00</td><td></td><td>G2 OCEAN AS</td><td>ORION RODOS</td><td>GRANITO E OUTRAS PEDRAS DE CANTARIA</td><td>SIM</td></tr>
    <tr><td>CONTAINER TEST</td><td>16010</td><td>460352026</td><td>03/10/2026 01:00</td><td></td><td>LINE</td><td>AGENCY</td><td>CONTÊINERES</td><td>SIM</td></tr>
  </table>
  <table>
    <tr><th colspan="9">ATRACADO</th></tr>
    <tr><th>Navio</th><th>Nº Programação</th><th>DUV</th><th>Chegada</th><th>Serviço</th><th>Armador</th><th>Agência</th><th>Mercadoria</th><th>Confirmada Atracação</th></tr>
    <tr><td>Vessel &amp; Cargo</td><td>16011</td><td>460362026</td><td>04/10/2026 09:30</td><td></td><td>ARMADOR</td><td>AGENCY</td><td>CARGA PROJETO</td><td>SIM</td></tr>
  </table>`;

test('parses status groups and carga geral while leaving absent berth and IMO pending', () => {
  const ships = parseShips(lineup);
  assert.equal(ships.length, 3);
  assert.deepEqual(
    ships.map(({ nomeNavio, status, imo, duv, bercoProgramado }) =>
      ({ nomeNavio, status, imo, duv, bercoProgramado })),
    [
      { nomeNavio: 'STAR NAVARRA', status: 'PROGRAMADO', imo: null, duv: '461882026', bercoProgramado: null },
      { nomeNavio: 'JAPIN ARROW', status: 'PROGRAMADO', imo: null, duv: '460342026', bercoProgramado: null },
      { nomeNavio: 'VESSEL & CARGO', status: 'EM OPERACAO', imo: null, duv: '460362026', bercoProgramado: null },
    ],
  );
  assert.equal(ships[0].eta, '2026-10-02T12:00:00-03:00');
});

test('filters container cargo and excludes unsupported status/cargo tables', () => {
  const html = `
    <table>
      <tr><th>PROGRAMADO</th></tr>
      <tr><th>Navio</th><th>DUV</th><th>Chegada</th><th>Mercadoria</th></tr>
      <tr><td>Container Vessel</td><td>1</td><td>02/10/2026 12:00</td><td>CONTÊINERES</td></tr>
      <tr><td>Oil Vessel</td><td>2</td><td>02/10/2026 12:00</td><td>ÓLEO DIESEL</td></tr>
    </table>`;
  assert.deepEqual(parseShips(html), []);
});

test('parses a berth only when the lineup supplies an allowed berth column', () => {
  const html = `
    <table>
      <tr><th>PROGRAMADO</th></tr>
      <tr><th>Navio</th><th>Berço</th><th>Chegada</th><th>Mercadoria</th></tr>
      <tr><td>Steel Vessel</td><td>Berço 05</td><td>02/10/2026 12:00</td><td>PLACAS DE AÇO</td></tr>
      <tr><td>Invalid Berth</td><td>Berço 09</td><td>02/10/2026 12:00</td><td>PLACAS DE AÇO</td></tr>
    </table>`;
  assert.deepEqual(parseShips(html).map(({ bercoProgramado }) => bercoProgramado), [5, null]);
});

test('filters historical, completed, and excessively distant lineup entries', () => {
  const now = Date.parse('2026-10-01T00:00:00Z');
  const [current] = parseShips(lineup);
  assert.ok(current);

  const ships = filterCurrentLineup([
    current,
    { ...current, eta: '2017-08-26T19:20:00-03:00' },
    { ...current, eta: '2026-10-02T12:00:00-03:00', status: 'CONCLUIDO' },
    { ...current, eta: '2027-04-01T12:00:00-03:00' },
  ], now);

  assert.deepEqual(ships, [current]);
});
