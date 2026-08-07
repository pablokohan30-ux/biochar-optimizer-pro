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

## La tesis

**Un residuo tratado financia el tratamiento del siguiente.**

Transformar un residuo en un insumo renovable; medir, cuantificar y verificar lo
que se produce y lo que se evita emitir; emitir certificados con los mecanismos
que ya existen; y usar ese ingreso para financiar el proyecto siguiente. Cuando
el circuito cierra, tratar residuos deja de ser un costo y pasa a ser una
actividad que se financia sola.

El cuello de botella no es el mecanismo —I-RECs, CELs, I-TRACK(G), los registros
de carbono ya existen— sino el dato que lo alimenta. De ahí que la digitalización
atraviese todo.

La asesoría no es el negocio: es cómo se monetiza el criterio mientras los
proyectos maduran.

### Regla de tono (decidida por Pablo)

**El sitio no reclama autoría ni anterioridad.** Nada de "lo pensamos antes que
nadie", ni pedidos de crédito por haber anticipado un instrumento. El argumento
se sostiene en el mecanismo, no en quién lo vio primero; si el mecanismo se
explica bien, la conexión se entiende sola.

Consecuencia práctica: I-TRACK(G) se menciona como **contexto de mercado** —prueba
de que el circuito está normado y es real— y nunca como credencial propia. Los
superlativos del brochure ("primera empresa del mundo en…") quedan atenuados por
la misma regla, con la decisión de restituirlos pendiente.

### El circuito, en detalle

| | Etapa | Qué pasa |
|---|---|---|
| 1 | Residuo | Forestal, orgánico, agroindustrial, urbano |
| 2 | Transformación | Pirólisis, digestión anaerobia, polimerización |
| 3 | Insumo renovable | Biochar, biometano, bio-CO2, biopolímeros |
| 4 | Medición y verificación | El dato que convierte una operación en activo certificable |
| 5 | Certificado y financiamiento | El ingreso que paga el proyecto siguiente |

Mecanismos de certificación existentes que cierran la etapa 5: I-RECs para
electricidad renovable, CELs para cumplimiento regulatorio en México,
I-TRACK(G) para biogás y biometano (lanzado por la I-TRACK Foundation y Global
Gas Tracking en mayo de 2026), y los registros de carbono para remociones.

### Alcance de CAUDAL

Mayor de lo que sugería el material inicial. Además del metano, cubre CELs
—cumplimiento regulatorio ante la CRE en México, 1 CEL por MWh— e I-RECs, con
alcance potencial a la generación distribuida de América Latina (instalaciones
de menos de 500 kW: miles de puntos chicos que hoy nadie mide bien).

## Modelo de negocio y su consecuencia en el sitio

Tres líneas de ingreso reales, sobre un mismo dominio (residuos y carbono):

| Capa | Qué es | A quién le habla |
|---|---|---|
| **Asesoramos** | Consultoría, medición, estructuración | Clientes industriales |
| **Desarrollamos y operamos** | Proyectos propios y en sociedad | Socios e inversores |
| **Digitalizamos** | CAUDAL, biocharpro.io | Compradores y desarrolladores |

La progresión es también la historia de la empresa en orden: veinte años
asesorando, después operar proyectos propios, después construir el software.
Eso sostiene el argumento competitivo: las herramientas las construye quien
opera, no una startup que nunca pisó una planta.

**La asesoría es hoy la línea que más factura, pero no es el negocio.** El
negocio es la estructuración de proyectos; la asesoría es cómo se monetiza el
criterio mientras los proyectos maduran. El sitio no debe presentarse como una
consultora.

Consecuencias en la arquitectura de la home:

- El centro no es la grilla de proyectos ni el catálogo de servicios: es **la
  prueba de criterio anticipatorio**, y detrás el patrón que la explica.
- Los proyectos son **evidencia**, no producto. Con tres alcanza; deja de ser un
  problema que la grilla esté flaca tras las bajas.
- La asesoría necesita su propia ruta y un camino claro al contacto, porque es
  la que sostiene la caja — pero no encabeza.

El sitio sirve a las cuatro audiencias mediante rutas separadas, pero la home
prioriza la asesoría. "Para todos" funciona a nivel de sitio, no a nivel de
primera pantalla.

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
| biocharpro.io | **Va** — es el nombre correcto del producto; "BiocharIA" se descarta |
| Nexus Carbon | **Va** — falta alcance: qué produce, dónde, con qué socios |
| Landopp.uy — biopolímero de cáñamo, Uruguay | **Va** — Emisiones Neutras participa |
| Nopal | **Va, reformulado** — ver abajo |
| Biogás y biometano | **Va bajo NDA** — mencionar la capacidad, nunca las contrapartes |
| Deal Altitude (+165.000 t CDR) | **Caído** — no publicar |
| EcoGaia como socio | **Caído** — no publicar |
| MDC | **Caído** — era una propuesta, derivó en CAUDAL |
| Biochar Corrientes | **Caído** — no publicar |
| Igasamex | **No publicar** — cae bajo el NDA de biogás |
| STI Colombia | **No publicar** — cae bajo el NDA de biogás |
| Uruguay (Arboreal, Alur) | Sin confirmar |
| Track record (200.000+ créditos, tetra pak FSC, SHCP) | Sin confirmar |
| Datos de contacto (CDMX, teléfono, emails) | Sin confirmar |

