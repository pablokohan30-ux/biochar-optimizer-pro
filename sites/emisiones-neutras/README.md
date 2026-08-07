# Sitio de Emisiones Neutras

Reconstrucción del sitio `emisionesneutras.com` como código, para reemplazar el
site-builder actual.

Vive en este repo pero es una app independiente: tiene su propio `package.json`,
su propio build y su propio deploy. No comparte nada con Biochar Optimizer Pro ni
afecta su build.

## Estado

**Scaffold listo, contenido pendiente.** Falta definir qué se publica antes de
escribir el copy y las páginas. Ver "Decisiones abiertas" más abajo.

```bash
cd sites/emisiones-neutras
npm install
npm run dev      # servidor de desarrollo
npm run check    # tsc --noEmit
npm run build    # build de producción a dist/
```

## Arquitectura de marca (definida)

- **Kotatte** — la SAPI. No es marca de cara al público: pie legal y material de
  inversores solamente.
- **Emisiones Neutras** — la marca comercial. Es la dueña del sitio y del dominio.
- **Nexus Carbon**, **CAUDAL** — proyectos que Emisiones Neutras estructura y opera.
  Van como fichas dentro del sitio, con nombre propio, no como marcas separadas.

## Dirección de diseño propuesta

Una marca arriba, proyectos con nombre propio en el medio, trayectoria como la
razón por la que a Emisiones Neutras le confían la estructuración de un proyecto.

Renders de las cuatro direcciones evaluadas (A Plataforma, B Producto/MDC,
C Operador, D Estructurador — la propuesta):
https://claude.ai/code/artifact/a7bad586-5bf5-4877-aa62-1bd67baaee23

## Contenido: qué está verificado y qué no

El material de base es `Emisiones_Neutras_MDC_Deck_V1` (abril 2026) y
`Brochure_Emisiones_Neutras_Corregido_Final` (agosto 2025), ambos en Drive.

**El brochure de agosto 2025 está desactualizado.** Dos de sus ítems ya se
cayeron, así que el resto se trata como no verificado hasta confirmación explícita.

| Ítem | Estado |
|---|---|
| Deal Altitude (+165.000 t CDR) | **Caído** — no publicar |
| EcoGaia como socio | **Caído** — no publicar |
| MDC (deck abril 2026) | Vigente |
| CAUDAL (dMRV digital) | Vigente |
| Nexus Carbon | Vigente — falta alcance: qué produce, dónde, con qué socios |
| Biochar Corrientes | Sin confirmar — ¿sigue en pie sin EcoGaia? ¿FASA continúa? |
| Uruguay (Arboreal, Alur) | Sin confirmar |
| Igasamex (biometano) | Sin confirmar |
| STI Colombia | Sin confirmar |
| Landopp.uy (biopolímeros) | Sin confirmar — ¿va acá o es empresa aparte? |
| Nopal | Sin confirmar — es lo único que muestra el sitio actual |
| Track record (200.000+ créditos, tetra pak FSC, SHCP) | Sin confirmar |
| Datos de contacto (CDMX, teléfono, emails) | Sin confirmar |

## Decisiones abiertas

1. Confirmar la dirección de diseño (D + apertura de C).
2. Qué proyectos entran en la grilla, y qué es Nexus Carbon. Con menos de cuatro
   fichas la home se ve floja.
3. Idioma: propuesta es español primero con inglés completo detrás. El sitio
   actual está en inglés y el material más nuevo en español.
4. Si el copy tiene que ser editable sin pasar por un dev, hay que sumar un CMS
   liviano (~1 día de trabajo).

## Nota sobre el sitio actual

No pudo leerse: `emisionesneutras.com` está bloqueado por la política de egress
de red del entorno de desarrollo. Todo el contenido de referencia salió de Drive.
Para leer el sitio en vivo hay que habilitar el dominio en la configuración de red
del environment.
