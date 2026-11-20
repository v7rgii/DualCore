import { useEffect, useMemo, useState } from 'react';
import SearchForm from '../components/tickets/SearchForm.jsx';
import TrainList from '../components/tickets/TrainList.jsx';
import BookingSummary, { legTotal } from '../components/tickets/BookingSummary.jsx';
import PassengerForm from '../components/tickets/PassengerForm.jsx';
import Confirmation from '../components/tickets/Confirmation.jsx';
import { findStationOption, loadTimetable, searchConnections, searchTrains, todayIso } from '../lib/timetable.js';
import { scrollToSection } from '../lib/navigation.js';
import { useInView } from '../lib/useInView.js';

/** Trenes directos; si no hay ninguno ese día, opciones con un transbordo. */
function findJourneys(tt, fromIds, toIds, iso) {
  const direct = searchTrains(tt, fromIds, toIds, iso);
  return direct.length ? direct : searchConnections(tt, fromIds, toIds, iso);
}

const STEPS = [
  { id: 'outbound', label: 'Ida' },
  { id: 'inbound', label: 'Vuelta' },
  { id: 'passengers', label: 'Viajeros' },
  { id: 'done', label: 'Confirmación' },
];

/**
 * Sección «Billetes»: buscar trayecto → elegir tren y tarifa → datos de viajeros → confirmación.
 * `trip` ({ from, to, nonce }): trayecto elegido con doble clic en el mapa; rellena el buscador y busca.
 */
