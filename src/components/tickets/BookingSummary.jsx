import { useState } from 'react';
import { fmtDate, fmtPrice, fmtTime, paxLabel, payingUnits } from '../../lib/timetable.js';
import { compareWithCar, fmtKg, sumComparisons, travellers } from '../../lib/carbon.js';
import CarbonSaving, { FuelPicker } from './CarbonSaving.jsx';

export const legTotal = (leg, pax) => (leg ? leg.fare.price * payingUnits(pax) : 0);

/** Km entre estaciones del trayecto (los resultados antiguos solo traen la distancia para el precio). */
const legKm = (leg) => leg.train.stationKm ?? Math.round(leg.train.distance / 1.15);

/** Comparación de CO2 de un trayecto elegido con el coche. */
const legCarbon = (leg, pax, fuel) => (leg ? compareWithCar({ km: legKm(leg), people: travellers(pax), fuel }) : null);

function Leg({ label, leg, date, pax, carbon, onEdit }) {
  if (!leg) {
    return (
      <div className="summary-leg is-empty">
        <span className="eyebrow">{label}</span>
        <p>{fmtDate(date)} · Elige un tren</p>
      </div>
    );
  }
  return (
    <div className="summary-leg">
      <div className="summary-leg-head">
        <span className="eyebrow">{label}</span>
        {onEdit && (
          <button type="button" className="link" onClick={onEdit}>
            Cambiar
          </button>
        )}
      </div>
      <p className="summary-route">
        {fmtTime(leg.train.dep)} {leg.train.from} → {fmtTime(leg.train.arr)} {leg.train.to}
      </p>
      {leg.train.legs ? (
        <>
          <p className="summary-meta">
            {fmtDate(date)} · 1 transbordo · {leg.fare.label}
          </p>
          <ol className="summary-legs">
            {leg.train.legs.map((l) => (
              <li key={l.id}>
                {l.type} {l.number}: {fmtTime(l.dep)} {l.from} → {fmtTime(l.arr)} {l.to}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="summary-meta">
          {fmtDate(date)} · {leg.train.type} {leg.train.number} · {leg.fare.label}
        </p>
      )}
      <p className="summary-price">{fmtPrice(legTotal(leg, pax))}</p>
      <CarbonSaving comparison={carbon} />
    </div>
  );
}

/** Resumen lateral de la compra: trayectos elegidos, viajeros, total y CO2 ahorrado frente al coche. */
export default function BookingSummary({ query, outbound, inbound, onEditOutbound, onEditInbound }) {
  const [fuel, setFuel] = useState('gasolina');
  const total = legTotal(outbound, query.pax) + legTotal(inbound, query.pax);
  const outCarbon = legCarbon(outbound, query.pax, fuel);
  const inCarbon = query.roundTrip ? legCarbon(inbound, query.pax, fuel) : null;
  const carbonTotal = outCarbon && inCarbon ? sumComparisons([outCarbon, inCarbon]) : null;

  return (
    <aside className="card summary" aria-label="Resumen del viaje">
      <h3>Tu viaje</h3>
      <p className="summary-od">
        {query.from.label} → {query.to.label}
      </p>
      <p className="summary-meta">{paxLabel(query.pax)}</p>
      <Leg label="Ida" leg={outbound} date={query.dateOut} pax={query.pax} carbon={outCarbon} onEdit={onEditOutbound} />
      {query.roundTrip && (
        <Leg label="Vuelta" leg={inbound} date={query.dateBack} pax={query.pax} carbon={inCarbon} onEdit={onEditInbound} />
      )}
      {outCarbon && <FuelPicker value={fuel} onChange={setFuel} />}
      <div className="summary-total">
        <span>Total</span>
        <strong>{fmtPrice(total)}</strong>
      </div>
      {carbonTotal && (
        <p className="carbon-total">
          Ida y vuelta: <strong>{fmtKg(carbonTotal.savedKg)} de CO₂</strong> menos que en coche
        </p>
      )}
      <p className="summary-note">
        Precio orientativo. Horarios reales de Renfe Data.
        {outCarbon && (
          <>
            {' '}
            CO₂: factores oficiales del{' '}
            <a href="https://www.miteco.gob.es/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/calculadoras.html" target="_blank" rel="noreferrer">
              MITECO
            </a>{' '}
            (coche, 2025) y{' '}
            <a href="https://grupo.renfe.com/es/es/sostenibilidad/descarbonizacion" target="_blank" rel="noreferrer">
              huella de carbono de Renfe
            </a>{' '}
            (tren, 3,79 g por viajero y km) sobre la distancia entre estaciones.
          </>
        )}
      </p>
    </aside>
  );
}
