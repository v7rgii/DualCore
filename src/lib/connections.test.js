// Pruebas de la búsqueda con transbordo. Se ejecutan con `npm test`.
// Usan un horario inventado y pequeño con la misma forma que public/data/timetable.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_CHANGE_OTHER_STATION, MIN_CHANGE_SAME_STATION, searchConnections, searchTrains } from './timetable.js';

const st = (name, city, lon, lat) => ({ id: name, name, city, lon, lat });
// Todos los días: «d» con todos los bits a 1.
const everyDay = 'f'.repeat(8);
const train = (n, t, stops) => ({ n, t, s: stops, d: everyDay });
const h = (hh, mm = 0) => hh * 60 + mm;

const tt = {
  base: '2026-11-20',
  days: 30,
  types: ['AVE', 'Regional'],
  stations: [
    st('Granada', 'Granada', -3.6, 37.18), // 0
    st('Madrid-Atocha', 'Madrid', -3.69, 40.41), // 1
    st('Madrid-Chamartín', 'Madrid', -3.68, 40.47), // 2
    st('Santiago', 'Santiago', -8.54, 42.87), // 3
    st('Córdoba', 'Córdoba', -4.79, 37.89), // 4
  ],
  trains: [
    // Granada → Córdoba → Atocha, llega a las 11:00
    train('100', 0, [[0, h(8), h(8)], [4, h(9), h(9, 2)], [1, h(11), h(11)]]),
    // Atocha → Santiago a las 11:10 (solo 10 min: no da tiempo)
    train('200', 0, [[1, h(11, 10), h(11, 10)], [3, h(14), h(14)]]),
    // Atocha → Santiago a las 11:30 (30 min en la misma estación: vale)
    train('201', 0, [[1, h(11, 30), h(11, 30)], [3, h(14, 30), h(14, 30)]]),
    // Chamartín → Santiago a las 11:40 (cambio de estación con 40 min: no da tiempo)
    train('300', 1, [[2, h(11, 40), h(11, 40)], [3, h(15), h(15)]]),
    // Chamartín → Santiago a las 12:30 (cambio de estación con 90 min: vale, pero llega más tarde que el 201)
    train('301', 1, [[2, h(12, 30), h(12, 30)], [3, h(16), h(16)]]),
  ],
};

test('sin tren directo, searchTrains no encuentra nada', () => {
  assert.equal(searchTrains(tt, [0], [3], '2026-11-21').length, 0);
});

test('transbordo: respeta el tiempo mínimo y se queda con la mejor opción', () => {
  const r = searchConnections(tt, [0], [3], '2026-11-21');
  assert.equal(MIN_CHANGE_SAME_STATION, 15);
  assert.equal(r.length, 1, JSON.stringify(r.map((x) => x.number)));
  const [best] = r;
  assert.equal(best.number, '100 + 201');
  assert.equal(best.dep, h(8));
  assert.equal(best.arr, h(14, 30));
  assert.deepEqual(best.transfer, { at: 'Madrid-Atocha', to: 'Madrid-Atocha', wait: 30, sameStation: true });
  assert.equal(best.legs.length, 2);
  assert.equal(best.stationKm, best.legs[0].stationKm + best.legs[1].stationKm);
});

test('cambio de estación en la misma ciudad, con más margen', () => {
  // Sin el 201, la única opción buena es cambiar a Chamartín con 90 min (el 300 no da tiempo).
  const without201 = { ...tt, trains: tt.trains.filter((t) => t.n !== '201' && t.n !== '200') };
  const [r] = searchConnections(without201, [0], [3], '2026-11-21');
  assert.equal(MIN_CHANGE_OTHER_STATION, 60);
  assert.equal(r.number, '100 + 301');
  assert.equal(r.transfer.sameStation, false);
  assert.equal(r.transfer.to, 'Madrid-Chamartín');
});

test('tarifas: con un tren de tarifa única, el billete combinado es la suma de los dos', () => {
  const without201 = { ...tt, trains: tt.trains.filter((t) => t.n !== '201' && t.n !== '200') };
  const [r] = searchConnections(without201, [0], [3], '2026-11-21');
  assert.equal(r.fares.length, 1);
  assert.equal(r.fares[0].label, 'Combinado');
  const sum = r.legs[0].fares[0].price + r.legs[1].fares[0].price;
  assert.ok(Math.abs(r.fares[0].price - sum) < 0.051);
});

test('fuera del calendario no hay resultados', () => {
  assert.deepEqual(searchConnections(tt, [0], [3], '2030-01-01'), []);
});
