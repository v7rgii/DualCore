import { useMemo, useState } from 'react';
import { normalize } from '../../lib/text.js';
import { ALERT_CATEGORIES, CATEGORY_LABEL, classifyAlert } from '../../lib/alertCategory.js';

const PAGE = 8;

const fmt = (iso) =>
  new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const ORDER = Object.fromEntries(ALERT_CATEGORIES.map((c, i) => [c.id, i]));

/**
 * Avisos oficiales de Renfe, clasificados en huelgas, cancelaciones, retrasos y otros avisos
 * (obras, ascensores fuera de servicio…). La clasificación está en src/lib/alertCategory.js.
 */
export default function AlertsPanel({ alerts, query }) {
  const [limit, setLimit] = useState(PAGE);
  const [category, setCategory] = useState('all');

  // Cada aviso con su categoría, ordenados por categoría (se respeta el orden de Renfe dentro de cada una).
  const classified = useMemo(
    () =>
      alerts
        .map((a, i) => ({ ...a, ...classifyAlert(a), i }))
        .sort((a, b) => ORDER[a.category] - ORDER[b.category] || a.i - b.i),
    [alerts],
  );

  const matching = useMemo(() => {
    const q = normalize(query.trim());
    return q
      ? classified.filter((a) => normalize(`${a.text} ${a.lines.join(' ')} ${a.stops.join(' ')} ${a.networks.join(' ')}`).includes(q))
      : classified;
  }, [classified, query]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(ALERT_CATEGORIES.map((x) => [x.id, 0]));
    for (const a of matching) c[a.category]++;
    return c;
  }, [matching]);

  const shown = category === 'all' ? matching : matching.filter((a) => a.category === category);

  const choose = (id) => {
    setCategory(id);
    setLimit(PAGE);
  };

  return (
    <div className="card alerts">
      <div className="alerts-head">
        <h2>Avisos de la red</h2>
        <span className="chip-count">{matching.length}</span>
      </div>
      <p className="alerts-note">Solo avisos oficiales publicados por Renfe. Se clasifican por su contenido.</p>

      <div className="chips alert-filters" role="radiogroup" aria-label="Tipo de aviso">
        {[{ id: 'all', label: 'Todos' }, ...ALERT_CATEGORIES].map((c) => {
          const n = c.id === 'all' ? matching.length : counts[c.id];
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={category === c.id}
              className={`chip alert-filter alert-filter--${c.id}${category === c.id ? ' is-on' : ''}`}
              onClick={() => choose(c.id)}
            >
              {c.label} <span className="alert-filter-count">{n}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="empty">
          No hay {category === 'all' ? 'avisos activos' : ALERT_CATEGORIES.find((c) => c.id === category).label.toLowerCase()}
          {query.trim() ? ` que coincidan con «${query}»` : ''}.
        </p>
      ) : (
        <ul className="alert-list">
          {shown.slice(0, limit).map((a) => (
            <li key={a.id} className={`alert alert--${a.category}`}>
              <div className="alert-tags">
                <span className={`alert-cat alert-cat--${a.category}`}>
                  {a.category === 'otros' ? a.kindLabel : CATEGORY_LABEL[a.category]}
                </span>
                {a.calledOff && <span className="alert-calledoff">Desconvocada</span>}
                {a.networks.slice(0, 2).map((n) => (
                  <span key={n} className="alert-network">
                    {n}
                  </span>
                ))}
                {a.lines.slice(0, 6).map((l) => (
                  <span key={l} className="badge">
                    {l}
                  </span>
                ))}
                {a.start && <span className="alert-date">Desde {fmt(a.start)}</span>}
              </div>
              <p>{a.text}</p>
              {a.stops.length > 0 && <p className="alert-stops">Estaciones: {a.stops.slice(0, 5).join(', ')}</p>}
            </li>
          ))}
        </ul>
      )}
      {shown.length > limit && (
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setLimit((n) => n + PAGE)}>
          Ver más avisos
        </button>
      )}
    </div>
  );
}
