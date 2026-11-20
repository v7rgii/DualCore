# Documentación de VíaClara

VíaClara es una web ciudadana sobre la red ferroviaria española: mapa de alta velocidad, búsqueda de billetes,
incidencias en tiempo real y redes de Cercanías por provincia. Se desarrolla para la hackathon de Orange
(2Campus1Code) con React + Vite y un pequeño servidor Node.

## Cómo arrancarlo

```bash
npm install        # dependencias
npm run data       # descarga los datos abiertos y genera public/data/*.json
npm run dev        # arranca la web (http://localhost:5173) y el servidor de datos (puerto 3001)
npm test           # pruebas automáticas de la lógica (src/lib/*.test.js)
```

## Fases del desarrollo

Cada fase explica qué se hizo, por qué y dónde está el código.

| Fase | Contenido |
|---|---|
| [Fase 1](fases/fase-01-mapa-inicial.md) | Primer mapa de la red ferroviaria con datos de Renfe |
| [Fase 2](fases/fase-02-billetes-menu-modo-oscuro.md) | Menú, modo oscuro, solo alta velocidad, Portugal y Francia, sección Billetes |
| [Fase 3](fases/fase-03-ramas-incidencias-rutas.md) | Ramas `incidencias` y `rutas`, incidencias en tiempo real con GPS |
| [Fase 4](fases/fase-04-radardetrenes.md) | Datos de RadarDeTrenes en toda la web y seguimiento de trenes |
| [Fase 5](fases/fase-05-rediseno-rutas.md) | Rediseño de Rutas: comunidades, Cercanías por provincia, tipografía y color |
| [Fase 6](fases/fase-06-paradas-y-cabeceras.md) | Rutas: etiquetas de paradas, resaltar paradas, cabeceras de línea y corrección del acordeón |
| [Fase 7](fases/fase-07-remates-y-servicio.md) | Rutas: remates de línea y líneas en servicio según la hora (con `?hora=` para probar) |
| [Fase 8](fases/fase-08-compensaciones.md) | Incidencias: calculadora de compensaciones por retraso, guía para reclamar y derechos del pasajero |
| [Fase 9](fases/fase-09-mi-billete.md) | Mi billete (itinerario, transbordos, cuenta atrás, QR con privacidad), mapa de Rutas más grande, aviso rojo y hover de comunidades |
| [Fase 10](fases/fase-10-huella-carbono.md) | Billetes: CO₂ que ahorras en tren frente al coche, con factores oficiales del MITECO y Renfe |
| [Fase 11](fases/fase-11-red-ferroviaria.md) | Red ferroviaria de viajeros de fondo en el mapa en directo |
| [Fase 12](fases/fase-12-fronteras-y-movil.md) | Fronteras ajustadas, sin vías en las islas y formulario de billetes en móvil |
| [Fase 13](fases/fase-13-avisos-y-seguridad.md) | Incidencias: avisos clasificados en huelgas, cancelaciones y retrasos; revisión de seguridad del servidor |
| [Fase 14](fases/fase-14-billete-prueba.md) | Pestaña «Billete prueba»: la demo de Mi billete con datos ficticios, también en producción |
| [Fase 15](fases/fase-15-ultimos-retoques.md) | Avisos traducidos a 5 idiomas y billetes con transbordo cuando no hay tren directo |

## Fuentes de datos

- **Renfe Data** (datos abiertos oficiales): GTFS de Alta Velocidad, Larga y Media Distancia, y GTFS de Cercanías y Rodalies.
- **RadarDeTrenes** (API pública que reúne datos de Renfe y ADIF): posiciones en tiempo real, retrasos, avisos, trazados y puntualidad.
- **Límites provinciales** (derivados de IGN/CNIG) y **países vecinos** (Natural Earth).
- Las provincias se identifican por su **código INE**, que se usa para asignarlas a su comunidad autónoma.

## Estructura del código

```
scripts/build-data.mjs   Descarga y transforma los datos abiertos (npm run data)
server/index.mjs         Servidor de tiempo real: flota, retrasos, avisos y trazados (con caché)
src/pages/               Páginas: Mapa + Billetes (HomePage), Incidencias, Rutas (MapPage)
src/components/          Componentes reutilizables (mapa, paneles, billetes, incidencias)
src/lib/                 Lógica sin interfaz: geometría del mapa, zoom, datos, horarios, etiquetas
public/data/             Datos ya preparados que carga la web
```
