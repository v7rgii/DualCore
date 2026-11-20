# Fase 16 · Últimos retoques: avisos traducidos y billetes con transbordo

Rama: `ultimos-retoques`

## 1. Traducción de los avisos (Incidencias)

En «Avisos de la red» hay un selector **Idioma**: Original, Castellano, English, Català, Euskara y Galego.

- **Original** es el texto tal y como lo publica Renfe (por defecto).
- Al elegir otro idioma se traducen los avisos que se ven en pantalla (de 10 en 10 al pulsar «Ver más avisos»).
- Cada aviso traducido tiene un botón **«Ver original»** para comparar.
- Un aviso arriba deja claro que es **traducción automática** y que, ante cualquier duda, vale el texto original.
  Así se sigue usando solo información oficial: la traducción no añade ni quita nada.
- **Avisos de Euskadi**: Renfe los publica en los dos idiomas oficiales («euskera // castellano»). Para euskera y
  castellano se muestra la parte oficial, sin traducir; para los demás idiomas se traduce la parte en castellano.
- Si la traducción falla, el aviso se queda en su idioma original y se avisa de cuántos no se han podido traducir.

Cómo funciona:
- La web pide la traducción a nuestro servidor (`GET /api/traducir?lang=en&ids=…`, máximo 10 avisos por petición).
- El servidor solo traduce avisos que existen ahora mismo (por su identificador): no traduce textos cualquiera.
- Las traducciones se guardan en memoria (servidor y navegador) para no repetirlas.
- **Servicio de traducción:** Google Traductor, en su versión web sin clave (`translate.googleapis.com`). Era el único
  servicio gratuito que respondía. No es una API oficial con contrato, así que podría dejar de funcionar; en ese caso la
  web sigue mostrando el original. Para cambiar de servicio basta con cambiar `translateText()` en `server/index.mjs`.

Ejemplo real (Línea C2 de València):
- Original: «…circula por La Pobla Llarga con 17 minutos de retraso.»
- Català: «…circula per la Pobla Llarga amb 17 minuts de retard.»
- Galego: «…circula por La Pobla Llarga con 17 minutos de atraso.»

## 2. Billetes con transbordo

Si no hay ningún tren directo entre origen y destino ese día, el buscador ofrece **opciones con un transbordo**, con los
horarios oficiales de Renfe:

- Arriba sale el aviso «No hay trenes directos este día. Estas son las mejores opciones con un transbordo».
- Cada tarjeta muestra los dos trenes (tipo y número), dónde se cambia y cuánto se espera.
- El transbordo puede ser en la **misma estación** (mínimo 15 min) o en **otra estación de la misma ciudad**, por
  ejemplo Madrid-Atocha → Madrid-Chamartín (mínimo 60 min, y se avisa con «Cambio de estación»). Espera máxima: 4 h.
- Solo se enseñan las opciones que merecen la pena: se quita cualquiera que salga antes y llegue después que otra.
  Como mucho 10.
- Al desplegar una opción se ven las horas de cada tren y las tarifas. El precio es la suma de los dos trenes (orientativo,
  como el resto). Si los dos trenes tienen Básico/Elige/Prémium se mantienen; si no, hay una tarifa «Combinado».
- El resumen de compra muestra «1 transbordo» y los dos trenes con sus horas. La huella de carbono suma los dos tramos.
- Funciona también en la vuelta.

Ejemplo real: **Granada → Santiago de Compostela** (sin directo): 11:04 → 20:18, Intercity 02087 hasta Madrid-Atocha y AVE
04375 desde Madrid-Chamartín (cambio de estación, 2 h 32 min de espera), desde 98,15 €.

Código:
```
src/lib/timetable.js                 searchConnections() y joinLegs(); searchTrains() reutiliza legOf()
src/lib/connections.test.js          5 pruebas con un horario de ejemplo
src/pages/TicketsPage.jsx            findJourneys(): directos y, si no hay, con transbordo
src/components/tickets/TrainList.jsx Tarjeta con transbordo, aviso y detalle de los dos trenes
src/components/tickets/BookingSummary.jsx  Los dos trenes en el resumen
src/lib/useAlertTranslations.js      Idiomas y petición de traducciones
src/components/incidents/AlertsPanel.jsx   Selector de idioma y «Ver original»
server/index.mjs                     /api/traducir
```

## Comprobado
- `npm test`: 32 pruebas (27 anteriores + 5 de transbordos), todas pasan. `npm run build` compila.
- `/api/traducir` en los 5 idiomas con avisos reales; un idioma no admitido da 400; ids inventados no se traducen.
- Navegador: avisos en catalán con «Ver original»; Granada → Santiago muestra 2 opciones con transbordo y el resumen los dos
  trenes (98,15 €). En móvil (375 px) sin scroll lateral.
