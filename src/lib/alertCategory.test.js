// Pruebas de la clasificación de avisos. Se ejecutan con `npm test`.
// Los textos son avisos reales publicados por Renfe (noviembre de 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAlert, countByCategory } from './alertCategory.js';

test('huelga: se detecta y se marca si está desconvocada', () => {
  const r = classifyAlert({
    kind: 'incidencia',
    text: 'Cercanías Málaga informa: Desconvocada la huelga prevista por el sindicato de maquinistas SEMAF para el día 23 de noviembre de 2026.',
  });
  assert.deepEqual(r, { category: 'huelga', calledOff: true });
  assert.deepEqual(classifyAlert({ kind: 'otros', text: 'Huelga convocada el día 3. Consulta los servicios mínimos.' }), {
    category: 'huelga',
    calledOff: false,
  });
});

test('huelga manda sobre cancelación: un aviso de huelga con trenes suprimidos sigue siendo huelga', () => {
  const r = classifyAlert({ kind: 'cancelacion', text: 'Por la huelga convocada, estos trenes quedan suprimidos.' });
  assert.equal(r.category, 'huelga');
});

test('cancelación: los trenes que Renfe marca como cancelados', () => {
  const r = classifyAlert({
    kind: 'cancelacion',
    text: 'Renfe marca como cancelado el tren Regional 15040 de Lleida-Pirineus a Barcelona Estació de França, con salida programada a las 04:48.',
  });
  assert.equal(r.category, 'cancelacion');
  assert.equal(classifyAlert({ kind: 'incidencia', text: 'Tren suprimido entre Atocha y Alcalá.' }).category, 'cancelacion');
});

test('retraso: en castellano y en euskera, pero no «sin retrasos»', () => {
  assert.equal(
    classifyAlert({ kind: 'incidencia', text: "Línea C2. Tren con salida prevista a las 10:55h de l'Alcúdia circula por Xàtiva con 15 minutos de retraso." })
      .category,
    'retraso',
  );
  assert.equal(classifyAlert({ kind: 'otros', text: 'Trenek 10-20 minutuko atzerapenarekin ibiltzen ari dira.' }).category, 'retraso');
  assert.equal(classifyAlert({ kind: 'otros', text: 'El servicio se presta sin retrasos.' }).category, 'otros');
});

test('otros: obras y ascensores no entran en ninguna categoría especial', () => {
  assert.equal(classifyAlert({ kind: 'otros', text: 'AMETZOLA. Ascensor de vía 2 se encuentra fuera de servicio.' }).category, 'otros');
  assert.equal(classifyAlert({ kind: 'obras', text: 'Por obras de mejora, los trenes de la línea C-5 circularán por vía única.' }).category, 'otros');
  assert.equal(classifyAlert(null).category, 'otros');
});

test('countByCategory cuenta todas las categorías, también las vacías', () => {
  const counts = countByCategory([
    { kind: 'cancelacion', text: 'Renfe marca como cancelado el tren 123.' },
    { kind: 'incidencia', text: 'Huelga desconvocada.' },
    { kind: 'otros', text: 'Ascensor fuera de servicio.' },
  ]);
  assert.deepEqual(counts, { huelga: 1, cancelacion: 1, retraso: 0, otros: 1 });
});
