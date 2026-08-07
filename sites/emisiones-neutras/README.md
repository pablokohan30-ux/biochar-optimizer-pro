# Sitio de Emisiones Neutras

Reconstrucción del sitio `emisionesneutras.com` como código, para reemplazar el
site-builder actual.

Vive en este repo pero es una app independiente: tiene su propio `package.json`,
su propio build y su propio deploy. No comparte nada con Biochar Optimizer Pro ni
afecta su build.

## Estado

**Scaffold listo, contenido pendiente.** La dirección de diseño y el
posicionamiento están definidos; falta cerrar qué proyectos se publican y
conseguir fotografía. Ver "Decisiones abiertas".

```bash
cd sites/emisiones-neutras
npm install
npm run dev      # servidor de desarrollo
npm run check    # tsc --noEmit
npm run build    # build de producción a dist/
```

## Posicionamiento

**Todos los proyectos convergen en el residuo, y todos se digitalizan.**

No es una plataforma de tecnologías sueltas ni un producto único: es una empresa
que trabaja el residuo desde varios ángulos —energía, materiales, carbono
capturado— con la medición digital como capa transversal.

```
Residuo  →  Transformación  →  Producto
              (pirólisis, digestión anaerobia, polimerización)
                        ↓
              Digitalización: medición, trazabilidad, certificación
```

## Arquitectura de marca

- **Kotatte** — la SAPI. No es marca de cara al público: pie legal y material de
  inversores solamente.
- **Emisiones Neutras** — la marca comercial. Dueña del sitio y del dominio.
- **Nexus Carbon**, **CAUDAL**, **BiocharIA**, **Landopp.uy** — proyectos que
  Emisiones Neutras estructura y opera. Van como fichas dentro del sitio, con
  nombre propio, no como marcas separadas.

## Dirección de diseño

Estructura de "una marca, proyectos con nombre propio"; la trayectoria como
apertura (la razón por la que confían la estructuración de un proyecto); estética
de fondo hueso con serif de display y mono para datos; y fotografía real como
material protagonista.

Renders y desarrollo de la decisión:
https://claude.ai/code/artifact/a7bad586-5bf5-4877-aa62-1bd67baaee23

## Contenido: qué está verificado y qué no

Material de base: `Emisiones_Neutras_MDC_Deck_V1` (abril 2026) y
`Brochure_Emisiones_Neutras_Corregido_Final` (agosto 2025), ambos en Drive.

**Los dos están parcialmente desactualizados.** Varios ítems ya se cayeron, así
que nada se publica sin confirmación explícita.

| Ítem | Estado |
|---|---|
| CAUDAL — dMRV digital | **Va** |
| BiocharIA | **Va** — falta alcance; definir si es lo mismo que biocharpro.io |
| Nexus Carbon | **Va** — falta alcance: qué produce, dónde, con qué socios |
| Landopp.uy — biopolímero de cáñamo, Uruguay | **Va** — Emisiones Neutras participa |
| Biogás y biometano | **Va bajo NDA** — mencionar la capacidad, nunca las contrapartes |
| Deal Altitude (+165.000 t CDR) | **Caído** — no publicar |
| EcoGaia como socio | **Caído** — no publicar |
| MDC | **Caído** — era una propuesta, derivó en CAUDAL |
| Igasamex | **No publicar** — cae bajo el NDA de biogás |
| STI Colombia | **No publicar** — cae bajo el NDA de biogás |
| Biochar Corrientes | Sin confirmar — ¿sobrevive sin EcoGaia? ¿FASA continúa? |
| Nopal | Sin confirmar — es lo único que muestra el sitio actual |
| Uruguay (Arboreal, Alur) | Sin confirmar |
| Track record (200.000+ créditos, tetra pak FSC, SHCP) | Sin confirmar |
| Datos de contacto (CDMX, teléfono, emails) | Sin confirmar |

## Decisiones abiertas

1. **Qué son BiocharIA y Nexus Carbon.** Son dos de las cuatro fichas de proyecto
   y están vacías. De cada una: qué hace, dónde, en qué etapa.
2. **¿Biochar Corrientes y Nopal siguen?** Corrientes es la ficha más fuerte
   posible si sobrevive sin EcoGaia.
3. **Fotografía.** El diseño depende de fotos reales: planta en operación,
   pantalla de plataforma, biochar, territorio, producto de cáñamo, y una banda
   ancha de equipo en campo.
4. **Idioma.** Propuesta: español primero, inglés completo detrás.
5. **Editabilidad.** Si el copy tiene que cambiarse sin pasar por un dev, hay que
   sumar un CMS liviano (~1 día de trabajo).

## Nota sobre el sitio actual

No pudo leerse: `emisionesneutras.com` está bloqueado por la política de egress
de red del entorno de desarrollo. Todo el contenido de referencia salió de Drive.
Para leerlo en vivo hay que habilitar el dominio en la configuración de red del
environment y abrir una sesión nueva.
