/**
 * Clasificación de los avisos oficiales de Renfe en: huelgas, cancelaciones, retrasos y otros avisos.
 *
 * Solo usa lo que publica Renfe (a través de RadarDeTrenes): el tipo que trae cada aviso y su texto.
 *  - Cancelación: los trenes que Renfe marca como cancelados (tipo «cancelacion») o avisos que hablan
 *    de trenes suprimidos o cancelados.
 *  - Huelga: avisos que mencionan una huelga o servicios mínimos (también en euskera, «greba»).
 *    Si Renfe dice que se ha desconvocado, se marca como «desconvocada».
 *  - Retraso: avisos en los que Renfe informa de trenes con retraso (también en euskera, «atzerapen»).
 *  - Otros: obras, ascensores, accesos, cambios de horario…
 *
 * Lógica pura (sin React) para poder probarla con `npm test`.
 */
import { normalize } from './text.js';

/** Categorías en el orden en que se muestran. */
export const ALERT_CATEGORIES = [
  { id: 'huelga', label: 'Huelgas' },
  { id: 'cancelacion', label: 'Cancelaciones' },
  { id: 'retraso', label: 'Retrasos' },
  { id: 'otros', label: 'Otros avisos' },
];

/** Etiqueta en singular para cada aviso. */
export const CATEGORY_LABEL = { huelga: 'Huelga', cancelacion: 'Cancelación', retraso: 'Retraso', otros: 'Aviso' };

const STRIKE = /\b(huelgas?|servicios minimos|paros parciales|greba)\b/;
const CALLED_OFF = /\bdesconvocad[ao]s?\b/;
const CANCELLED = /\b(cancelad[ao]s?|suprimid[ao]s?|supresion(es)?|anulad[ao]s?)\b/;
const DELAY = /\b(retrasos?|demoras?|atzerapen\w*)\b/;
const NO_DELAY = /\bsin (retrasos?|demoras?)\b/;

/**
 * Devuelve { category, calledOff } para un aviso con la forma { kind, text }.
 * Una huelga manda sobre lo demás: un aviso de huelga suele hablar también de trenes cancelados.
 */
export function classifyAlert(alert) {
  const text = normalize(alert?.text);
  if (STRIKE.test(text)) return { category: 'huelga', calledOff: CALLED_OFF.test(text) };
  if (alert?.kind === 'cancelacion' || CANCELLED.test(text)) return { category: 'cancelacion', calledOff: false };
  if (DELAY.test(text) && !NO_DELAY.test(text)) return { category: 'retraso', calledOff: false };
  return { category: 'otros', calledOff: false };
}

/** Recuento de avisos por categoría (para los filtros). */
export function countByCategory(alerts) {
  const counts = Object.fromEntries(ALERT_CATEGORIES.map((c) => [c.id, 0]));
  for (const a of alerts) counts[classifyAlert(a).category]++;
  return counts;
}