### El caso del nopal

Metodología propia de captura de carbono en nopal, desarrollada internamente y
nunca aprobada por una casa certificadora.

Se mantiene en el sitio, pero **no como proyecto en acreditación** —que es lo que
dice el sitio actual y sugiere que está por salir— sino como I+D metodológico
propio. La secuencia real es un activo narrativo: desarrollaron una metodología,
chocaron con el proceso de certificación, y de ahí sale la apuesta por la
digitalización de la medición.

Dos restricciones al escribirlo:

- El 60 % de captura durante la vida de la planta es un **resultado propio**, no
  un dato validado por un registro. Hay que decirlo así.
- Contarlo sin sonar a reproche contra los registros: son los mismos que tienen
  que aprobar los proyectos que vienen.

## Tono

Registro **declarativo y específico**: decir qué se hace, con qué alcance y con
qué evidencia. Nada de frases publicitarias, juegos de palabras ni aforismos —
el lector es un gerente industrial o un inversor, y ese registro le resta
seriedad al mensaje.

## Contexto de mercado (investigación, agosto 2026)

Relevante para el posicionamiento:

- **El cuello de botella del mercado es la verificación, no la oferta de
  proyectos.** Hay casos documentados de desarrolladores abandonando registros
  por demoras — Biofix retiró un REDD+ de 180.000 ha de Verra y lo movió a otro
  registro. El VCM viene de lo que en NACW 2026 llamaron su "crisis de mediana
  edad". Esto encuadra el caso del nopal como modo de falla del sistema, no como
  fracaso propio.
- **El dMRV se está estandarizando y la ventana se cierra.** El Global Carbon
  Council lanzó TRACE, su primera plataforma dMRV aprobada, en mayo de 2026.
  Los compradores pagan un premium reportado de hasta 217 % por créditos de
  vintages recientes con metodologías modernas.
- **Hueco competitivo.** Los comparables se dividen entre software puro
  (Sylvera, Sweep, Cloverly) y desarrolladores de proyecto puros. Emisiones
  Neutras hace las dos cosas: es una debilidad si se lee como falta de foco, y
  una ventaja si se argumenta que las herramientas las construye quien opera.
- **Biochar.** Es el líder del CDR por volumen. Precios Puro en torno a
  USD 125-145 por CORC. El mercado de biochar en Latinoamérica pasaría de
  USD 0,47 B (2025) a USD 1,49 B (2034), CAGR 13,7 %.

## Decisiones abiertas

Ya resuelto: la audiencia es "todas" con rutas separadas y la home priorizando
asesoría; la facturación viene de las tres capas, con la asesoría al frente.

Lo que falta para escribir copy:

1. **Qué se vende exactamente en asesoría, hoy.** Qué contrata un cliente, qué
   recibe, en cuánto tiempo, y quién firma del lado del cliente. La lista de
   servicios del brochure (Plan Integral de Carbono, mitigación y compensación,
   acreditación y comercialización, I+D+i) es de agosto 2025 y no está verificada.
2. **Cómo llegaron los últimos clientes.** Si vinieron por referencia, el sitio
   no tiene que captar sino **cerrar** a quien ya conoce la empresa y la está
   chequeando. Cambia el copy y cambia qué se pone arriba.
3. **Qué capa debería mandar en dos años.** No es lo mismo una consultora con
   software adentro que una plataforma financiada por consultoría. Si el upside
   está en CAUDAL, el sitio tiene que vender asesoría sin quedar encasillado
   como consultora — se puede, pero hay que decidirlo antes de escribir.
4. **Alcance de Nexus Carbon.** Qué hace, dónde, en qué etapa.
5. **Fotografía.** El diseño se apoya en fotos reales; no hay forma de
   conseguirlas desde el entorno de desarrollo.
6. **Idioma.** Propuesta: español primero, inglés completo detrás.
7. **Editabilidad.** Si el copy tiene que cambiarse sin pasar por un dev, hay
   que sumar un CMS liviano (~1 día de trabajo).

## Nota sobre el sitio actual

No pudo leerse: `emisionesneutras.com` está bloqueado por la política de egress
de red del entorno de desarrollo. Todo el contenido de referencia salió de Drive.
Para leerlo en vivo hay que habilitar el dominio en la configuración de red del
environment y abrir una sesión nueva.
