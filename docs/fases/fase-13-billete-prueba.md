# Fase 13 · Pestaña «Billete prueba»

## Qué es
Una pestaña nueva en el menú, justo después de «Mi billete», que abre directamente la **demo de Mi billete**
con un viaje de ejemplo (Madrid Puerta de Atocha → Córdoba → Málaga María Zambrano, datos ficticios).
Sirve para enseñar la sección en la presentación sin tener un billete real a mano.

## Cómo funciona
- No es una página nueva: es la misma `MyTicketPage` con la prop `demoMode` (`src/App.jsx`, ruta `#/billete-prueba`).
  Cada pestaña tiene su propia `key`, así que el estado de la demo no se mezcla con el de «Mi billete».
- Al entrar arranca el escenario **Normal**. Con la barra de demo se puede elegir otro escenario (retraso leve,
  transbordo en riesgo, transbordo perdido, tren cancelado, cambio de vía, 2 transbordos, tren ya salido, viaje
  terminado) y mover la **hora simulada** para ver la cuenta atrás en cada momento.
- Sigue funcionando `?demo=<escenario>` y `?hora=HH:MM`, por ejemplo
  `http://localhost:5173/?demo=perdido&hora=11:20#/billete-prueba`.
- **«Salir de la demo»**, «Borrar mi billete» e «Introducir otro billete» llevan a «Mi billete».

## Privacidad
- La pestaña **no lee ni toca** el billete guardado en el dispositivo (`localStorage`): no lo carga al entrar,
  no lo guarda y no lo borra. Comprobado con un billete guardado de prueba: sigue ahí después de usar la demo.
- No consulta retrasos en directo ni lanza avisos del navegador (igual que la demo de la Fase 9).

## Cambio respecto a la Fase 9
Antes la demo solo existía en desarrollo (`npm run dev`). Ahora el fixture (`src/dev/mi-billete-demo.json`,
datos inventados, nada personal) también entra en el build de producción, en un archivo aparte de unos 5 kB
que solo se descarga al abrir «Billete prueba». Así la pestaña funciona también con `npm run share`.
En «Mi billete» de producción no cambia nada: el enlace de ejemplo sigue usando horarios reales.

## Archivos
- `src/components/Header.jsx`: nueva entrada `billete-prueba` en el menú.
- `src/App.jsx`: ruta `billete-prueba` → `<MyTicketPage demoMode />`.
- `src/pages/MyTicketPage.jsx`: prop `demoMode` (título propio, arranque en la demo, sin tocar lo guardado).
- `src/dev/ticketDemo.jsx`: solo comentarios y la etiqueta accesible de la barra.

## Extra: botones − / + del selector de viajeros (Billetes)
Para que se note que se pulsan (`src/components/tickets/PassengerPicker.jsx` y `.stepper` en `src/index.css`):
- **Al pulsar** el botón se hunde (escala 0,86 en 80 ms, con un halo turquesa) y al soltar vuelve con un pequeño
  rebote (`--ease-settle`).
- **Al pasar el ratón** se tiñe de turquesa (`--accent-soft` de fondo, borde y signo en `--accent`).
- **El número** entra deslizándose hacia arriba al sumar y hacia abajo al restar (220 ms). El contenedor con
  `aria-live` no cambia, así que el lector de pantalla sigue anunciando el valor nuevo.
- Los botones desactivados no se animan. Con «reducir movimiento» solo cambia el color.

## Comprobado
Escritorio, tema oscuro: la pestaña abre la demo con cuenta atrás, itinerario, transbordo y mapa; «Salir de la
demo» lleva a «Mi billete»; un billete guardado no se borra. `npm test` (21 tests) y `vite build` sin errores.
