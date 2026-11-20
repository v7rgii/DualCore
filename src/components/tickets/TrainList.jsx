import { useState } from 'react';
import { addDays, fmtDate, fmtDuration, fmtPrice, fmtTime, todayIso } from '../../lib/timetable.js';
import { useTrainInsights } from '../../lib/useTrainInsights.js';
import { compareWithCar, fmtKg } from '../../lib/carbon.js';
import { LeafIcon } from './CarbonSaving.jsx';

/** CO₂ que ahorra un viajero en este tren frente a ir en coche de gasolina (el cálculo está en carbon.js). */
function TrainCarbon({ km }) {
  const c = compareWithCar({ km, people: 1 });
  if (!c) return null;
  const detail = `Tren: ${fmtKg(c.trainKg)} · Coche: ${fmtKg(c.carKg)}`;
  return (
    <span className="train-eco" title={`${detail} (por viajero, ${km.toLocaleString('es-ES')} km)`}>
      <LeafIcon size={14} />
      <span>
        Ahorras {fmtKg(c.savedKg)} CO₂
        <span className="visually-hidden"> frente al coche. {detail}</span>
      </span>
    </span>
  );
}

/** Estado en directo (si circula hoy) y puntualidad de los últimos 30 días. */
function TrainInsight({ live, stats }) {
  if (!live && !stats) return null;
  return (
    <span className="train-insight">
      {live && (
        <span className={`insight-live${live.officialDelayMin >= 5 ? ' is-late' : ''}`}>
          <span className="live-pulse" aria-hidden="true" />
          {live.officialDelayMin > 0 ? `Circulando · +${live.officialDelayMin} min` : 'Circulando · puntual'}
        </span>
      )}
      {stats?.onTimePercent != null && (
        <span title={`Últimos ${stats.window ?? '30d'} · ${stats.trips} viajes · retraso medio ${stats.avgDelay} min`}>
          Puntualidad {stats.onTimePercent} %
        </span>
      )}
    </span>
  );
}

const badgeClass = (type) => `badge badge--${type.split(' ')[0].toLowerCase()}`;

/** Dónde y cuánto se espera en un viaje con transbordo. */
function TransferNote({ transfer }) {
  return (
    <span className="train-transfer">
      <TransferIcon />
      {transfer.sameStation ? (
        <>
          Transbordo en <strong>{transfer.at}</strong>
        </>
      ) : (
        <>
          Cambio de estación: <strong>{transfer.at}</strong> → <strong>{transfer.to}</strong>
        </>
      )}
      <span className="train-transfer-wait">· {fmtDuration(transfer.wait)} de espera</span>
    </span>
  );
}

/** Los dos trenes de un viaje con transbordo, con sus horas (en el desplegable de tarifas). */
function LegsDetail({ legs }) {
  return (
    <ol className="train-legs">
      {legs.map((l) => (
        <li key={l.id}>
          <span className={badgeClass(l.type)}>{l.type}</span>
          <span className="train-legs-num">Nº {l.number}</span>
          <span>
            {fmtTime(l.dep)} {l.from} → {fmtTime(l.arr)} {l.to}
          </span>
        </li>
      ))}
    </ol>
  );
}

function TransferIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
      <path d="M3 7h12l-3-3M17 13H5l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Listado de trenes de un día, con selector de día y tarifas desplegables.
 * Si `results` son viajes con transbordo (no hay directos), se avisa arriba y cada tarjeta muestra el cambio.
 */
export default function TrainList({ title, date, minDate, maxDate, results, selectedId, onChangeDate, onSelect }) {
  const [openId, setOpenId] = useState(null);
  const withTransfer = results.some((r) => r.legs);
  // Puntualidad y estado en directo solo de los trenes directos (los números de tren reales).
  const insights = useTrainInsights(results.filter((r) => !r.legs).map((r) => r.number));
  const isToday = date === todayIso();

  return (
    <div className="train-list">
      <div className="train-list-head">
        <h3>{title}</h3>
        <div className="day-switch">
          <button type="button" disabled={date <= minDate} onClick={() => onChangeDate(addDays(date, -1))} aria-label="Día anterior">
            ‹
          </button>
          <span>{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <button type="button" disabled={date >= maxDate} onClick={() => onChangeDate(addDays(date, 1))} aria-label="Día siguiente">
            ›
          </button>
        </div>
      </div>

      {withTransfer && (
        <p className="transfer-notice" role="status">
          <TransferIcon />
          <span>
            <strong>No hay trenes directos este día.</strong> Estas son las mejores opciones con un transbordo, con los
            horarios oficiales de Renfe.
          </span>
        </p>
      )}

      {results.length === 0 ? (
        <div className="no-trains">
          <strong>No hay trenes para este día, ni directos ni con un transbordo.</strong>
          <span>Prueba con otra fecha o con otra estación de la misma ciudad.</span>
        </div>
      ) : (
        <ul className="trains">
          {results.map((r) => {
            const open = openId === r.id;
            const from = Math.min(...r.fares.map((f) => f.price));
            return (
              <li key={r.id} className={`train${open ? ' is-open' : ''}${selectedId === r.id ? ' is-selected' : ''}`}>
                <button type="button" className="train-main" aria-expanded={open} onClick={() => setOpenId(open ? null : r.id)}>
                  <span className="train-times">
                    <span className="time">{fmtTime(r.dep)}</span>
                    <span className="train-track">
                      <span>{fmtDuration(r.duration)}</span>
                    </span>
                    <span className="time">
                      {fmtTime(r.arr)}
                      {r.arr >= 1440 && <sup>+1</sup>}
                    </span>
                  </span>
                  <span className="train-stations">
                    <span>{r.from}</span>
                    <span>{r.to}</span>
                  </span>
                  {r.legs ? (
                    <span className="train-meta">
                      {r.legs.map((l) => (
                        <span key={l.id} className="train-meta-leg">
                          <span className={badgeClass(l.type)}>{l.type}</span>
                          <span>Nº {l.number}</span>
                        </span>
                      ))}
                      <span>1 transbordo</span>
                      <TransferNote transfer={r.transfer} />
                    </span>
                  ) : (
                    <span className="train-meta">
                      <span className={badgeClass(r.type)}>{r.type}</span>
                      <span>Nº {r.number}</span>
                      <span>{r.stopsBetween === 0 ? 'Directo' : `${r.stopsBetween} parada${r.stopsBetween > 1 ? 's' : ''}`}</span>
                      <TrainInsight live={isToday ? insights.live[r.number] : null} stats={insights.stats[r.number]} />
                    </span>
                  )}
                  <span className="train-price">
                    <small>desde</small>
                    {fmtPrice(from)}
                    <TrainCarbon km={r.stationKm} />
                  </span>
                </button>

                {open && r.legs && <LegsDetail legs={r.legs} />}
                {open && (
                  <div className="fares">
                    {r.fares.map((f) => (
                      <div key={f.id} className="fare">
                        <div className="fare-head">
                          <strong>{f.label}</strong>
                          <span className="fare-price">{fmtPrice(f.price)}</span>
                        </div>
                        <ul>
                          {f.perks.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                        <button type="button" className="btn btn-small" onClick={() => onSelect(r, f)}>
                          Seleccionar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
