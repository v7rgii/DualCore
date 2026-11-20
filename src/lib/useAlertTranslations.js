import { useEffect, useState } from 'react';

/** Idiomas a los que se pueden traducir los avisos. «original» = el texto tal y como lo publica Renfe. */
export const ALERT_LANGUAGES = [
  { id: 'original', label: 'Original' },
  { id: 'es', label: 'Castellano' },
  { id: 'en', label: 'English' },
  { id: 'ca', label: 'Català' },
  { id: 'eu', label: 'Euskara' },
  { id: 'gl', label: 'Galego' },
];

/** Traducciones ya recibidas, compartidas mientras la página está abierta: «idioma|id» → texto (o null si falló). */
const cache = new Map();
const BATCH = 10;

/**
 * Traduce (con el servidor, /api/traducir) los avisos visibles al idioma elegido.
 * Devuelve { texts: { id: texto }, pending: nº de avisos que aún se están traduciendo, failed: nº que no se pudieron }.
 */
export function useAlertTranslations(ids, lang) {
  const [, setVersion] = useState(0);
  const key = ids.join(',');

  useEffect(() => {
    if (lang === 'original') return undefined;
    const missing = ids.filter((id) => !cache.has(`${lang}|${id}`));
    if (!missing.length) return undefined;
    const controller = new AbortController();

    (async () => {
      for (let i = 0; i < missing.length; i += BATCH) {
        const batch = missing.slice(i, i + BATCH);
        try {
          const qs = new URLSearchParams({ lang, ids: batch.join(',') });
          const res = await fetch(`/api/traducir?${qs}`, { signal: controller.signal });
          const data = res.ok ? await res.json() : { items: {} };
          for (const id of batch) cache.set(`${lang}|${id}`, data.items?.[id] ?? null);
        } catch (err) {
          if (err.name === 'AbortError') return;
          for (const id of batch) cache.set(`${lang}|${id}`, null);
        }
        setVersion((v) => v + 1);
      }
    })();
    return () => controller.abort();
    // `key` resume `ids`: solo se vuelve a pedir si cambian los avisos visibles o el idioma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lang]);

  if (lang === 'original') return { texts: {}, pending: 0, failed: 0 };
  const texts = {};
  let pending = 0;
  let failed = 0;
  for (const id of ids) {
    const k = `${lang}|${id}`;
    if (!cache.has(k)) pending++;
    else if (cache.get(k) == null) failed++;
    else texts[id] = cache.get(k);
  }
  return { texts, pending, failed };
}
