/**
 * Buscador de trenes sobre los horarios oficiales de Renfe (public/data/timetable.json).
 * Los horarios son reales; los precios son ORIENTATIVOS (Renfe no los publica en abierto).
 */

import { normalize } from './text.js';
import { routeKm } from './mapGeometry.js';

let cache = null;
export function loadTimetable() {
  cache ??= fetch('/data/timetable.json')
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    })
    .then(prepare);
  cache.catch(() => (cache = null));
  return cache;
}


/** Prepara las opciones del buscador: cada estación y, si una ciudad tiene varias, "Ciudad (todas)". */
function prepare(tt) {
  const served = new Map();
  for (const train of tt.trains) for (const [si] of train.s) served.set(si, (served.get(si) ?? 0) + 1);

  const byCity = new Map();
  tt.stations.forEach((st, i) => {
    if (!served.has(i)) return;
    if (!byCity.has(st.city)) byCity.set(st.city, []);
    byCity.get(st.city).push(i);
  });

  const options = [];
  for (const [city, ids] of byCity) {
    const weight = ids.reduce((sum, i) => sum + served.get(i), 0);
    if (ids.length > 1) {
      options.push({ key: `city:${city}`, label: `${city} (todas)`, sub: `${ids.length} estaciones`, ids, weight: weight + 1 });
    }
    for (const i of ids) {
      const name = tt.stations[i].name;
      options.push({ key: `st:${i}`, label: name, sub: name === city ? 'Estación' : city, ids: [i], weight: served.get(i) });
    }
  }
  options.forEach((o) => (o.search = normalize(o.label)));
  options.sort((a, b) => a.label.localeCompare(b.label, 'es'));

  const maxDate = addDays(tt.base, tt.days - 1);
  return { ...tt, options, maxDate };
}

/**
 * Convierte un nombre de estación del mapa (p. ej. «Sevilla-Santa Justa») en una opción del buscador.
 * Si la ciudad tiene varias estaciones se elige «Ciudad (todas)» para encontrar más trenes.
 */
export function findStationOption(tt, name) {
  if (!name) return null;
  const q = normalize(name).trim();
  if (!q) return null;
  // 1) nombre exacto · 2) nombre que empieza igual · 3) misma ciudad («Sevilla-Santa Justa» → Sevilla).
  const station =
    tt.stations.find((s) => normalize(s.name) === q) ??
    tt.stations.find((s) => normalize(s.name).startsWith(q)) ??
    tt.stations.find((s) => s.city && q.startsWith(normalize(s.city)));
  if (!station) return null;
  return (
    tt.options.find((o) => o.key === `city:${station.city}`) ??
    tt.options.find((o) => o.ids.length === 1 && tt.stations[o.ids[0]] === station) ??
    null
  );
}

export function filterOptions(options, text, limit = 8) {
  const q = normalize(text.trim());
  if (!q) return [...options].sort((a, b) => b.weight - a.weight).slice(0, limit);
  const starts = [];
  const contains = [];
  for (const o of options) {
    if (o.search.startsWith(q)) starts.push(o);
    else if (o.search.includes(q)) contains.push(o);
  }
  const byWeight = (a, b) => b.weight - a.weight;
  return [...starts.sort(byWeight), ...contains.sort(byWeight)].slice(0, limit);
}

// ---------- Fechas ----------

const toUtc = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
export const addDays = (iso, n) => new Date(toUtc(iso) + n * 86400000).toISOString().slice(0, 10);
export const dayIndex = (tt, iso) => Math.round((toUtc(iso) - toUtc(tt.base)) / 86400000);

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function runsOn(train, day) {
  const v = parseInt(train.d[day >> 2], 16);
  return ((v >> (day & 3)) & 1) === 1;
}

// ---------- Precios orientativos ----------

const RATE_PER_KM = {
  AVE: 0.095,
  'AVE Euromed': 0.085,
  AVLO: 0.05,
  AVANT: 0.075,
  'AVANT EXP': 0.08,
  Intercity: 0.07,
  Regional: 0.062,
};

const FARES = {
  full: [
    { id: 'basico', label: 'Básico', mult: 1, perks: ['Asiento asignado', 'Equipaje de mano'] },
    { id: 'elige', label: 'Elige', mult: 1.32, perks: ['Elige tu asiento', 'Cambios con descuento'] },
    { id: 'premium', label: 'Prémium', mult: 1.85, perks: ['Cambios y anulación gratis', 'Restauración a bordo'] },
  ],
  avlo: [{ id: 'avlo', label: 'AVLO', mult: 1, perks: ['Un bulto de mano', 'Asiento asignado'] }],
  single: [{ id: 'estandar', label: 'Estándar', mult: 1, perks: ['Plaza sentada', 'Equipaje de mano'] }],
};