export default function TicketsPage({ trip }) {
  const [timetable, setTimetable] = useState(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState(null);
  const [step, setStep] = useState('search');
  const [outbound, setOutbound] = useState(null);
  const [inbound, setInbound] = useState(null);
  const [booking, setBooking] = useState(null);
  // Trayecto que llega del mapa y no se ha podido buscar (falta alguna estación): se deja en el formulario.
  const [draft, setDraft] = useState(null);
  // Cambia cada vez que el mapa rellena el buscador, para que el formulario se vuelva a montar con esos datos.
  const [formVersion, setFormVersion] = useState(0);
  // Aparece al llegar a la sección y desaparece al irse (también al volver al mapa).
  const [sectionRef, visible] = useInView();

  useEffect(() => {
    loadTimetable().then(setTimetable, () => setFailed(true));
  }, []);

  const minDate = useMemo(() => {
    if (!timetable) return todayIso();
    const today = todayIso();
    return today > timetable.base ? today : timetable.base;
  }, [timetable]);

  const initialForm = useMemo(
    () => ({ from: null, to: null, roundTrip: false, dateOut: minDate, dateBack: minDate, pax: { adults: 1, children: 0, infants: 0 } }),
    [minDate],
  );

  const outResults = useMemo(
    () => (timetable && query ? findJourneys(timetable, query.from.ids, query.to.ids, query.dateOut) : []),
    [timetable, query],
  );
  const backResults = useMemo(
    () => (timetable && query?.roundTrip ? findJourneys(timetable, query.to.ids, query.from.ids, query.dateBack) : []),
    [timetable, query],
  );

  const goTo = (next) => {
    setStep(next);
    requestAnimationFrame(() => scrollToSection('billetes-flow'));
  };

  const search = (form) => {
    setDraft(null);
    setQuery(form);
    setOutbound(null);
    setInbound(null);
    setBooking(null);
    goTo('outbound');
  };

  // Trayecto elegido en el mapa: rellena origen y destino, busca y baja hasta aquí.
  useEffect(() => {
    if (!trip || !timetable) return;
    const from = findStationOption(timetable, trip.from);
    const to = findStationOption(timetable, trip.to);
    const form = { ...initialForm, from, to };
    setOutbound(null);
    setInbound(null);
    setBooking(null);
    setFormVersion((v) => v + 1);
    // (La sección se muestra sola al llegar a ella con el desplazamiento: ver useInView.)
    if (from && to && from.key !== to.key) {
      setDraft(null);
      setQuery(form);
      setStep('outbound');
    } else {
      // Sin horarios para alguna de las estaciones: se rellena lo que se pueda y se deja elegir.
      setQuery(null);
      setStep('search');
      setDraft({ form, note: `No hay billetes a la venta para ${trip.from ?? '¿?'} → ${trip.to ?? '¿?'}. Elige las estaciones a mano.` });
    }
    requestAnimationFrame(() => scrollToSection('billetes'));
    // Solo cuando llega un trayecto nuevo desde el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.nonce, timetable]);

  const steps = STEPS.filter((s) => s.id !== 'inbound' || query?.roundTrip);
  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <section id="billetes" ref={sectionRef} className={`page tickets reveal${visible ? ' is-visible' : ''}`}>
      <div className="page-head">
        <p className="eyebrow">Billetes</p>
        <h2 className="section-title">¿A dónde quieres viajar?</h2>
        <p>Busca entre los horarios oficiales de Renfe, elige tu tren y tu tarifa, y reserva en pocos pasos.</p>
      </div>

      {failed && <div className="card placeholder">No se han podido cargar los horarios. Ejecuta «npm run data».</div>}
      {!failed && !timetable && <div className="card placeholder">Cargando horarios…</div>}

      {timetable && (
        <SearchForm
          key={`${formVersion}|${query ? `${query.dateOut}|${query.dateBack}` : 'new'}`}
          timetable={timetable}
          minDate={minDate}
          initial={query ?? draft?.form ?? initialForm}
          onSearch={search}
        />
      )}
      {draft && (
        <p className="form-error trip-note" role="status">
          {draft.note}
        </p>
      )}

      {timetable && query && step !== 'search' && (
        <div id="billetes-flow" className="booking">
          <ol className="steps" aria-label="Pasos de la compra">
            {steps.map((s, i) => (
              <li key={s.id} className={i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : ''}>
                <span>{i + 1}</span>
                {s.label}
              </li>
            ))}
          </ol>

          <div className="booking-layout">
            <div className="booking-main">
              {step === 'outbound' && (
                <TrainList
                  title={`Ida · ${query.from.label} → ${query.to.label}`}
                  date={query.dateOut}
                  minDate={minDate}
                  maxDate={timetable.maxDate}
                  results={outResults}
                  selectedId={outbound?.train.id}
                  onChangeDate={(dateOut) =>
                    setQuery((q) => ({ ...q, dateOut, dateBack: q.dateBack < dateOut ? dateOut : q.dateBack }))
                  }
                  onSelect={(train, fare) => {
                    setOutbound({ train, fare });
                    goTo(query.roundTrip ? 'inbound' : 'passengers');
                  }}
                />
              )}
              {step === 'inbound' && (
                <TrainList
                  title={`Vuelta · ${query.to.label} → ${query.from.label}`}
                  date={query.dateBack}
                  minDate={query.dateOut}
                  maxDate={timetable.maxDate}
                  results={backResults}
                  selectedId={inbound?.train.id}
                  onChangeDate={(dateBack) => setQuery((q) => ({ ...q, dateBack }))}
                  onSelect={(train, fare) => {
                    setInbound({ train, fare });
                    goTo('passengers');
                  }}
                />
              )}
              {step === 'passengers' && (
                <PassengerForm
                  pax={query.pax}
                  onBack={() => goTo(query.roundTrip ? 'inbound' : 'outbound')}
                  onConfirm={({ email }) => {
                    setBooking({
                      email,
                      total: legTotal(outbound, query.pax) + legTotal(inbound, query.pax),
                      locator: Math.random().toString(36).slice(2, 8).toUpperCase(),
                    });
                    goTo('done');
                  }}
                />
              )}
              {step === 'done' && booking && (
                <Confirmation
                  booking={booking}
                  onRestart={() => {
                    setQuery(null);
                    setDraft(null);
                    setStep('search');
                    requestAnimationFrame(() => scrollToSection('billetes'));
                  }}
                />
              )}
            </div>

            <BookingSummary
              query={query}
              outbound={outbound}
              inbound={inbound}
              onEditOutbound={step !== 'done' ? () => goTo('outbound') : null}
              onEditInbound={step !== 'done' && query.roundTrip ? () => goTo('inbound') : null}
            />
          </div>
        </div>
      )}
    </section>
  );
}
