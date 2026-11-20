# Uso de IA

**Herramienta:** Claude Code (Anthropic), con el modelo Claude Opus 5.5. No hemos usado otras IA, y la web no usa IA.

**Para qué la usamos:** como asistente de programación. Escribió buena parte del código (36 de 46 commits llevan
su firma): datos abiertos, servidor, mapas, secciones, diseño, tests y documentación en [`docs/`](docs/README.md).

**Qué hicimos nosotros:** decidir qué construir y cómo (reglas, diseño, privacidad), revisar cada cambio en la web y
decidir cuándo hacer commit y subirlo. La IA no hacía commits sin nuestro permiso.

**Cómo lo comprobamos:** tests automáticos (`npm test`), prueba manual de cada cambio y fuentes oficiales citadas en
cada fase.
