# Fase 12 · Avisos clasificados y revisión de seguridad

Rama: `avisos`

## 1. Avisos clasificados (pestaña Incidencias)

El panel «Avisos de la red» ahora separa los avisos en cuatro grupos, con un filtro y su recuento:

| Grupo | Cuándo entra un aviso | Ejemplo real (20 nov 2026) |
|---|---|---|
| **Huelgas** | El texto habla de huelga, servicios mínimos o paros (también en euskera, «greba»). Si Renfe dice que está desconvocada, aparece la etiqueta verde «Desconvocada». | «Desconvocada la huelga prevista por el sindicato de maquinistas SEMAF para el día 23 de noviembre» |
| **Cancelaciones** | Trenes que Renfe marca como cancelados, o avisos que hablan de trenes suprimidos/cancelados. | «Renfe marca como cancelado el tren Regional 15040…» |
| **Retrasos** | Renfe informa de trenes que circulan con retraso (también en euskera, «atzerapen»). «Sin retrasos» no cuenta. | «…circula por Xàtiva con 15 minutos de retraso» |
| **Otros avisos** | Obras, ascensores, accesos… (se mantiene su etiqueta: Obras, Incidencia o Aviso). | «Ascensor de vía 2 fuera de servicio» |

- Si un aviso de huelga habla también de trenes suprimidos, cuenta como **huelga**.
- Orden de la lista: huelgas, cancelaciones, retrasos y otros. Dentro de cada grupo se respeta el orden de Renfe.
- El buscador de la página sigue filtrando los avisos, y los recuentos de los filtros se actualizan con él.
- **Solo información oficial:** únicamente se usan los avisos que publica Renfe (a través de RadarDeTrenes). No se
  añade ni se deduce ningún aviso; solo se clasifican por su texto.

Con los avisos de hoy salen 98: 4 huelgas (todas desconvocadas), 28 cancelaciones, 2 retrasos y 64 otros.

Código:
```
src/lib/alertCategory.js           Reglas de clasificación (sin React)
src/lib/alertCategory.test.js      6 pruebas con textos reales de Renfe
src/components/incidents/AlertsPanel.jsx   Filtros, etiquetas y orden
src/index.css                      Estilos .alert-cat, .alert-filter, .alert-calledoff
```

## 2. Revisión de seguridad

La web **no tiene ninguna forma de cambiar datos**: no hay usuarios, formularios que se envíen a un servidor ni base de
datos. El servidor de datos (`server/index.mjs`) solo lee de RadarDeTrenes y lo reenvía. Aun así se ha reforzado:

| Antes | Ahora | Por qué |
|---|---|---|
| El servidor escuchaba en todas las redes | Solo en `127.0.0.1` (este ordenador) | Desde otro equipo de la red Wi-Fi no se puede entrar |
| `access-control-allow-origin: *` | Sin cabecera CORS | Otras webs no pueden leer nuestra API desde el navegador de un visitante |
| `/api/trains/<lo que sea>` se reenviaba a la fuente | Solo identificadores tipo `ld-15063` o `c-…`; si no, error 400 | Evita peticiones raras a la API externa |
| `/api/trains?codes=` aceptaba cualquier texto | Solo números de tren (hasta 6 cifras), sin repetir y como mucho 40 | Lo mismo |
| La caché crecía sin límite | Máximo 500 respuestas guardadas | Nadie puede llenar la memoria pidiendo trenes inventados |
| Los errores devolvían el mensaje interno | Mensaje genérico; el detalle queda en la consola del servidor | No se enseñan detalles internos |
| — | Cabecera `x-content-type-options: nosniff` | El navegador no reinterpreta las respuestas |
| Solo GET | GET y HEAD; el resto da 405 con la cabecera `allow` | Lo dice el estándar HTTP |

`vite.config.js` apunta ahora el proxy a `127.0.0.1:3001`, porque el servidor ya no escucha en otras direcciones.

Revisado y sin problemas:
- No se usa `dangerouslySetInnerHTML`, `eval` ni nada que meta HTML: el texto de los avisos se muestra como texto.
- Los enlaces externos llevan `rel="noreferrer"`.
- No hay contraseñas, claves ni archivos `.env` en el repositorio.
- `localStorage` solo guarda el tema y el billete de «Mi billete», que se borra solo.
- `npm audit --omit=dev`: 0 vulnerabilidades en lo que llega a la web.

Pendiente:
- `npm audit` avisa de dos dependencias de desarrollo (Vite 7.1.12 y fflate). No llegan a la web publicada. `npm audit fix`
  no pudo conectar con el servicio de npm; hay que repetirlo más tarde.
- Que **nadie pueda cambiar el código en GitHub** depende de los ajustes del repositorio, no del código: en
  `DA-ETSISI/CivicPulseAI` → Settings → Branches (o Rules) se puede proteger `main` para que solo entren cambios por pull
  request aprobado.

## Comprobado
- `npm test`: 27 pruebas (21 anteriores + 6 nuevas), todas pasan. `npm run build` compila.
- API: `/api/health` → 200; `/api/trains/ld-15063` → 200; `/api/trains/..%2F..%2Fetc` → 400; `POST` y `DELETE` → 405;
  desde la IP de la red local → sin acceso.
- Navegador: filtros «Todos 98 · Huelgas 4 · Cancelaciones 28 · Retrasos 2 · Otros avisos 64», etiqueta «Desconvocada» en
  las huelgas, sin errores en consola, y en móvil (375 px) sin scroll lateral.
