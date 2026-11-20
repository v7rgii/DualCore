# Uso de IA en VíaClara

## Herramienta
- **Claude Code** (app de escritorio de Claude, pestaña *Code*), de Anthropic, con el modelo **Claude Opus 5.5**.
- La hemos usado los dos miembros del equipo como asistente de programación: lee el repositorio, propone y escribe
  código, ejecuta comandos (`npm`, `git`, tests) y comprueba la web en un navegador integrado.
- No hemos usado otras herramientas de IA, ni IA dentro de la aplicación: VíaClara no llama a ningún modelo de IA.

## Cuánto ha participado
- **33 de los 42 commits** llevan la firma `Co-Authored-By: Claude Opus 5.5`: la IA escribió buena parte del código
  y lo hicimos commit nosotros. Los otros 9 son la plantilla inicial del repositorio (README y este archivo) y
  algunos merges hechos a mano.
- La IA nunca ha hecho commits ni ha subido nada a GitHub por su cuenta: solo cuando se lo hemos pedido.

## Cómo trabajamos con ella
Le dimos unas reglas fijas en [`CLAUDE.md`](CLAUDE.md): React + Vite, interfaz moderna y responsive, componentes
reutilizables, documentar cada fase, explicar los pasos de forma sencilla, comprobar que todo funciona antes de
terminar, no borrar archivos sin preguntar, no hacer commits sin permiso y usar datos abiertos oficiales.

El ciclo de cada funcionalidad fue siempre el mismo:
1. **Nosotros** decidimos qué hacer y lo describimos (a veces con capturas de pantalla).
2. **La IA** revisa el código existente y, si hay decisiones abiertas, nos pregunta antes de empezar. Esas
   respuestas están en los apartados «Decisiones tomadas con el equipo» de cada fase.
3. **La IA** lo implementa, pasa los tests (`npm test`) y lo prueba en el navegador: escritorio y móvil, tema claro
   y oscuro.
4. **La IA** lo documenta en [`docs/fases/`](docs/fases), con qué se hizo, por qué y en qué archivos.
5. **Nosotros** lo revisamos en la web, pedimos correcciones y decidimos cuándo hacer commit, merge y push.

## Qué aportó la IA
| Área | Contribución | Fases |
|---|---|---|
| Datos abiertos | Scripts que descargan y transforman los GTFS de Renfe, los límites provinciales (códigos INE) y la red ferroviaria de OpenStreetMap | 1, 2, 10, 11 |
| Backend | Servidor Node de tiempo real sobre RadarDeTrenes, con caché, reintentos y trazados aprendidos | 3, 4 |
| Mapas | Mapas SVG con d3 (zoom, etiquetas sin solapes, fronteras con Portugal y Francia, Cercanías por provincia) | 1, 2, 5, 6, 7, 11 |
| Funcionalidades | Billetes, Incidencias, Rutas, calculadora de compensaciones, Mi billete con QR y cuenta atrás, huella de carbono | 2–10 |
| Diseño | Sistema de color y tipografía, modo oscuro, animaciones que respetan «reducir movimiento», versión móvil | 2, 5, 9, 11, 12 |
| Calidad | Tests de la lógica (`src/lib/*.test.js`), modo demo con datos ficticios para probar cada situación | 8, 9, 10, 12 |
| Git | Ramas por funcionalidad, resolución de conflictos y mensajes de commit | 3 en adelante |

## Qué decidimos nosotros
- La idea del producto, las secciones y el orden de trabajo.
- Las reglas de negocio, por ejemplo: un tren se considera parado si su GPS no se mueve más de 40 m en 3 minutos;
  la web solo muestra trenes, no autobuses; los porcentajes de compensación y los factores de CO₂ salen de fuentes oficiales.
- El diseño: la tipografía Fira Sans, los colores de las vías, qué se anima y qué no.
- La privacidad de «Mi billete»: el billete se procesa en el dispositivo, no se guardan datos personales y no se
  intenta descifrar el QR de Renfe.
- La revisión visual de cada cambio. Por ejemplo, detectamos que tras un pull el mapa no coincidía con el de GitHub
  y le pedimos que lo corrigiera.

## Cómo comprobamos lo que hizo
- Tests automáticos con `node --test` (21 pruebas de la lógica de compensaciones y huella de carbono).
- Prueba manual de cada cambio en la web, y la IA también en su navegador integrado.
- Las cifras oficiales (compensaciones de Renfe, factores de emisión del MITECO) están citadas con su fuente en
  la fase correspondiente, para poder comprobarlas.
- Cada fase está documentada en [`docs/`](docs/README.md), así que cualquiera del equipo puede explicar cualquier
  parte del código.
