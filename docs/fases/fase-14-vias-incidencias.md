# Fase 14 · Vías reales en el mapa de Incidencias

## Qué ha cambiado
El mapa en directo de **Incidencias** dibujaba las líneas de larga distancia como rectas de estación a estación
(por ejemplo, Madrid–Córdoba era una línea recta). Ahora usa la **misma red ferroviaria real** que el mapa de la
portada: las vías de OpenStreetMap (`public/data/railways-es.geojson`).

- **Color:** se mantiene el gris claro de las antiguas vías de alta velocidad (`--track-av`: `#b9b5aa` en claro,
  `#46525e` en oscuro, 1,8 px), solo en este mapa (`.incidents-map .rail-net-base`). La portada sigue en beige.

- Componente reutilizado: `RailNetwork` (`src/components/live/RailNetwork.jsx`) y el hook `useRailways`.
  El GeoJSON se descarga una sola vez y lo comparten los dos mapas.
- Las vías de **Cercanías** se siguen dibujando encima, como antes.
- Con el filtro **«solo Cercanías»** la red no se dibuja (igual que antes las líneas de larga distancia).
- Si la red de OpenStreetMap no carga, el mapa vuelve a las rectas de antes, para que nunca se quede sin líneas.
- Leyenda: «Vía de alta velocidad» pasa a **«Red ferroviaria»**, con el mismo gris. Se añade la atribución
  «Vías © OpenStreetMap» arriba a la derecha (licencia ODbL).

## Archivos
- `src/components/incidents/LiveMap.jsx`
- `src/index.css`: `.incidents-map .rail-net-base` y `.legend-track--rail`

## Comprobado
Incidencias en escritorio, tema oscuro: las vías siguen el trazado real (Madrid–Cuenca–Valencia, Madrid–Zaragoza…),
las de Cercanías se ven encima, y la leyenda y la atribución aparecen sin tapar nada.