const faresFor = (type) =>
  type === 'AVLO' ? FARES.avlo : ['AVE', 'AVE Euromed', 'Intercity'].includes(type) ? FARES.full : FARES.single;

const roundPrice = (p) => Math.round(p * 20) / 20;

/** Niños (4–13 años) pagan el 60 %; bebés viajan gratis. */
export const payingUnits = (pax) => pax.adults + pax.children * 0.6;

// ---------- Búsqueda ----------

/** Tramo de un tren entre sus paradas i y j, con precio orientativo y distancia. */
function legOf(tt, train, i, j) {
  // Distancia real entre estaciones, parada a parada (mapGeometry.js).
  const stops = train.s.slice(i, j + 1).map(([si]) => [tt.stations[si].lon, tt.stations[si].lat]);
  const stationKm = routeKm(stops);
  const distance = stationKm * 1.15; // para el precio: la vía no es una línea recta

  const type = tt.types[train.t];
  const dep = train.s[i][2];
  const arr = train.s[j][1];
  const hour = Math.floor(dep / 60) % 24;
  const peak = (hour >= 7 && hour < 10) || (hour >= 17 && hour < 21) ? 1.12 : 1;
  const base = Math.max(6, distance * (RATE_PER_KM[type] ?? 0.07)) * peak;

  return {
    id: `${train.n}-${dep}`,
    number: train.n,
    type,
    from: tt.stations[train.s[i][0]].name,
    to: tt.stations[train.s[j][0]].name,
    dep,
    arr,
    duration: arr - dep,
    stopsBetween: j - i - 1,
    distance: Math.round(distance),
    /** Km entre estaciones siguiendo las paradas del tren (para la huella de carbono). */
    stationKm: Math.round(stationKm),
    fares: faresFor(type).map((f) => ({ ...f, price: roundPrice(base * f.mult) })),
  };
}

/** Trenes directos que van de alguna estación de `fromIds` a alguna de `toIds` en la fecha indicada. */
export function searchTrains(tt, fromIds, toIds, iso) {
  const day = dayIndex(tt, iso);
  if (day < 0 || day >= tt.days) return [];
  const from = new Set(fromIds);
  const to = new Set(toIds);
  const results = [];
  const seen = new Set();

  for (const train of tt.trains) {
    if (!runsOn(train, day)) continue;
    const i = train.s.findIndex(([si]) => from.has(si));
    if (i < 0) continue;
    let j = -1;
    for (let k = i + 1; k < train.s.length; k++) if (to.has(train.s[k][0])) { j = k; break; }
    if (j < 0) continue;

    // Un mismo tren puede aparecer con dos variantes de recorrido el mismo día: se muestra una vez.
    const leg = legOf(tt, train, i, j);
    if (seen.has(leg.id)) continue;
    seen.add(leg.id);
    results.push(leg);
  }
  return results.sort((a, b) => a.dep - b.dep);
}

// ---------- Búsqueda con un transbordo ----------

/** Minutos mínimos para cambiar de tren en la misma estación. */
export const MIN_CHANGE_SAME_STATION = 15;
/** Minutos mínimos para cambiar de estación dentro de la misma ciudad (p. ej. Atocha → Chamartín). */
export const MIN_CHANGE_OTHER_STATION = 60;
/** Espera máxima entre los dos trenes. */
export const MAX_WAIT = 4 * 60;
/** Cuántas opciones con transbordo se muestran como mucho. */
const MAX_CONNECTIONS = 10;

/**
 * Viajes con UN transbordo de `fromIds` a `toIds` en la fecha indicada (horarios reales de Renfe).
 * El cambio puede ser en la misma estación o en otra de la misma ciudad (con más margen).
 * Solo se devuelven las mejores opciones: ninguna sale antes y llega después que otra.
 */
export function searchConnections(tt, fromIds, toIds, iso) {
  const day = dayIndex(tt, iso);
  if (day < 0 || day >= tt.days) return [];
  const from = new Set(fromIds);
  const to = new Set(toIds);
  const cityOf = (si) => tt.stations[si].city ?? `#${si}`;

  // 1) Trenes que salen del origen: a qué estaciones llegan después, por ciudad.
  // 2) Trenes que llegan al destino: desde qué estaciones salen antes, por ciudad.
  const arrivals = new Map();
  const departures = new Map();
  const add = (map, key, item) => (map.get(key) ?? map.set(key, []).get(key)).push(item);

  for (const train of tt.trains) {
    if (!runsOn(train, day)) continue;
    const i = train.s.findIndex(([si]) => from.has(si));
    if (i >= 0) {
      for (let k = i + 1; k < train.s.length && !to.has(train.s[k][0]); k++) {
        if (!from.has(train.s[k][0])) add(arrivals, cityOf(train.s[k][0]), { train, i, k });
      }
    }
    let j = -1;
    for (let k = 0; k < train.s.length; k++) if (to.has(train.s[k][0])) { j = k; break; }
    if (j > 0) {
      for (let k = 0; k < j && !from.has(train.s[k][0]); k++) add(departures, cityOf(train.s[k][0]), { train, k, j });
    }
  }

  // 3) Se cruzan en la misma ciudad con margen suficiente para cambiar de tren.
  const best = new Map();
  for (const [city, ins] of arrivals) {
    const outs = departures.get(city);
    if (!outs) continue;
    for (const a of ins) {
      const arrHub = a.train.s[a.k][1];
      for (const d of outs) {
        if (d.train === a.train || d.train.n === a.train.n) continue;
        const sameStation = a.train.s[a.k][0] === d.train.s[d.k][0];
        const wait = d.train.s[d.k][2] - arrHub;
        if (wait < (sameStation ? MIN_CHANGE_SAME_STATION : MIN_CHANGE_OTHER_STATION) || wait > MAX_WAIT) continue;
        const dep = a.train.s[a.i][2];
        const arr = d.train.s[d.j][1];
        // Para cada combinación de trenes, el transbordo que deja llegar antes.
        const key = `${a.train.n}-${dep}>${d.train.n}`;
        const prev = best.get(key);
        if (!prev || arr < prev.arr || (arr === prev.arr && sameStation && !prev.sameStation)) {
          best.set(key, { a, d, dep, arr, wait, sameStation });
        }
      }
    }
  }

  // 4) Solo las opciones que merecen la pena: se quita la que sale antes y llega después que otra.
  const options = [...best.values()].sort((x, y) => y.dep - x.dep || x.arr - y.arr);
  const kept = [];
  let earliest = Infinity;
  for (const o of options) {
    if (o.arr < earliest) {
      kept.push(o);
      earliest = o.arr;
    }
  }

  return kept
    .sort((x, y) => x.dep - y.dep)
    .slice(0, MAX_CONNECTIONS)
    .map((o) => joinLegs(legOf(tt, o.a.train, o.a.i, o.a.k), legOf(tt, o.d.train, o.d.k, o.d.j), o));
}

/** Une dos tramos en un viaje con transbordo, con la misma forma que un resultado directo. */
function joinLegs(first, second, { wait, sameStation }) {
  const tiers = Math.min(first.fares.length, second.fares.length);
  const fares = Array.from({ length: tiers }, (_, t) => ({
    id: tiers === 1 ? 'combinado' : first.fares[t].id,
    label: tiers === 1 ? 'Combinado' : first.fares[t].label,
    price: roundPrice(first.fares[t].price + second.fares[t].price),
    perks: ['Un solo billete para los dos trenes', ...(tiers === 1 ? ['Plaza sentada en los dos trenes'] : first.fares[t].perks)],
  }));
  return {
    id: `${first.id}>${second.id}`,
    number: `${first.number} + ${second.number}`,
    type: `${first.type} + ${second.type}`,
    from: first.from,
    to: second.to,
    dep: first.dep,
    arr: second.arr,
    duration: second.arr - first.dep,
    stopsBetween: first.stopsBetween + second.stopsBetween + 1,
    distance: first.distance + second.distance,
    stationKm: first.stationKm + second.stationKm,
    fares,
    /** Datos del transbordo. */
    legs: [first, second],
    transfer: { at: first.to, to: second.from, wait, sameStation },
  };
}

// ---------- Formato ----------

export const fmtTime = (min) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const fmtDuration = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
};

export const fmtPrice = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export const fmtDate = (iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(toUtc(iso)).toLocaleDateString('es-ES', { ...opts, timeZone: 'UTC' });

export const paxLabel = ({ adults, children, infants }) =>
  [
    `${adults} adulto${adults > 1 ? 's' : ''}`,
    children && `${children} niño${children > 1 ? 's' : ''}`,
    infants && `${infants} bebé${infants > 1 ? 's' : ''}`,
  ]
    .filter(Boolean)
    .join(', ');
