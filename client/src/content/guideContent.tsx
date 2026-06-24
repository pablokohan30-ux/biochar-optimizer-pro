/**
 * Bilingual content for /guide.
 *
 * Pattern: editorial long-form copy that would be unmaintainable if shoved
 * through i18next's flat key namespace. Each language is a self-contained
 * object with fully-formed React nodes for section bodies, step lists,
 * callouts, etc. The Guide.tsx page reads this module, picks the
 * language-matching tree based on `i18n.language`, and renders it.
 *
 * When adding a new section: update `SectionId` in Guide.tsx AND add matching
 * keys to BOTH `es.sections` and `en.sections`. TypeScript will enforce the
 * shape via `GuideContent`.
 */

import { Link } from "wouter";
import {
  Upload, ClipboardList, AlertTriangle, Leaf, Droplet, TrendingUp,
  Thermometer, Target, Sparkles, Clock, Beaker, FlaskConical, ArrowRight,
} from "lucide-react";
import type { ReactNode } from "react";
import { EXPERT_MONTHLY_USD } from "@/lib/pricingCatalog";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Lang = "es" | "en";

export type SectionId =
  | "como-intro" | "como-simular" | "como-lab" | "como-proyectos"
  | "como-ai-builder" | "como-lca" | "como-submission" | "como-pdd" | "como-operativo"
  | "porque-intro" | "porque-biochar" | "porque-metodologias"
  | "porque-modelo" | "porque-hc" | "porque-addic-base-perm"
  | "resultados-intro" | "resultados-simulador" | "resultados-lca"
  | "resultados-score" | "resultados-metodologia" | "resultados-journey";

export interface GuideSection {
  eyebrow: string;
  title: string;
  body: ReactNode;
}

export interface GuideTocItem { id: SectionId; label: string }
export interface GuideTocGroup { group: string; items: GuideTocItem[] }

export interface GuidePart {
  eyebrow: string;  // e.g. "Parte 1 · Operativa"
  title: string;    // e.g. "El cómo"
}

export interface GuideContent {
  nav: {
    pricing: string;
    tryFree: string;
    back: string;
    contentLabel: string;  // TOC header "Contenido" / "Contents"
  };
  hero: {
    badge: string;
    title: string;
    subtitle: ReactNode;
  };
  parts: {
    como: GuidePart;
    porque: GuidePart;
    resultados: GuidePart;
  };
  toc: GuideTocGroup[];
  sections: Record<SectionId, GuideSection>;
  cta: {
    title: string;
    subtitle: string;
    primary: string;
    secondary: string;
  };
}

// ─── Helpers used in both languages (pure JSX, no copy) ─────────────────────

function LinkPill({ href, children, external = false }: { href: string; children: ReactNode; external?: boolean }) {
  if (external) {
    return <a href={href} className="text-primary hover:underline">{children}</a>;
  }
  return <Link href={href}><span className="text-primary hover:underline cursor-pointer">{children}</span></Link>;
}

function AnchorLink({ id, children }: { id: string; children: ReactNode }) {
  return <a href={`#${id}`} className="text-primary hover:underline">{children}</a>;
}

// ─── SPANISH ─────────────────────────────────────────────────────────────────

const es: GuideContent = {
  nav: {
    pricing: "Precios",
    tryFree: "Probar gratis",
    back: "Volver",
    contentLabel: "Contenido",
  },
  hero: {
    badge: "Guía del usuario",
    title: "Todo lo que necesitas saber para usar biocharpro.io bien.",
    subtitle: (
      <>
        El <strong className="text-foreground">cómo</strong> del producto, el{" "}
        <strong className="text-foreground">porqué</strong> detrás de los números, y qué significa cada{" "}
        <strong className="text-foreground">resultado</strong>. Pensado para que lo uses con un café al lado.
        No hace falta que lo leas entero — la navegación te lleva directo a lo que buscas.
      </>
    ),
  },
  parts: {
    como:       { eyebrow: "Parte 1 · Operativa",       title: "El cómo" },
    porque:     { eyebrow: "Parte 2 · Fundamentos",      title: "El porqué" },
    resultados: { eyebrow: "Parte 3 · Interpretación",   title: "Los resultados" },
  },
  toc: [
    {
      group: "El cómo",
      items: [
        { id: "como-intro",       label: "Primer vistazo" },
        { id: "como-simular",     label: "Simular biochar" },
        { id: "como-lab",         label: "Subir análisis de laboratorio" },
        { id: "como-proyectos",   label: "Crear y gestionar proyectos" },
        { id: "como-ai-builder",  label: "AI Builder: del borrador al proyecto" },
        { id: "como-lca",         label: "Correr LCA" },
        { id: "como-submission",  label: "Exportar paquete para certificadora" },
        { id: "como-pdd",         label: "PDD Builder" },
        { id: "como-operativo",   label: "Operar una planta (Etapas 3 y 4)" },
      ],
    },
    {
      group: "El porqué",
      items: [
        { id: "porque-intro",            label: "Por qué existe esto" },
        { id: "porque-biochar",          label: "Qué es biochar y por qué importa" },
        { id: "porque-metodologias",     label: "Por qué cubrimos 6 metodologías" },
        { id: "porque-modelo",           label: "Cómo funciona nuestro modelo" },
        { id: "porque-hc",               label: "Por qué el H/C importa tanto" },
        { id: "porque-addic-base-perm",  label: "Additionality, baseline, permanence" },
      ],
    },
    {
      group: "Los resultados",
      items: [
        { id: "resultados-intro",         label: "Cómo leer lo que ves" },
        { id: "resultados-simulador",     label: "Outputs del simulador" },
        { id: "resultados-lca",           label: "Outputs del LCA" },
        { id: "resultados-score",         label: "BiocharPro Score" },
        { id: "resultados-metodologia",   label: "Elegir metodología" },
        { id: "resultados-journey",       label: "Qué esperar por mes" },
      ],
    },
  ],
  sections: {
    "como-intro": {
      eyebrow: "Por dónde empezar",
      title: "Primer vistazo al producto",
      body: (
        <>
          <p>biocharpro.io tiene tres capas que funcionan por separado o juntas:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Simulador</strong> (gratis) — eliges una biomasa y una temperatura y, en segundos, ves qué biochar saldría. Sirve para decidir materia prima y parámetros antes de gastar en laboratorio.</li>
            <li><strong>Proyectos</strong> (Analyst+) — guardas la simulación como proyecto con ubicación, plan de planta y puntaje contra 6 rutas de certificación: 5 activas hoy + Gold Standard en preparación.</li>
            <li><strong>Paquetes para certificadora</strong> (Developer+) — exportas lo necesario para Puro.earth, Verra, Isometric, EBC o Rainbow, y además dejas Gold Standard prearmado.</li>
          </ul>
          <p>
            No hace falta seguir un orden. Si ya tienes un proyecto pensado, arranca por <LinkPill href="/app">el simulador</LinkPill>.
            Si quieres entender qué es biochar primero, salta a <AnchorLink id="porque-biochar">el porqué</AnchorLink>.
          </p>
        </>
      ),
    },
    "como-simular": {
      eyebrow: "5 minutos",
      title: "Cómo simulo mi primer biochar",
      body: (
        <ol className="list-decimal pl-5 space-y-3 not-prose">
          <li>
            <strong>Elegí una biomasa.</strong> Tienes 48 opciones gratis (aserrín de pino, cáscara de café, paja de arroz, rastrojo de maíz, bagazo, etc.).
            Si tu biomasa no esta en el listado, hay búsqueda con IA gratis. Si tienes un PDF de laboratorio, súbelo y la IA extrae los valores
            (ver <AnchorLink id="como-lab">subir análisis</AnchorLink>).
          </li>
          <li>
            <strong>Ajusta la temperatura de pirólisis.</strong> El control va de 300 a 900 °C. Para biochar agronómico <strong>550–650 °C</strong>{" "}
            suele ser el mejor rango: balancea rendimiento, estabilidad y propiedades de suelo. Por encima de 700 °C maximizas carbono fijo, pero baja el rendimiento.
          </li>
          <li>
            <strong>Ajusta el tiempo de residencia.</strong> El valor por defecto es 30 min. Muy por debajo (5–10 min) suele dar un biochar menos estable.
            Muy por arriba (&gt;60 min) genera rendimientos decrecientes. La mayoría de plantas operativas trabajan entre 15 y 45 min.
          </li>
          <li>
            <strong>Elegí el objetivo de calidad.</strong> Tres presets: <em>MAX_CARBON</em> (maximizar contenido de C),{" "}
            <em>AGRONOMY</em> (optimizar para aplicación en suelo), <em>BALANCED</em> (por defecto).
            Cuando pulsas "Optimum", el simulador te sugiere T° y tiempo para esa biomasa y ese objetivo.
          </li>
          <li>
            <strong>Leé los resultados.</strong> Salta a <AnchorLink id="resultados-simulador">los resultados del simulador</AnchorLink>{" "}
            para entender qué significa cada número. TL;DR: H/Corg &lt; 0.7 es la línea roja para certificación.
          </li>
        </ol>
      ),
    },
    "como-lab": {
      eyebrow: "Analyst+",
      title: "Cómo subo un análisis de laboratorio",
      body: (
        <>
          <p>
            Si ya pediste análisis proximal + elemental a un lab, no hace falta cargar los valores a mano.
            Carga el PDF y la IA (Gemini 2.5) extrae automáticamente:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Composición elemental: C, H, N, S, O, cenizas, humedad, volátiles, carbono fijo</li>
            <li>Parámetros del biochar: H/Corg, BET, pH, volumen de poro</li>
            <li>Metales pesados: Pb, Cd, Cr, Cu, Ni, Zn, Hg, As (µg/g)</li>
            <li>Parámetros de pirólisis usados en el test: T°, tiempo</li>
          </ul>
          <div className="border border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <Upload className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">Cómo hacerlo</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              Desde la pantalla principal del simulador, arriba hay un botón <em>"Subir PDF de laboratorio"</em>. Arrastra el archivo o
              elígelo. En 10–15 segundos verás los valores extraídos precargados en un formulario. Revísalos, ajusta lo que haga
              falta y guárdalos como biomasa personalizada dentro de tu cuenta.
            </div>
          </div>
          <p>
            Hay una opción <em>"permitir uso público"</em> — si la marcas, el análisis se suma a nuestra base de datos pública
            para mejorar el modelo. No compartimos tu identidad. Si prefieres mantenerlo privado, destildala.
          </p>
        </>
      ),
    },
    "como-proyectos": {
      eyebrow: "Analyst+",
      title: "Cómo creo y gestiono proyectos",
      body: (
        <>
          <p>
            Un "proyecto" en biocharpro.io es una configuración guardada (biomasa + T° + tiempo + ubicación + metadatos) que
            puedes volver a abrir, editar y compartir. Cada proyecto tiene un <strong>BOP ID</strong> público
            (ej: <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">BOP-2026-0042</code>) que sirve como identificador
            en el PDF de submission.
          </p>
          <ol className="list-decimal pl-5 space-y-3 not-prose">
            <li>
              <strong>Guarda una simulación como proyecto.</strong> Desde el simulador, usa el botón <em>"Save as Project"</em>.
              Se abre un modal para poner nombre, descripción, ubicación con autocompletado y capacidad de planta en t/h.
            </li>
            <li>
              <strong>Explora el detalle en <code>/projects/:id</code>.</strong> Ves el mapa interactivo (Leaflet + OpenStreetMap),
              análisis regional (clima de Open-Meteo + suelo de SoilGrids), el puntaje contra 6 rutas de certificación y los botones de exportación.
            </li>
            <li>
              <strong>Edita parámetros y guarda.</strong> Cambias T°, tiempo u objetivo de calidad y guardas. Los cambios persisten.
              El BOP ID no cambia.
            </li>
            <li>
              <strong>Comparte el proyecto.</strong> Cada proyecto tiene una página pública en <code>/verify/:bopId</code> con el
              nivel de detalle que tú elijas (privado / resumen / completo). Útil para compartir con compradores o verificadores sin darles
              acceso completo a tu cuenta.
            </li>
          </ol>
        </>
      ),
    },
    "como-ai-builder": {
      eyebrow: "Engineer+",
      title: "Cómo usar AI Builder sin duplicar trabajo",
      body: (
        <>
          <p>
            El <strong>AI Builder</strong> sirve cuando ya tienes una hipótesis razonable de proyecto y quieres un{" "}
            <strong>paquete documental inicial</strong> rápido para alinear a ingeniería, certificación o una conversación comercial.
            Si todavía estás explorando biomasa, temperatura o rendimiento, conviene arrancar por el{" "}
            <LinkPill href="/app">simulador</LinkPill> y recién después pasar a este flujo.
          </p>
          <ol className="list-decimal pl-5 space-y-3 not-prose">
            <li>
              <strong>Completa lo mínimo.</strong> Nombre, biomasa, capacidad y país. Si además sumas ubicación, metodología objetivo
              o un PDF de laboratorio, el borrador sale más aterrizado.
            </li>
            <li>
              <strong>Lee el paquete AI como primer pase, no como versión final.</strong> El objetivo es darte estructura, lenguaje técnico
              y una primera hipótesis de dossier. No reemplaza validación humana ni datos operativos reales.
            </li>
            <li>
              <strong>Abre el PDD editable.</strong> Desde el paquete AI pasas a <code>/pdd/:id</code>, donde completas huecos,
              corriges supuestos y conviertes el borrador en el proyecto estándar que realmente vas a trabajar.
            </li>
            <li>
              <strong>Continúa en /projects.</strong> Ahí el proyecto deja de ser solo narrativa: ajustas parámetros, exportas para
              certificadora y, si la planta ya opera, avanzas a evidencia, offtake, comunidad y paquete de auditoría.
            </li>
          </ol>
          <div className="border border-indigo-500/30 bg-indigo-500/5 rounded-xl p-4 not-prose">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              Regla práctica
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              <strong>Simulador</strong> para explorar. <strong>AI Builder</strong> para armar el primer dossier.{" "}
              <strong>PDD Builder</strong> para editarlo en serio. <strong>Projects</strong> para operarlo, exportarlo y llevarlo a auditoría o go-to-market.
            </div>
          </div>
        </>
      ),
    },
    "como-lca": {
      eyebrow: "Analyst+",
      title: "Cómo corro un LCA",
      body: (
        <>
          <p>
            El LCA (Life-Cycle Assessment) calcula el <em>net CO₂e</em> removido por tu proyecto — la diferencia entre el carbono
            que secuestra el biochar y las emisiones que genera producirlo y aplicarlo.
          </p>
          <ol className="list-decimal pl-5 space-y-3 not-prose">
            <li>
              <strong>Desde cualquier simulación, toca "Run LCA".</strong> Te lleva a <code>/lca</code> con el formulario
              prerrellenado (C, H, rendimiento, biomasa y humedad). No tienes que volver a cargarlos.
            </li>
            <li>
              <strong>Completa los datos operacionales.</strong> Capacidad de planta (t/h), horas de operación anuales,
              distancia de transporte de biomasa y biochar, tipo de energía (eléctrica vs fósil), y proporción de electricidad
              renovable. Si no sabes algún valor, deja el valor por defecto: suele ser conservador.
            </li>
            <li>
              <strong>Revisa el desglose.</strong> El LCA divide emisiones en Scope 1 (combustible del proceso), Scope 2 (electricidad)
              y Scope 3 (transporte + aplicación). Al final te muestra <strong>net CO₂e removido por tonelada de biochar</strong>{" "}
              alineado con Puro.earth Ed. 2025.
            </li>
          </ol>
          <div className="border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">Importante</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              Si el net CO₂e da <strong>negativo</strong>, tu proyecto no calificaría como remoción de carbono — las emisiones del
              proceso superan al carbono secuestrado. Eso pasa con biomasas húmedas + transporte largo + electricidad fósil.
              Revisar humedad y logística suele arreglarlo.
            </div>
          </div>
        </>
      ),
    },
    "como-submission": {
      eyebrow: "Developer+ (Analyst+ para la guía)",
      title: "Cómo exporto un paquete para certificadora",
      body: (
        <>
          <p>
            Cuando tu puntaje esta en verde y ya tienes datos operacionales, es hora de exportar el paquete para la certificadora.
            Tienes 6 rutas cubiertas: 5 metodologías activas hoy y Gold Standard en preparación:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Puro.earth</strong> (Analyst+) — CORC · USD 130–250/t</li>
            <li><strong>Isometric</strong> (Developer+) — permanencia 200/1000 años · USD 180–350/t</li>
            <li><strong>Verra VM0044</strong> (Developer+) — VCS + CCP aprobado · USD 120–180/t</li>
            <li><strong>Rainbow Standard</strong> (Analyst+) — ruta respaldada por ICVCM · USD 120–200/t</li>
            <li><strong>EBC</strong> (Analyst+) — estándar de calidad · no emite créditos</li>
            <li><strong>Gold Standard</strong> (Engineer+) — en preparación · prearmado de ODS + VVB</li>
          </ul>
          <ol className="list-decimal pl-5 space-y-3 not-prose">
            <li>
              <strong>Abre tu proyecto en /projects/:id.</strong> Baja hasta el <em>BiocharPro Score</em>. Ahí están las 6 pestañas: 5 metodologías activas más Gold Standard en preparación, cada una con sus
              criterios. Marca los criterios manuales que tu proyecto cumple. Se guardan en backend y se sincronizan entre dispositivos.
            </li>
            <li>
              <strong>Botón Export (Developer+).</strong> Elige metodología y formato: <strong>JSON</strong> (legible por máquina,
              con la estructura completa de criterios, evaluadores y metadatos) o <strong>PDF</strong> (listo para enviar o imprimir).
            </li>
            <li>
              <strong>Botón "Cómo enviar" (Analyst+).</strong> Abre un modal con instrucciones paso a paso por certificadora:
              portal, email de contacto, tiempos estimados y los pasos concretos del proceso. También incluye alertas útiles
              (por ejemplo: Isometric pide panel de revisión por pares y Verra exige EBC aguas arriba).
            </li>
          </ol>
        </>
      ),
    },
    "como-pdd": {
      eyebrow: "Engineer+",
      title: "Cómo uso el PDD Builder",
      body: (
        <>
          <p>
            El PDD (Project Design Document) es el documento central que presentas a la certificadora. Puede tener 40+ páginas.
            Nuestro PDD Builder lo divide en <strong>11 frentes de trabajo</strong> (biomasa, pirólisis, LCA, monitoreo, etc.) con
            preguntas específicas por cada uno.
          </p>
          <div className="border border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <ClipboardList className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">Cómo funciona</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              Abres <code>/pdd/:projectId</code>. Cada frente tiene una pestaña. Respondes las preguntas, con validación contextual
              y autocompletado donde corresponde. El progreso se guarda en localStorage en tiempo real. Al terminar, exportas a PDF.
            </div>
          </div>
          <p>
            El PDD Builder es <strong>deliberadamente guiado</strong>: asume que apuntas a Puro.earth Ed. 2025. Para otras metodologías el mapeo
            puede requerir ajustes manuales en el PDF final.
          </p>
        </>
      ),
    },
    "como-operativo": {
      eyebrow: "Expert",
      title: "Operar una planta y cerrar acuerdos de compra (Etapas 3 y 4)",
      body: (
        <>
          <p>
            El simulador, LCA, paquete para certificadora y PDD Builder te llevan hasta tener un <strong>proyecto certificable</strong>.
            Pero en 2026 ninguno de los grandes compradores (Microsoft, Frontier, Shell, Altitude) firma contrato solo con papeles.
            Microsoft fue explícito en abril 2026: <em>"no compramos más de proyectos pre-FID"</em>. Exigen{" "}
            <strong>evidencia operativa real</strong>, <strong>trazabilidad de punta a punta del char</strong> hasta el usuario final, e{" "}
            <strong>impacto comunitario documentado</strong>, no solo un plan.
          </p>
          <p>
            Los módulos de las Etapas 3 y 4 (plan Expert) son exactamente esa capa. Son 6 herramientas que se usan en{" "}
            <code>/projects/:id</code> una vez que la planta esta operativa:
          </p>
          <div className="border border-indigo-500/30 bg-indigo-500/5 rounded-xl p-4 not-prose my-4">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
              Etapa 3 — Operación auditable
            </div>
            <ul className="space-y-2 text-xs md:text-sm text-foreground/80 leading-relaxed list-disc pl-5">
              <li><strong>Registro de evidencia operativa</strong> — cargas lotes de pirólisis, análisis de laboratorio, incidentes y lecturas de energía. Cada registro se valida automáticamente contra umbrales metodológicos (H/Corg, temperatura, tiempo de residencia). Es la "caja negra" de la planta para el VVB.</li>
              <li><strong>Cadena de custodia de envíos</strong> — por cada envío generas una URL pública con token UUID para enviarla al usuario final (agricultor, cementera, vivero). Ese usuario confirma qué hizo con el biochar, cuántas toneladas aplicó, dónde y con qué cultivo. Sin esa confirmación la trazabilidad queda débil.</li>
              <li><strong>Registro de impacto comunitario</strong> — historial vivo de reuniones, reclamos y resoluciones, contrataciones locales, compras locales, inversiones comunitarias, donaciones de biochar y monitoreo ambiental. Luego la IA arma el reporte de impacto semestral o anual que los compradores aceptan como evidencia social real, no como PDF decorativo.</li>
            </ul>
          </div>
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 not-prose my-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3">
              Etapa 4 — Salida comercial
            </div>
            <ul className="space-y-2 text-xs md:text-sm text-foreground/80 leading-relaxed list-disc pl-5">
              <li><strong>Chequeo de preparación comercial</strong> — la IA compara tu operación real contra los criterios públicos de compra de Microsoft, Frontier, Shell y Altitude. Devuelve un puntaje 0-100% más una lista priorizada de brechas por comprador. Costo: ~USD $0.001 por chequeo.</li>
              <li><strong>Priorización de buyers</strong> — la inversa del chequeo anterior: dada tu operación, ¿a quién conviene acercarte primero? La IA ordena a los 4 buyers por probabilidad de firma en 6 meses y te propone el siguiente paso más lógico para cada uno.</li>
              <li><strong>Paquete de auditoría</strong> — un solo PDF listo para imprimir que consolida evidencia operativa, cadena de custodia, comunidad y resumen ejecutivo asistido por IA. Es el documento que envías al VVB o al equipo comprador.</li>
            </ul>
          </div>
          <p>
            El flujo completo: cargas evidencia todos los días, registras cada envío con confirmación del usuario final, documentas cada interacción comunitaria y, al cerrar un período, armas el paquete de auditoría junto con el chequeo de preparación comercial.
          </p>
          <div className="border border-border rounded-xl p-4 bg-card not-prose my-4">
            <div className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              Cadencia recomendada para no ahogarte
            </div>
            <ol className="list-decimal pl-5 space-y-2 text-xs md:text-sm text-foreground/80 leading-relaxed">
              <li><strong>Cada turno o lote:</strong> registra pirolisis, energía, incidentes y cualquier análisis puntual. No esperes al cierre del mes.</li>
              <li><strong>Cada envío:</strong> crea el registro de envío en el momento en que sale de planta y comparte el enlace de confirmación ese mismo día.</li>
              <li><strong>Cada evento comunitario:</strong> sube reuniones, reclamos, contrataciones o compras locales apenas ocurren. Si lo dejas para después, se vuelve memoria, no evidencia.</li>
              <li><strong>Cada mes o trimestre:</strong> corre Preparación para buyers, revisa Priorización de buyers y genera el Paquete de auditoría. Ese cierre periódico es lo que convierte datos sueltos en una narrativa defendible.</li>
            </ol>
          </div>
          <p>{`Todo el recorrido está en el plan Expert (USD ${EXPERT_MONTHLY_USD}/mes). Si ya tienes planta operativa, esta es la capa que cierra la brecha entre "proyecto certificable" y "proyecto con contrato firmado".`}</p>
        </>
      ),
    },
    "porque-intro": {
      eyebrow: "Contexto",
      title: "Por qué existe biocharpro.io",
      body: (
        <>
          <p>
            Desarrollar un proyecto de biochar certificado hoy lleva <strong>6–18 meses</strong> y cuesta <strong>USD 50K+</strong>{" "}
            en consultoría. El cuello de botella no es la biomasa ni la tecnología — es la <strong>documentación</strong>.
            PDDs de 40 páginas, LCAs con 20 variables, mapeos contra metodologías que cambian de versión cada año.
          </p>
          <p>
            Nuestra apuesta: la mayoría de esos 6 meses se pueden resolver con software. Un simulador calibrado, un modelo de LCA con
            valores por defecto sensatos y una evaluación automática contra las metodologías oficiales te dan el 80% del PDD en unas horas.
            El 20% restante (análisis de laboratorio del biochar real, VVB, consulta con actores locales) sigue siendo trabajo humano — pero
            empiezas parados desde un terreno firme, no desde cero.
          </p>
        </>
      ),
    },
    "porque-biochar": {
      eyebrow: "Fundamentos",
      title: "Qué es biochar y por qué importa",
      body: (
        <>
          <p>
            Biochar es el sólido rico en carbono que queda cuando pirolizas biomasa (residuos agrícolas, forestales, lodos, estiércol)
            en ausencia o con muy poco oxígeno. El proceso — pirólisis — se hace típicamente entre 350 y 800 °C.
          </p>
          <p>
            Lo que lo vuelve interesante desde la perspectiva de CDR (Carbon Dioxide Removal) es esto: el carbono del biochar es{" "}
            <strong>estable durante siglos o milenios</strong>. La biomasa, si la dejás tirada, se descompone y libera CO₂ en 1–10 años.
            Si la pirolizas, una fracción grande del carbono (el "fixed carbon") queda atrapado en estructuras aromáticas que los
            microbios del suelo no pueden romper.
          </p>
          <div className="not-prose grid grid-cols-1 md:grid-cols-3 gap-3 my-5">
            <div className="border border-border rounded-xl p-4 bg-card">
              <Leaf className="w-5 h-5 text-green-500 mb-2" />
              <div className="text-xs font-bold mb-1">Secuestro real</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">100+ años cuando H:Corg &lt; 0.7 · 1000+ años cuando &lt; 0.4</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <Droplet className="w-5 h-5 text-blue-500 mb-2" />
              <div className="text-xs font-bold mb-1">Co-beneficios</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">Retención de agua + CIC + menos N₂O en suelos agrícolas</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <TrendingUp className="w-5 h-5 text-primary mb-2" />
              <div className="text-xs font-bold mb-1">Escalable</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">Biomasa disponible globalmente · tecnología de bajo CAPEX relativo</div>
            </div>
          </div>
          <p>
            El IPCC estima potencial global de <strong>2.5 Gt CO₂e/año</strong> solo con biochar. Hoy se están emitiendo &lt;1% de ese potencial.
          </p>
        </>
      ),
    },
    "porque-metodologias": {
      eyebrow: "Contexto de mercado",
      title: "Por qué cubrimos 6 metodologías y no una sola",
      body: (
        <>
          <p>Cada certificadora tiene su óptica. Entender la diferencia te ayuda a elegir hacia dónde apuntar:</p>
          <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
            <div className="border border-green-500/30 bg-green-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-green-500 mb-1">Puro.earth</div>
              <div className="text-[11px] text-muted-foreground mb-2">CORC · líder por volumen</div>
              <div className="text-xs leading-relaxed">El más usado en biochar. Proceso relativamente rápido (6–9 meses), H/Corg ≤ 0.7, precio USD 130–250/t. Ideal para first-movers.</div>
            </div>
            <div className="border border-blue-500/30 bg-blue-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-blue-500 mb-1">Isometric</div>
              <div className="text-[11px] text-muted-foreground mb-2">Permanencia 200/1000 años · rigor máximo</div>
              <div className="text-xs leading-relaxed">La más estricta técnicamente. Pide H/Corg &lt; 0.4 para la clase de 1000 años. Precio premium (USD 180–350/t), con un proceso más largo.</div>
            </div>
            <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-purple-500 mb-1">Verra VM0044</div>
              <div className="text-[11px] text-muted-foreground mb-2">VCS · CCP aprobado · escala grande</div>
              <div className="text-xs leading-relaxed">Registro más grande del mundo. Requiere EBC previo. Plazo 12–24 meses, precio USD 120–180/t.</div>
            </div>
            <div className="border border-pink-500/30 bg-pink-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-pink-500 mb-1">Rainbow Standard</div>
              <div className="text-[11px] text-muted-foreground mb-2">Ruta ICVCM-backed · ciclos más cortos</div>
              <div className="text-xs leading-relaxed">Alternativa más rápida para operadores que ya tienen datos sólidos. El rango depende más del buyer y de la clase de permanencia que del estándar en sí.</div>
            </div>
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-emerald-500 mb-1">EBC</div>
              <div className="text-[11px] text-muted-foreground mb-2">Quality standard europeo</div>
              <div className="text-xs leading-relaxed">NO emite créditos de carbono. Pero es requisito previo para Verra VM0044 y abre la puerta al mercado orgánico europeo.</div>
            </div>
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-amber-500 mb-1">Gold Standard</div>
              <div className="text-[11px] text-muted-foreground mb-2">En preparación</div>
              <div className="text-xs leading-relaxed">Metodología biochar en desarrollo desde dic. 2024. 0 proyectos registrados a hoy. La usamos para prearmar ODS y VVB mientras esperamos la publicación final.</div>
            </div>
          </div>
          <p>
            La ventaja de biocharpro.io es que <strong>te mostramos las 6 rutas en paralelo</strong>. No tienes que elegir ciegamente —
            ves tu puntaje en 5 metodologías activas y dejas Gold Standard prearmado por si termina encajando después.
          </p>
        </>
      ),
    },
    "porque-modelo": {
      eyebrow: "Cómo calculamos los números",
      title: "Cómo funciona nuestro modelo de pirólisis",
      body: (
        <>
          <p>
            Nuestro modelo es <strong>empírico</strong> — no una simulación de dinámica molecular. Está calibrado contra literatura
            revisada por pares publicada por CINDECA/CONICET (Centro de Investigación y Desarrollo en Procesos Catalíticos, Argentina)
            y trabajos de otros grupos reconocidos.
          </p>
          <p>Input → Output:</p>
          <div className="border border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <Beaker className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">El mapeo</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              Biomasa (composición elemental + proximal) + Temperatura + Tiempo de residencia
              <br /><span className="text-muted-foreground">↓</span><br />
              Biochar (C, H, O, N, cenizas), Yield (%), H/Corg, BET, pH, rendimiento por tipo de producto (sólido/líquido/gas)
            </div>
          </div>
          <p>
            Las correlaciones son específicas por <strong>categoría de biomasa</strong> (forestal, agrícola, residuos húmedos, etc.)
            porque el comportamiento térmico varía mucho entre celulosa, hemicelulosa y lignina.
          </p>
          <p className="text-xs text-muted-foreground italic">
            Dónde el modelo es más fuerte: biomasas lignocelulósicas tradicionales (aserrín de pino, cáscara de arroz, rastrojo de maíz, cáscara de café,
            bagazo de caña). Donde tiene más incertidumbre: biomasas atípicas (lodos, RSU mixtos, macroalgas). Para esas, siempre
            recomendamos análisis de laboratorio del biochar real antes de certificar.
          </p>
        </>
      ),
    },
    "porque-hc": {
      eyebrow: "El parámetro estrella",
      title: "Por qué el H/C importa tanto",
      body: (
        <>
          <p>
            Si hay un solo número que te tienes que quedar de toda esta guía, es <strong>H/Corg</strong> (ratio molar hidrógeno sobre
            carbono orgánico del biochar).
          </p>
          <p>
            ¿Por qué? Porque es el mejor <em>proxy</em> conocido para estabilidad del carbono. H/Corg bajo = estructura aromática
            policíclica = carbono que dura siglos. H/Corg alto = moléculas con hidrógenos colgando = biochar que se descompone
            rápido y no califica como remoción de carbono.
          </p>
          <div className="not-prose border border-border rounded-xl overflow-hidden my-4">
            <div className="bg-muted/40 px-4 py-2 border-b border-border">
              <div className="text-xs font-bold uppercase tracking-wider">Umbrales por metodología</div>
            </div>
            <div className="divide-y divide-border">
              <div className="px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">H/Corg &lt; 0.7</div>
                  <div className="text-[11px] text-muted-foreground">Línea roja universal. Puro.earth, EBC, Verra VM0044 lo exigen.</div>
                </div>
                <span className="text-xs font-mono bg-green-500/10 text-green-500 border border-green-500/20 rounded px-2 py-0.5 flex-shrink-0">BC-2 · 100+ años</span>
              </div>
              <div className="px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">H/Corg &lt; 0.4</div>
                  <div className="text-[11px] text-muted-foreground">Solo Isometric (clase de 1000 años) y Verra en su clase de alta permanencia lo exigen.</div>
                </div>
                <span className="text-xs font-mono bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded px-2 py-0.5 flex-shrink-0">BC-1 · 1000+ años</span>
              </div>
            </div>
          </div>
          <p>
            H/Corg baja <strong>exponencialmente con la temperatura</strong>. A 350 °C en aserrín de pino tienes ~0.9 (no certificable).
            A 550 °C bajas a ~0.5. A 700 °C ya estás bajo 0.3 (premium).
          </p>
          <div className="border border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <Thermometer className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">Regla general</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              Si la certificación es tu objetivo, <strong>550–650 °C es el mínimo operacional</strong> para casi cualquier biomasa.
              Por debajo vas a tener problemas de estabilidad; por arriba vas a perder rendimiento.
            </div>
          </div>
        </>
      ),
    },
    "porque-addic-base-perm": {
      eyebrow: "Tres conceptos que aparecen en todas las metodologías",
      title: "Adicionalidad, línea base y permanencia",
      body: (
        <>
          <p>Vas a ver estos tres términos una y otra vez en cualquier metodología. Entenderlos te ahorra confusión:</p>
          <div className="not-prose space-y-3 my-4">
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center">A</div>
                <div className="font-bold text-sm">Adicionalidad</div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                El proyecto <strong>no existiría</strong> sin el ingreso por créditos de carbono. Si tu planta de biochar ya era
                rentable sin vender CORCs, no tienes adicionalidad → no calificas. Se demuestra con: análisis financiero (NPV/IRR),
                excedente regulatorio (no es obligatorio por ley), y barrera de prácticas comunes.
              </div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center">B</div>
                <div className="font-bold text-sm">Línea base</div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Qué habría pasado con la biomasa <strong>si tu proyecto no existiera</strong>. Si se hubiera quemado a cielo abierto →
                emisión alta → tu crédito es mayor. Si se hubiera compostado con secuestro parcial → crédito menor. Si tenía un uso
                alternativo de largo plazo (madera para muebles) → cero crédito.
              </div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center">P</div>
                <div className="font-bold text-sm">Permanencia</div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Cuánto tiempo el carbono queda secuestrado. Para biochar depende de H/Corg + T° de pirólisis + ambiente de aplicación
                (suelo agrícola vs concreto vs lecho marino). Cada certificadora usa un <em>factor de permanencia</em> que descuenta créditos
                según estos parámetros.
              </div>
            </div>
          </div>
        </>
      ),
    },
    "resultados-intro": {
      eyebrow: "Antes de arrancar",
      title: "Cómo leer lo que ves",
      body: (
        <>
          <p>
            biocharpro.io te devuelve 4 tipos de resultados: <strong>caracterización del biochar</strong> (propiedades químicas/físicas),{" "}
            <strong>LCA</strong> (balance de carbono), <strong>BiocharPro Score</strong> (cumplimiento frente a certificadoras), y{" "}
            <strong>recomendaciones de metodología</strong> (cuál elegir).
          </p>
          <p>
            Todos los números tienen <em>significado operativo</em> — no son solo decorativos. Las próximas secciones te explican cada uno.
          </p>
        </>
      ),
    },
    "resultados-simulador": {
      eyebrow: "Caracterización del biochar",
      title: "Cómo leer los resultados del simulador",
      body: (
        <div className="not-prose space-y-2">
          <MetricRowES symbol="C"      name="Carbono"                meaning="Contenido total de carbono en el biochar seco. Para certificación necesitas ≥10% (Puro.earth), ≥50% (Verra VM0044 e Isometric)." typical="Típico: 50–85%" />
          <MetricRowES symbol="H"      name="Hidrógeno"              meaning="Usualmente solo útil para calcular H/Corg. Bajo H absoluto = más estabilidad." typical="Típico: 1–5%" />
          <MetricRowES symbol="H/Corg" name="H sobre C orgánico molar" meaning="El parámetro más importante. Proxy de estabilidad. Ver sección sobre H/C." typical="<0.7 para certificar · <0.4 premium" />
          <MetricRowES symbol="BET"    name="Superficie específica"   meaning="m²/g. Indicador de porosidad. BET alto = buena capacidad de retención de agua y nutrientes." typical="Típico: 100–500 m²/g" />
          <MetricRowES symbol="pH"     name="Acidez/alcalinidad"      meaning="Biochar típicamente es básico (efecto de cenizas). Para aplicación agronómica, 7–10 es ideal." typical="Típico: 7–11" />
          <MetricRowES symbol="Yield"  name="Rendimiento"             meaning="% de la biomasa original que se convierte en biochar. Compite con contenido de C: rendimiento alto = menos C, rendimiento bajo = más C pero menos producto." typical="Típico: 25–40%" />
          <MetricRowES symbol="Credits" name="Créditos potenciales"   meaning="Estimación preliminar de créditos generables. Es bruto — el LCA descuenta emisiones operacionales." typical="Típico: 2.5–3.2 tCO₂e/t biochar" />
        </div>
      ),
    },
    "resultados-lca": {
      eyebrow: "Balance neto de carbono",
      title: "Cómo leer el LCA",
      body: (
        <>
          <p>El LCA calcula emisiones operacionales en tres scopes y las descuenta del carbono secuestrado en el biochar:</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><strong>Scope 1</strong> — Combustible que usa tu planta directamente (gas natural, diesel, biomasa adicional). Típico: 0.05–0.15 tCO₂e/t.</li>
            <li><strong>Scope 2</strong> — Electricidad consumida. Depende de la mezcla energética del país. En Argentina con grid ~40% renovable, típico: 0.08 tCO₂e/t.</li>
            <li><strong>Scope 3</strong> — Upstream (transporte de biomasa al site) + downstream (transporte de biochar al campo + aplicación). Muy sensible a distancias. Típico: 0.1–0.4 tCO₂e/t.</li>
          </ul>
          <div className="border border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">El número que importa</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              <strong>Net CO₂e removido</strong> = C_secuestrado × permanence factor − (Scope 1 + 2 + 3). Para certificar tiene que ser{" "}
              <strong>&gt; 0</strong>. Típicamente queda entre <strong>2.0 y 2.8 tCO₂e</strong> por tonelada de biochar (bajó del bruto de ~3.0).
            </div>
          </div>
        </>
      ),
    },
    "resultados-score": {
      eyebrow: "Compliance vs certificadoras",
      title: "Cómo leer el BiocharPro Score",
      body: (
        <>
          <p>
            El BiocharPro Score (0–100) resume qué tan cerca está tu proyecto de calificar para una metodología específica.
            Cada metodología tiene su propio conjunto de criterios, así que un puntaje de 87 en Puro.earth puede ser 72 en Verra.
          </p>
          <div className="not-prose space-y-2 my-3">
            <div className="flex items-center gap-3 border border-border rounded-lg p-3 bg-card">
              <span className="text-2xl font-mono font-bold text-green-500">80+</span>
              <div>
                <div className="text-sm font-semibold">Listo para enviar</div>
                <div className="text-[11px] text-muted-foreground">Todos los criterios críticos están en verde. Puedes arrancar el proceso con la certificadora.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-border rounded-lg p-3 bg-card">
              <span className="text-2xl font-mono font-bold text-amber-500">60–80</span>
              <div>
                <div className="text-sm font-semibold">Casi listo</div>
                <div className="text-[11px] text-muted-foreground">Faltan algunos criterios manuales o hay chequeos automáticos no críticos en amarillo.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-border rounded-lg p-3 bg-card">
              <span className="text-2xl font-mono font-bold text-red-500">&lt;60</span>
              <div>
                <div className="text-sm font-semibold">Todavía no listo</div>
                <div className="text-[11px] text-muted-foreground">Un criterio automático crítico está fallando (ej: H/Corg &gt; 0.7 para Puro.earth). Revisa parámetros antes de seguir.</div>
              </div>
            </div>
          </div>
          <div className="border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">Criterios críticos fallando</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              Cuando un criterio marcado como <em>crítico</em> falla, el puntaje queda <strong>capado en 60</strong>, no importa cuántos
              otros criterios cumplas. Es deliberado: las certificadoras tienen límites duros que no se negocian (H/Corg, temperatura mínima, adicionalidad).
            </div>
          </div>
        </>
      ),
    },
    "resultados-metodologia": {
      eyebrow: "Decisión estratégica",
      title: "Cómo elegir qué metodología apuntar",
      body: (
        <>
          <p>No hay una "mejor" metodología universal. Depende de qué priorizas:</p>
          <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="text-xs font-bold mb-1 text-primary">Si priorizas PRECIO</div>
              <div className="text-sm">→ <strong>Isometric</strong> (USD 180–350/t) si tu H/Corg &lt; 0.4. Si no, <strong>Puro.earth</strong> (USD 130–250).</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="text-xs font-bold mb-1 text-primary">Si priorizas VELOCIDAD</div>
              <div className="text-sm">→ <strong>Puro.earth</strong> (6–9 meses). Verra VM0044 tarda 12–24.</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="text-xs font-bold mb-1 text-primary">Si priorizas ESCALA</div>
              <div className="text-sm">→ <strong>Verra VM0044</strong>. Es el registro más grande y tiene el sello CCP.</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="text-xs font-bold mb-1 text-primary">Si priorizas CREDIBILIDAD técnica</div>
              <div className="text-sm">→ <strong>Isometric</strong> (rigor máximo) + <strong>EBC</strong> para calidad del biochar.</div>
            </div>
          </div>
          <p>
            Algunos proyectos combinan rutas: EBC para calidad + Puro.earth o Verra para créditos.
            En biocharpro.io puedes mantener las 6 rutas en paralelo: 5 metodologías activas y Gold Standard en preparación, para decidir al final con mejor contexto.
          </p>
        </>
      ),
    },
    "resultados-journey": {
      eyebrow: "Plazo realista",
      title: "Qué esperar por etapa · hasta dónde llegamos nosotros",
      body: <JourneyES />,
    },
  },
  cta: {
    title: "Listo para arrancar",
    subtitle: "Puedes usar el simulador gratis sin cuenta. Si ya quieres guardar proyectos, corré LCA o exportar submission packages, mira los planes.",
    primary: "Probar el simulador",
    secondary: "Ver planes",
  },
};

// ─── MetricRow primitives (by-language for natural alignment) ───────────────

function MetricRowES({ symbol, name, meaning, typical }: { symbol: string; name: string; meaning: string; typical: string }) {
  return (
    <div className="border-b border-border last:border-b-0 py-3 flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
      <div className="md:w-32 flex-shrink-0">
        <div className="font-mono font-bold text-primary">{symbol}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{name}</div>
      </div>
      <div className="flex-1 text-xs md:text-sm text-foreground/80 leading-relaxed">{meaning}</div>
      <div className="md:w-40 flex-shrink-0 text-xs md:text-sm font-mono text-muted-foreground md:text-right">{typical}</div>
    </div>
  );
}

function MetricRowEN({ symbol, name, meaning, typical }: { symbol: string; name: string; meaning: string; typical: string }) {
  return MetricRowES({ symbol, name, meaning, typical });
}

// ─── Journey visual (language-agnostic structure, copy by locale) ───────────

interface JourneyStep {
  mes: string;
  title: string;
  body: string;
  coverage: number;
  coverageLabel: string;
  tone: "green" | "amber" | "gray";
  note: string;
}

function JourneyVisual({ steps, summary, calloutTitle, calloutBody }: {
  steps: JourneyStep[];
  summary: { percent: string; percentLabel: string; months: string; monthsLabel: string; cost: string; costLabel: string; methods: string; methodsLabel: string };
  calloutTitle: string;
  calloutBody: ReactNode;
}) {
  const TONE_MAP: Record<string, { bar: string; bg: string; text: string; border: string }> = {
    green: { bar: "bg-green-500", bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" },
    amber: { bar: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
    gray:  { bar: "bg-muted-foreground/40", bg: "bg-muted/40", text: "text-muted-foreground", border: "border-border" },
  };
  return (
    <>
      <div className="not-prose my-5 space-y-3">
        {steps.map((item, i) => {
          const toneClasses = TONE_MAP[item.tone] ?? TONE_MAP.gray;
          return (
            <div key={i} className={`border ${toneClasses.border} rounded-xl overflow-hidden bg-card`}>
              <div className="flex items-start gap-4 p-4">
                <div className="flex-shrink-0 w-20">
                  <div className={`text-[11px] font-mono font-bold ${toneClasses.text} uppercase tracking-wider`}>{item.mes}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="font-semibold text-sm leading-tight">{item.title}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${toneClasses.text} ${toneClasses.bg} ${toneClasses.border} border rounded-full px-2 py-0.5 flex-shrink-0`}>
                      {item.coverage}% · {item.coverageLabel}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">{item.body}</p>
                  <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden mb-2">
                    <div className={`h-full ${toneClasses.bar} transition-all`} style={{ width: `${item.coverage}%` }} />
                  </div>
                  <div className="text-[11px] leading-relaxed flex items-start gap-1.5">
                    <Sparkles className={`w-3 h-3 ${toneClasses.text} flex-shrink-0 mt-0.5`} />
                    <span>
                      <strong className="text-foreground">{item.note.split(".")[0]}.</strong>
                      <span className="text-muted-foreground">{item.note.slice(item.note.indexOf(".") + 1)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="not-prose bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 rounded-xl p-5 md:p-6 my-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl md:text-3xl font-bold font-mono text-primary leading-none">{summary.percent}</div>
            <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{summary.percentLabel}</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold font-mono text-green-500 leading-none">{summary.months}</div>
            <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{summary.monthsLabel}</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold font-mono text-amber-500 leading-none">{summary.cost}</div>
            <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{summary.costLabel}</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold font-mono text-blue-500 leading-none">{summary.methods}</div>
            <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{summary.methodsLabel}</div>
          </div>
        </div>
      </div>

      <div className="border border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-xl p-4 not-prose">
        <div className="flex items-start gap-2 mb-2">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="text-xs font-bold uppercase tracking-wider">{calloutTitle}</div>
        </div>
        <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">{calloutBody}</div>
      </div>
    </>
  );
}

function JourneyES() {
  return (
    <>
      <p>
        La realidad: de la idea a los créditos emitidos pasan <strong>12–24 meses</strong>. biocharpro.io no elimina ese plazo
        (ningún software puede — los laboratorios, los VVBs y las certificadoras son humanos con sus propios plazos), pero <strong>te
        ahorra 3–6 meses de los primeros</strong> y te deja perfectamente parado en el resto. Aquí cada etapa, con lo que cubrimos
        honestamente:
      </p>
      <JourneyVisual
        steps={[
          { mes: "Mes 0",    title: "Simulación + decisión inicial",           body: "Corres el simulador, eliges biomasa + T°, ves el puntaje preliminar contra 5 metodologías activas y dejas Gold Standard en preparación. 1–2 horas de trabajo.",                                coverage: 100, coverageLabel: "Cubierto de punta a punta",      tone: "green", note: "Simulador + puntaje + recomendación metodológica: todo aquí." },
          { mes: "Mes 1",    title: "Análisis de laboratorio + LCA",           body: "Pides análisis del biochar real (USD 500–1,500). Subes el PDF al simulador, la IA precarga una biomasa personalizada y corres el LCA con datos operacionales.",                         coverage:  70, coverageLabel: "Cubrimos la mayor parte",         tone: "green", note: "Nosotros: extracción del PDF con IA + LCA estructurado. Tú: mandar muestra a un laboratorio acreditado." },
          { mes: "Mes 2–3",  title: "Borrador de PDD",                         body: "Abres el PDD Builder (Engineer), completas los 11 frentes de trabajo con datos ya calculados y exportas un PDF borrador listo para el VVB.",                                             coverage:  80, coverageLabel: "Cubierto con PDD Builder",        tone: "green", note: "Nosotros: 11 frentes con preguntas concretas + autocompletado. Tú: el 20% restante de contexto propio del proyecto." },
          { mes: "Mes 4–6",  title: "VVB + consulta con actores locales",      body: "Contratas VVB (USD 30K–80K para Verra). Para Gold Standard haces una consulta pública de 2 semanas y talleres con actores locales.",                                                    coverage:  25, coverageLabel: "Te orientamos",                   tone: "amber", note: "Nosotros: guía de envío con VVBs recomendados, contactos y tiempos por certificadora. Tú: contratar y gestionar la relación con el VVB." },
          { mes: "Mes 6–12", title: "Validación + registro",                   body: "El VVB valida tu PDD (revisión de escritorio + visita a campo). Respondes CARs/CLs y registras el proyecto en el registro elegido.",                                                        coverage:  40, coverageLabel: "Material listo · proceso humano", tone: "amber", note: "Nosotros: JSON + PDF estructurados para el VVB, con criterios automáticos ya revisados. Tú: responder aclaraciones y coordinar la visita." },
          { mes: "Mes 12+",  title: "Monitoreo + verificación + emisión",      body: "Ya produces biochar, lo aplicas y monitoreas lotes. El VVB verifica periódicamente y se emiten CORCs, VCUs u otros en el registro.",                                                       coverage:  10, coverageLabel: "Hoja de ruta futura",             tone: "gray",  note: "La integración dMRV continua sigue en hoja de ruta. Hoy te damos la plantilla del plan de monitoreo." },
        ]}
        summary={{
          percent: "~60%",   percentLabel: "del trabajo de documentación",
          months: "3–6",     monthsLabel: "meses ahorrados típico",
          cost: "$40K+",     costLabel: "vs consultoría tradicional",
          methods: "6/6",    methodsLabel: "metodologías en paralelo",
        }}
        calloutTitle="La expectativa honesta"
        calloutBody={
          <>
            Puro.earth suele cerrarse en 6–9 meses desde <em>tener el PDD listo</em>. Verra y Gold Standard, 12–24.
            Añadile 3–6 meses más para llegar al PDD si arrancas de cero — y <strong>eso</strong> es lo que te comprime biocharpro.io.
            De los primeros 4–6 meses que normalmente gastas gestionando consultoras, te van a quedar 1–2.
          </>
        }
      />
    </>
  );
}

// ─── ENGLISH ─────────────────────────────────────────────────────────────────

const en: GuideContent = {
  nav: {
    pricing: "Pricing",
    tryFree: "Try for free",
    back: "Back",
    contentLabel: "Contents",
  },
  hero: {
    badge: "User guide",
    title: "Everything you need to know to use biocharpro.io well.",
    subtitle: (
      <>
        The <strong className="text-foreground">how</strong> of the product, the{" "}
        <strong className="text-foreground">why</strong> behind the numbers, and what each{" "}
        <strong className="text-foreground">result</strong> actually means. Written so you can read it with a coffee on the side.
        You don't need to read all of it — the guide navigation takes you straight to what you're looking for.
      </>
    ),
  },
  parts: {
    como:       { eyebrow: "Part 1 · Operating it", title: "The how" },
    porque:     { eyebrow: "Part 2 · Fundamentals", title: "The why" },
    resultados: { eyebrow: "Part 3 · Interpretation", title: "The results" },
  },
  toc: [
    {
      group: "The how",
      items: [
        { id: "como-intro",       label: "First look" },
        { id: "como-simular",     label: "Simulate biochar" },
        { id: "como-lab",         label: "Upload a lab analysis" },
        { id: "como-proyectos",   label: "Create & manage projects" },
        { id: "como-ai-builder",  label: "AI Builder: from draft to project" },
        { id: "como-lca",         label: "Run the LCA" },
        { id: "como-submission",  label: "Export a submission package" },
        { id: "como-pdd",         label: "PDD Builder" },
        { id: "como-operativo",   label: "Operate a plant (Stage 3-4)" },
      ],
    },
    {
      group: "The why",
      items: [
        { id: "porque-intro",            label: "Why this exists" },
        { id: "porque-biochar",          label: "What biochar is and why it matters" },
        { id: "porque-metodologias",     label: "Why we cover 6 methodologies" },
        { id: "porque-modelo",           label: "How our model works" },
        { id: "porque-hc",               label: "Why H/C matters so much" },
        { id: "porque-addic-base-perm",  label: "Additionality, baseline, permanence" },
      ],
    },
    {
      group: "The results",
      items: [
        { id: "resultados-intro",         label: "How to read what you see" },
        { id: "resultados-simulador",     label: "Simulator outputs" },
        { id: "resultados-lca",           label: "LCA outputs" },
        { id: "resultados-score",         label: "BiocharPro Score" },
        { id: "resultados-metodologia",   label: "Choose a methodology" },
        { id: "resultados-journey",       label: "What to expect, month by month" },
      ],
    },
  ],
  sections: {
    "como-intro": {
      eyebrow: "Start here",
      title: "First look at the product",
      body: (
        <>
          <p>biocharpro.io has three layers that work on their own or together:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Simulator</strong> (free) — pick a biomass and a temperature and, in seconds, see the biochar you'd get. Useful for deciding feedstocks and parameters before you spend money on a lab.</li>
            <li><strong>Projects</strong> (Analyst+) — save the simulation as a project with location, plant plan and a score against 6 certification routes: 5 live today + Gold Standard in preparation.</li>
            <li><strong>Submission packages</strong> (Developer+) — export everything you need for Puro.earth, Verra, Isometric, EBC or Rainbow, and pre-stage Gold Standard alongside them.</li>
          </ul>
          <p>
            No need to follow a fixed order. If you already have a project in mind, start with <LinkPill href="/app">the simulator</LinkPill>.
            If you want to understand what biochar is first, jump to <AnchorLink id="porque-biochar">the why</AnchorLink>.
          </p>
        </>
      ),
    },
    "como-simular": {
      eyebrow: "5 minutes",
      title: "How to simulate your first biochar",
      body: (
        <ol className="list-decimal pl-5 space-y-3 not-prose">
          <li>
            <strong>Pick a biomass.</strong> You have 48 free feedstocks (pine sawdust, coffee husk, rice straw, corn stover, bagasse,
            etc.). If your biomass isn't on the list, there's a free AI search. If you have a lab PDF, upload it and the AI will
            extract the values (see <AnchorLink id="como-lab">uploading an analysis</AnchorLink>).
          </li>
          <li>
            <strong>Set the pyrolysis temperature.</strong> The slider goes from 300 to 900 °C. For agronomic biochar,{" "}
            <strong>550–650 °C</strong> is the sweet spot (balance between yield, stability and soil properties). Above 700 °C you
            maximise fixed carbon but lose yield.
          </li>
          <li>
            <strong>Set the residence time.</strong> Default is 30 min. Well below (5–10 min) = less stable biochar.
            Well above (&gt;60 min) = diminishing returns. Most operating plants run between 15 and 45 min.
          </li>
          <li>
            <strong>Pick a quality goal.</strong> Three presets: <em>MAX_CARBON</em> (maximise C content),{" "}
            <em>AGRONOMY</em> (optimise for soil application), <em>BALANCED</em> (default). When you click "Optimum", the
            simulator suggests T° and time for your feedstock and goal.
          </li>
          <li>
            <strong>Read the results.</strong> Jump to <AnchorLink id="resultados-simulador">the simulator results</AnchorLink> to
            understand what each number means. TL;DR: H/Corg &lt; 0.7 is the red line for certification.
          </li>
        </ol>
      ),
    },
    "como-lab": {
      eyebrow: "Analyst+",
      title: "How to upload a lab analysis",
      body: (
        <>
          <p>
            If you already have a proximate + elemental analysis from a lab, there's no need to enter the values by hand.
            Upload the PDF and the AI (Gemini 2.5) will extract, automatically:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Elemental composition: C, H, N, S, O, ash, moisture, volatiles, fixed carbon</li>
            <li>Biochar parameters: H/Corg, BET, pH, pore volume</li>
            <li>Heavy metals: Pb, Cd, Cr, Cu, Ni, Zn, Hg, As (µg/g)</li>
            <li>Pyrolysis parameters used in the test: T°, residence time</li>
          </ul>
          <div className="border border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <Upload className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">How to do it</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              On the main simulator screen, at the top there's an <em>"Upload lab PDF"</em> button. Drag the file in or pick it
              manually. In 10–15 seconds you'll see the extracted values pre-loaded in a form. Review them, adjust what needs
              adjusting, and save as a custom feedstock (it stays in your account).
            </div>
          </div>
          <p>
            There's an <em>"allow public use"</em> option — if you tick it, the analysis gets added to our public dataset to
            improve the model. We do not share your identity. If you'd rather keep it private, untick it.
          </p>
        </>
      ),
    },
    "como-proyectos": {
      eyebrow: "Analyst+",
      title: "How to create and manage projects",
      body: (
        <>
          <p>
            A "project" on biocharpro.io is a saved configuration (feedstock + T° + time + location + metadata) that you can
            re-open, edit and share. Each project gets a public <strong>BOP ID</strong>{" "}
            (e.g. <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">BOP-2026-0042</code>) that acts as an identifier
            on the submission PDF.
          </p>
          <ol className="list-decimal pl-5 space-y-3 not-prose">
            <li>
              <strong>Save a simulation as a project.</strong> From the simulator, click <em>"Save as Project"</em>.
              A modal opens with name, description, location (with map autocomplete) and plant capacity in t/h.
            </li>
            <li>
              <strong>Explore the detail at <code>/projects/:id</code>.</strong> You see the interactive map (Leaflet + OpenStreetMap),
              regional analysis (Open-Meteo climate + SoilGrids soil), the score against 6 certification routes, and the export buttons.
            </li>
            <li>
              <strong>Edit parameters and save.</strong> Change T°, time or quality goal and hit "Save" — changes persist.
              The BOP ID stays the same.
            </li>
            <li>
              <strong>Share the project.</strong> Each project has a public page at <code>/verify/:bopId</code> with the level
              of detail you choose (private / summary / full). Useful for sharing with buyers or verifiers without giving them
              full account access.
            </li>
          </ol>
        </>
      ),
    },
    "como-ai-builder": {
      eyebrow: "Engineer+",
      title: "How to use AI Builder without duplicating work",
      body: (
        <>
          <p>
            <strong>AI Builder</strong> is for the moment when you already have a reasonable project hypothesis and want a fast{" "}
            <strong>initial document package</strong> to align engineering, certification, or a buyer conversation.
            If you're still exploring feedstock, temperature, or yield, it's better to start with the{" "}
            <LinkPill href="/app">simulator</LinkPill> and only then move into this flow.
          </p>
          <ol className="list-decimal pl-5 space-y-3 not-prose">
            <li>
              <strong>Fill the minimum inputs.</strong> Name, biomass, capacity, and country. If you also provide location, target methodology,
              or a lab PDF, the draft becomes much more grounded.
            </li>
            <li>
              <strong>Treat the AI package as a first pass, not a final version.</strong> The goal is to give you structure, technical wording,
              and a first dossier hypothesis. It does not replace human validation or real operating data.
            </li>
            <li>
              <strong>Open the editable PDD.</strong> From the AI package you move into <code>/pdd/:id</code>, where you fill gaps,
              correct assumptions, and turn the draft into the standard project you'll actually keep working on.
            </li>
            <li>
              <strong>Continue in /projects.</strong> That's where the project stops being just narrative: you tune parameters, export for
              certifiers, and, once the plant is operating, move into evidence, offtake, community, and audit package work.
            </li>
          </ol>
          <div className="border border-indigo-500/30 bg-indigo-500/5 rounded-xl p-4 not-prose">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              Practical rule
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              <strong>Simulator</strong> to explore. <strong>AI Builder</strong> to draft the first dossier.{" "}
              <strong>PDD Builder</strong> to edit it properly. <strong>Projects</strong> to operate it, export it, and move toward audit or go-to-market.
            </div>
          </div>
        </>
      ),
    },
    "como-lca": {
      eyebrow: "Analyst+",
      title: "How to run an LCA",
      body: (
        <>
          <p>
            The LCA (Life-Cycle Assessment) calculates the <em>net CO₂e</em> your project removes — the difference between the
            carbon the biochar sequesters and the emissions of producing and applying it.
          </p>
          <ol className="list-decimal pl-5 space-y-3 not-prose">
            <li>
              <strong>From any simulation, click "Run LCA".</strong> Takes you to <code>/lca</code> with the form pre-filled
              (C, H, yield, feedstock, moisture). No need to re-enter them.
            </li>
            <li>
              <strong>Fill in the operational data.</strong> Plant capacity (t/h), annual operating hours, biomass and biochar
              transport distance, energy type (electric vs fossil), and share of renewable electricity. If you don't know a value,
              leave the default — it's conservative.
            </li>
            <li>
              <strong>Review the breakdown.</strong> The LCA splits emissions into Scope 1 (process fuel), Scope 2 (electricity)
              and Scope 3 (transport + application). At the end you see <strong>net CO₂e removed per tonne of biochar</strong>{" "}
              aligned with Puro.earth Ed. 2025.
            </li>
          </ol>
          <div className="border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">Important</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              If the net CO₂e comes out <strong>negative</strong>, your project wouldn't qualify as carbon removal — process
              emissions exceed the sequestered carbon. That happens with wet biomass + long transport + fossil electricity.
              Usually, reviewing moisture and logistics fixes it.
            </div>
          </div>
        </>
      ),
    },
    "como-submission": {
      eyebrow: "Developer+ (Analyst+ for the guide itself)",
      title: "How to export a submission package",
      body: (
        <>
          <p>
            When your score is green and you have the operational data, it's time to export the package for the certifier.
            You have 6 covered routes: 5 live methodologies plus Gold Standard in preparation:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Puro.earth</strong> (Analyst+) — CORC · USD 130–250/t</li>
            <li><strong>Isometric</strong> (Developer+) — 200/1000-year durability · USD 180–350/t</li>
            <li><strong>Verra VM0044</strong> (Developer+) — VCS + CCP-approved · USD 120–180/t</li>
            <li><strong>Rainbow Standard</strong> (Analyst+) — ICVCM-backed route · USD 120–200/t</li>
            <li><strong>EBC</strong> (Analyst+) — quality standard · does not issue credits</li>
            <li><strong>Gold Standard</strong> (Engineer+) — in preparation · pre-stage SDGs + VVB</li>
          </ul>
          <ol className="list-decimal pl-5 space-y-3 not-prose">
            <li>
              <strong>Open your project at /projects/:id.</strong> Scroll to the <em>BiocharPro Score</em> — that's where the
              6 tabs live: 5 live methodologies plus Gold Standard preparation, each with its checks. Tick the manual checks your project meets. State is saved in the backend
              and syncs across devices.
            </li>
            <li>
              <strong>Export button (Developer+).</strong> Pick the methodology and format: <strong>JSON</strong> (machine-readable,
              full structure of checks, evaluators and metadata) or <strong>PDF</strong> (printable, to email or print).
            </li>
            <li>
              <strong>"How to submit" button (Analyst+).</strong> Opens a modal with step-by-step instructions per certifier:
              portal URL, contact email, timeline and 6 concrete process steps. Includes gotchas (e.g. Isometric asks for a peer
              review panel, Verra requires EBC upstream).
            </li>
          </ol>
        </>
      ),
    },
    "como-pdd": {
      eyebrow: "Engineer+",
      title: "How to use the PDD Builder",
      body: (
        <>
          <p>
            The PDD (Project Design Document) is the central document you submit to the certifier. It can be 40+ pages long.
            Our PDD Builder splits it into <strong>11 workstreams</strong> (feedstock, pyrolysis, LCA, monitoring, etc.) with
            specific questions for each one.
          </p>
          <div className="border border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <ClipboardList className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">How it works</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              You open <code>/pdd/:projectId</code>. Each workstream has a tab. You answer the questions (with contextual
              validation and auto-fill where possible). Progress is saved to localStorage in real time. When done, export to PDF.
            </div>
          </div>
          <p>
            The PDD Builder is <strong>opinionated</strong> — it assumes you're going to Puro.earth Ed. 2025. For other
            methodologies, mapping may need manual tweaks on the final PDF.
          </p>
        </>
      ),
    },
    "como-operativo": {
      eyebrow: "Expert",
      title: "Operate a plant and close offtake (Stage 3-4)",
      body: (
        <>
          <p>
            The simulator, LCA, submission package and PDD Builder get you to a <strong>certifiable project</strong>. But
            in 2026 none of the major buyers (Microsoft, Frontier, Shell, Altitude) will sign contracts from papers alone.
            Microsoft was explicit in April 2026: <em>"we no longer buy from pre-FID projects"</em>. They demand{" "}
            <strong>evidencia operativa real</strong>, <strong>cadena de custodia de punta a punta</strong> hasta el usuario final
            e <strong>impacto comunitario documentado</strong>, no solo un plan.
          </p>
          <p>
            Los módulos de Etapa 3 y 4, incluidos en Expert, son justamente esa capa. Son seis herramientas que se usan desde <code>/projects/:id</code> cuando
            la planta ya está operando o está muy cerca de operar:
          </p>
          <div className="border border-indigo-500/30 bg-indigo-500/5 rounded-xl p-4 not-prose my-4">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
              Etapa 3 — Operación auditable
            </div>
            <ul className="space-y-2 text-xs md:text-sm text-foreground/80 leading-relaxed list-disc pl-5">
              <li><strong>Evidencia operativa</strong> — registras lotes de pirólisis, análisis de laboratorio, incidentes y lecturas de energía. Cada entrada se valida automáticamente contra umbrales metodológicos como H/Corg, temperatura pico y tiempo de residencia. Es la “caja negra” de la planta para el VVB.</li>
              <li><strong>Cadena de custodia de envíos</strong> — por cada envío generas una URL pública con token único y se la mandas al usuario final, por ejemplo un productor, una cementera o un vivero. El usuario final confirma qué hizo con el biochar, cuántas toneladas aplicó, dónde y en qué cultivo o uso. Sin esa confirmación, la trazabilidad queda débil.</li>
              <li><strong>Impacto comunitario</strong> — registro vivo de reuniones, reclamos y respuestas, contrataciones locales, compras locales, inversiones comunitarias, donaciones de biochar y monitoreo ambiental. La IA usa ese historial para armar un reporte semestral o anual de impacto, pero la fuerza del módulo sigue estando en los registros verificables.</li>
            </ul>
          </div>
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 not-prose my-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3">
              Etapa 4 — Salida comercial
            </div>
            <ul className="space-y-2 text-xs md:text-sm text-foreground/80 leading-relaxed list-disc pl-5">
              <li><strong>Preparación para buyers</strong> — la IA compara tus datos reales contra criterios públicos de compra de Microsoft, Frontier, Shell y Altitude. Devuelve un score de 0 a 100%, una lista priorizada de brechas y acciones concretas por buyer.</li>
              <li><strong>Priorización de buyers</strong> — la inversa del chequeo anterior: con lo que ya tiene cargado tu proyecto, ¿a quién conviene contactar primero? La IA ordena los buyers por probabilidad de avanzar hacia contrato en los próximos 6 meses y sugiere un primer paso comercial.</li>
              <li><strong>Paquete de auditoría</strong> — un PDF listo para imprimir que consolida evidencia operativa, cadena de custodia de envíos, registros comunitarios y un resumen ejecutivo asistido por IA. Es el documento que se puede compartir con un VVB, auditor o equipo de procurement del buyer.</li>
            </ul>
          </div>
          <p>
            El flujo completo es: cargar evidencia diaria, lote por lote; registrar cada envío con confirmación del usuario final; documentar cada interacción comunitaria; y al cierre de un período, mensual, trimestral o semestral, generar el paquete de auditoría y acompañarlo con el chequeo de preparación para buyers.
          </p>
          <div className="border border-border rounded-xl p-4 bg-card not-prose my-4">
            <div className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              Cadencia operativa recomendada
            </div>
            <ol className="list-decimal pl-5 space-y-2 text-xs md:text-sm text-foreground/80 leading-relaxed">
              <li><strong>Cada turno o lote:</strong> registra pirólisis, energía, incidentes y cualquier resultado puntual de laboratorio. No esperes al cierre de mes.</li>
              <li><strong>Cada envío:</strong> crea el registro cuando sale de planta y manda el enlace de confirmación ese mismo día.</li>
              <li><strong>Cada interacción comunitaria:</strong> registra reuniones, reclamos, contrataciones o compras locales cuando ocurren. Si lo haces semanas después, deja de ser evidencia y pasa a ser memoria.</li>
              <li><strong>Cada mes o trimestre:</strong> corre Preparación para buyers, revisa Priorización de buyers y genera el Paquete de auditoría. Ese cierre periódico convierte datos sueltos en una historia defendible.</li>
            </ol>
          </div>
          <p>{`Todo este flujo está incluido en el plan Expert (USD ${EXPERT_MONTHLY_USD}/mes). Si ya tienes una planta operativa, es el set de herramientas que ayuda a cerrar la brecha entre “proyecto certificable” y “proyecto con evidencia suficiente para una conversación comercial seria”.`}</p>
        </>
      ),
    },
    "porque-intro": {
      eyebrow: "Context",
      title: "Why biocharpro.io exists",
      body: (
        <>
          <p>
            Developing a certified biochar project today takes <strong>6–18 months</strong> and costs <strong>USD 50K+</strong>{" "}
            in consulting. The bottleneck isn't biomass or technology — it's <strong>documentation</strong>.
            40-page PDDs, LCAs with 20 variables, mappings against methodologies that change versions every year.
          </p>
          <p>
            Our bet: most of those 6 months can be solved in software. A calibrated simulator, an LCA model with sensible defaults,
            and automatic scoring against the official methodologies get you 80% of the PDD in a few hours. The remaining 20%
            (real-biochar lab analysis, VVB, stakeholder consultation) is still human work — but you start from solid ground,
            not from scratch.
          </p>
        </>
      ),
    },
    "porque-biochar": {
      eyebrow: "Fundamentals",
      title: "What biochar is and why it matters",
      body: (
        <>
          <p>
            Biochar is the carbon-rich solid left over when you pyrolyse biomass (agricultural, forestry, sludge, manure residues)
            in the absence of — or with very little — oxygen. The process, pyrolysis, typically runs between 350 and 800 °C.
          </p>
          <p>
            What makes it interesting from a CDR (Carbon Dioxide Removal) perspective is this: biochar carbon is{" "}
            <strong>stable for centuries or millennia</strong>. Biomass left alone decomposes and releases CO₂ in 1–10 years.
            If you pyrolyse it, a large fraction of the carbon (the "fixed carbon") becomes locked in aromatic structures that
            soil microbes can't break down.
          </p>
          <div className="not-prose grid grid-cols-1 md:grid-cols-3 gap-3 my-5">
            <div className="border border-border rounded-xl p-4 bg-card">
              <Leaf className="w-5 h-5 text-green-500 mb-2" />
              <div className="text-xs font-bold mb-1">Real sequestration</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">100+ years when H:Corg &lt; 0.7 · 1000+ years when &lt; 0.4</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <Droplet className="w-5 h-5 text-blue-500 mb-2" />
              <div className="text-xs font-bold mb-1">Co-benefits</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">Water retention + CEC + less N₂O in agricultural soils</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <TrendingUp className="w-5 h-5 text-primary mb-2" />
              <div className="text-xs font-bold mb-1">Scalable</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">Biomass available globally · relatively low-CAPEX technology</div>
            </div>
          </div>
          <p>
            The IPCC estimates a global potential of <strong>2.5 Gt CO₂e/year</strong> from biochar alone. Today we're delivering
            &lt;1% of that potential.
          </p>
        </>
      ),
    },
    "porque-metodologias": {
      eyebrow: "Market context",
      title: "Why we cover 6 methodologies, not just one",
      body: (
        <>
          <p>Each certifier has its own lens. Understanding the difference helps you pick where to aim:</p>
          <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
            <div className="border border-green-500/30 bg-green-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-green-500 mb-1">Puro.earth</div>
              <div className="text-[11px] text-muted-foreground mb-2">CORC · volume leader</div>
              <div className="text-xs leading-relaxed">The most widely used for biochar. Relatively fast process (6–9 months), H/Corg ≤ 0.7, price USD 130–250/t. Ideal for first-movers.</div>
            </div>
            <div className="border border-blue-500/30 bg-blue-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-blue-500 mb-1">Isometric</div>
              <div className="text-[11px] text-muted-foreground mb-2">200/1000-year durability · highest rigor</div>
              <div className="text-xs leading-relaxed">The strictest technically. Requires H/Corg &lt; 0.4 for the 1000-year tier. Premium price (USD 180–350/t), longer timeline.</div>
            </div>
            <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-purple-500 mb-1">Verra VM0044</div>
              <div className="text-[11px] text-muted-foreground mb-2">VCS · CCP-approved · large scale</div>
              <div className="text-xs leading-relaxed">Largest registry in the world. Requires EBC upstream. Timeline 12–24 months, price USD 120–180/t.</div>
            </div>
            <div className="border border-pink-500/30 bg-pink-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-pink-500 mb-1">Rainbow Standard</div>
              <div className="text-[11px] text-muted-foreground mb-2">ICVCM-backed route · shorter cycles</div>
              <div className="text-xs leading-relaxed">A faster route for operators who already have credible operating data. The range depends more on buyer fit and permanence class than on the standard itself.</div>
            </div>
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-emerald-500 mb-1">EBC</div>
              <div className="text-[11px] text-muted-foreground mb-2">European quality standard</div>
              <div className="text-xs leading-relaxed">Does NOT issue carbon credits. But it's an upstream requirement for Verra VM0044 and unlocks access to the European organic market.</div>
            </div>
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4">
              <div className="text-xs font-bold text-amber-500 mb-1">Gold Standard</div>
              <div className="text-[11px] text-muted-foreground mb-2">In preparation</div>
              <div className="text-xs leading-relaxed">Biochar methodology in development since Dec 2024. 0 registered projects to date. We use it to pre-stage SDGs and VVB work while we wait for final publication.</div>
            </div>
          </div>
          <p>
            The biocharpro.io advantage is that we <strong>show all 6 routes in parallel</strong>. You don't have to pick blindly —
            you see your score across 5 live methodologies and keep Gold Standard warm in case it becomes the right fit later.
          </p>
        </>
      ),
    },
    "porque-modelo": {
      eyebrow: "How we calculate the numbers",
      title: "How our pyrolysis model works",
      body: (
        <>
          <p>
            Our model is <strong>empirical</strong> — not a molecular-dynamics simulation. It's calibrated against peer-reviewed
            literature published by CINDECA/CONICET (the Argentinian Center for Research and Development in Catalytic Processes)
            and work from other recognised groups.
          </p>
          <p>Input → Output:</p>
          <div className="border border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <Beaker className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">The mapping</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              Biomass (elemental + proximate composition) + Temperature + Residence time
              <br /><span className="text-muted-foreground">↓</span><br />
              Biochar (C, H, O, N, ash), Yield (%), H/Corg, BET, pH, product-type split (solid/liquid/gas)
            </div>
          </div>
          <p>
            The correlations are specific to the <strong>biomass category</strong> (forestry, agricultural, wet residues, etc.)
            because thermal behaviour varies a lot between cellulose, hemicellulose and lignin.
          </p>
          <p className="text-xs text-muted-foreground italic">
            Where the model is strongest: traditional lignocellulosic biomass (pine sawdust, rice husk, corn stover, coffee husk,
            sugarcane bagasse). Where there's more uncertainty: atypical biomass (sludge, mixed MSW, macroalgae). For those we
            always recommend a real-biochar lab analysis before certifying.
          </p>
        </>
      ),
    },
    "porque-hc": {
      eyebrow: "The star parameter",
      title: "Why H/C matters so much",
      body: (
        <>
          <p>
            If there's one number to keep from this whole guide, it's <strong>H/Corg</strong> (molar ratio of hydrogen to organic
            carbon in the biochar).
          </p>
          <p>
            Why? Because it's the best known <em>proxy</em> for carbon stability. Low H/Corg = polycyclic aromatic structure =
            carbon that lasts centuries. High H/Corg = molecules with dangling hydrogens = biochar that decomposes fast and doesn't
            qualify as carbon removal.
          </p>
          <div className="not-prose border border-border rounded-xl overflow-hidden my-4">
            <div className="bg-muted/40 px-4 py-2 border-b border-border">
              <div className="text-xs font-bold uppercase tracking-wider">Thresholds by methodology</div>
            </div>
            <div className="divide-y divide-border">
              <div className="px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">H/Corg &lt; 0.7</div>
                  <div className="text-[11px] text-muted-foreground">Universal red line. Puro.earth, EBC, Verra VM0044 all require it.</div>
                </div>
                <span className="text-xs font-mono bg-green-500/10 text-green-500 border border-green-500/20 rounded px-2 py-0.5 flex-shrink-0">BC-2 · 100+ years</span>
              </div>
              <div className="px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">H/Corg &lt; 0.4</div>
                  <div className="text-[11px] text-muted-foreground">Only Isometric (1000-year tier) and Verra high-permanence class require it.</div>
                </div>
                <span className="text-xs font-mono bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded px-2 py-0.5 flex-shrink-0">BC-1 · 1000+ years</span>
              </div>
            </div>
          </div>
          <p>
            H/Corg drops <strong>exponentially with temperature</strong>. At 350 °C on pine sawdust you get ~0.9 (not certifiable).
            At 550 °C you're down to ~0.5. At 700 °C you're already below 0.3 (premium).
          </p>
          <div className="border border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <Thermometer className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">Rule of thumb</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              If certification is your goal, <strong>550–650 °C is the operational minimum</strong> for almost any biomass.
              Below that you'll run into stability problems; above that you'll lose yield.
            </div>
          </div>
        </>
      ),
    },
    "porque-addic-base-perm": {
      eyebrow: "Three concepts that show up in every methodology",
      title: "Additionality, baseline and permanence",
      body: (
        <>
          <p>You'll see these three terms over and over in any methodology. Understanding them saves you confusion:</p>
          <div className="not-prose space-y-3 my-4">
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center">A</div>
                <div className="font-bold text-sm">Additionality</div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                The project <strong>would not exist</strong> without carbon credit revenue. If your biochar plant was already
                profitable without selling CORCs, you don't have additionality → you don't qualify. It's demonstrated with:
                financial analysis (NPV/IRR), regulatory surplus (it's not legally required), and common-practice barrier.
              </div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center">B</div>
                <div className="font-bold text-sm">Baseline</div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                What would have happened to the biomass <strong>without your project</strong>. Burned in the open → high emission
                → your credit is bigger. Composted with partial sequestration → smaller credit. Had a long-term alternative use
                (furniture wood) → zero credit.
              </div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center">P</div>
                <div className="font-bold text-sm">Permanence</div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                How long the carbon stays sequestered. For biochar it depends on H/Corg + pyrolysis T° + application environment
                (agricultural soil vs concrete vs seabed). Each certifier uses a <em>permanence factor</em> that discounts credits
                based on these parameters.
              </div>
            </div>
          </div>
        </>
      ),
    },
    "resultados-intro": {
      eyebrow: "Before you start",
      title: "How to read what you see",
      body: (
        <>
          <p>
            biocharpro.io returns 4 types of outputs: <strong>biochar characterisation</strong> (chemical/physical properties),{" "}
            <strong>LCA</strong> (carbon balance), <strong>BiocharPro Score</strong> (compliance vs. certifiers), and{" "}
            <strong>methodology recommendations</strong> (which one to pick).
          </p>
          <p>All the numbers have <em>operational meaning</em> — they're not just decorative. The next sections explain each one.</p>
        </>
      ),
    },
    "resultados-simulador": {
      eyebrow: "Biochar characterisation",
      title: "How to read simulator outputs",
      body: (
        <div className="not-prose space-y-2">
          <MetricRowEN symbol="C"      name="Carbon"                   meaning="Total carbon content in dry biochar. For certification you need ≥10% (Puro.earth), ≥50% (Verra VM0044 and Isometric)." typical="Typical: 50–85%" />
          <MetricRowEN symbol="H"      name="Hydrogen"                  meaning="Usually only useful for computing H/Corg. Low absolute H = more stability." typical="Typical: 1–5%" />
          <MetricRowEN symbol="H/Corg" name="H over organic C, molar"   meaning="The most important parameter. Stability proxy. See the H/C section." typical="<0.7 to certify · <0.4 premium" />
          <MetricRowEN symbol="BET"    name="Specific surface area"     meaning="m²/g. Porosity indicator. High BET = good water and nutrient retention." typical="Typical: 100–500 m²/g" />
          <MetricRowEN symbol="pH"     name="Acidity/alkalinity"        meaning="Biochar is typically basic (ash effect). For agronomic use, 7–10 is ideal." typical="Typical: 7–11" />
          <MetricRowEN symbol="Yield"  name="Yield"                     meaning="% of the original biomass that turns into biochar. Trades off with C content: high yield = less C, low yield = more C but less product." typical="Typical: 25–40%" />
          <MetricRowEN symbol="Credits" name="CO₂e per tonne"           meaning="Preliminary estimate of generatable credits. Gross — the LCA deducts operational emissions." typical="Typical: 2.5–3.2 tCO₂e/t biochar" />
        </div>
      ),
    },
    "resultados-lca": {
      eyebrow: "Net carbon balance",
      title: "How to read the LCA",
      body: (
        <>
          <p>The LCA computes operational emissions in three scopes and subtracts them from the carbon sequestered in biochar:</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><strong>Scope 1</strong> — Fuel your plant uses directly (natural gas, diesel, additional biomass). Typical: 0.05–0.15 tCO₂e/t.</li>
            <li><strong>Scope 2</strong> — Electricity consumed. Depends on the country grid mix. In Argentina with ~40% renewable grid, typical: 0.08 tCO₂e/t.</li>
            <li><strong>Scope 3</strong> — Upstream (biomass transport to site) + downstream (biochar transport to field + application). Very sensitive to distances. Typical: 0.1–0.4 tCO₂e/t.</li>
          </ul>
          <div className="border border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">The number that matters</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              <strong>Net CO₂e removed</strong> = C_sequestered × permanence factor − (Scope 1 + 2 + 3). To certify it has to be{" "}
              <strong>&gt; 0</strong>. Typically lands between <strong>2.0 and 2.8 tCO₂e</strong> per tonne of biochar (down from
              the ~3.0 gross).
            </div>
          </div>
        </>
      ),
    },
    "resultados-score": {
      eyebrow: "Compliance vs. certifiers",
      title: "How to read the BiocharPro Score",
      body: (
        <>
          <p>
            The BiocharPro Score (0–100) summarises how close your project is to qualifying for a specific methodology.
            Each methodology has its own check set, so a score of 87 on Puro.earth can be 72 on Verra.
          </p>
          <div className="not-prose space-y-2 my-3">
            <div className="flex items-center gap-3 border border-border rounded-lg p-3 bg-card">
              <span className="text-2xl font-mono font-bold text-green-500">80+</span>
              <div>
                <div className="text-sm font-semibold">Ready for submission</div>
                <div className="text-[11px] text-muted-foreground">All critical checks green. You can start the process with the certifier.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-border rounded-lg p-3 bg-card">
              <span className="text-2xl font-mono font-bold text-amber-500">60–80</span>
              <div>
                <div className="text-sm font-semibold">Almost there</div>
                <div className="text-[11px] text-muted-foreground">Missing some manual checks, or non-critical auto-checks are yellow.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 border border-border rounded-lg p-3 bg-card">
              <span className="text-2xl font-mono font-bold text-red-500">&lt;60</span>
              <div>
                <div className="text-sm font-semibold">Not ready</div>
                <div className="text-[11px] text-muted-foreground">A critical auto-check is failing (e.g. H/Corg &gt; 0.7 for Puro.earth). Review parameters before moving on.</div>
              </div>
            </div>
          </div>
          <div className="border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-xl p-4 not-prose">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold uppercase tracking-wider">Critical checks failing</div>
            </div>
            <div className="text-xs md:text-sm text-foreground/80 leading-relaxed">
              When a check marked <em>critical</em> fails, the score is <strong>capped at 60</strong> — no matter how many
              other checks you pass. That's deliberate: certifiers have hard stops that don't get negotiated
              (H/Corg, minimum temperature, additionality).
            </div>
          </div>
        </>
      ),
    },
    "resultados-metodologia": {
      eyebrow: "Strategic decision",
      title: "How to pick which methodology to target",
      body: (
        <>
          <p>There's no universal "best" methodology. It depends on what you prioritise:</p>
          <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="text-xs font-bold mb-1 text-primary">If you prioritise PRICE</div>
              <div className="text-sm">→ <strong>Isometric</strong> (USD 180–350/t) if your H/Corg &lt; 0.4. If not, <strong>Puro.earth</strong> (USD 130–250).</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="text-xs font-bold mb-1 text-primary">If you prioritise SPEED</div>
              <div className="text-sm">→ <strong>Puro.earth</strong> (6–9 months). Verra VM0044 takes 12–24.</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="text-xs font-bold mb-1 text-primary">If you prioritise SCALE</div>
              <div className="text-sm">→ <strong>Verra VM0044</strong>. It's the largest registry and carries the CCP label.</div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="text-xs font-bold mb-1 text-primary">If you prioritise TECHNICAL credibility</div>
              <div className="text-sm">→ <strong>Isometric</strong> (maximum rigor) + <strong>EBC</strong> for biochar quality.</div>
            </div>
          </div>
          <p>
            Some projects do <strong>stacking</strong>: EBC for quality + Puro.earth or Verra for credits.
            On biocharpro.io you can keep all 6 routes in parallel: 5 live methodologies plus Gold Standard in preparation, then decide with better information at the end.
          </p>
        </>
      ),
    },
    "resultados-journey": {
      eyebrow: "Realistic timeline",
      title: "What to expect, stage by stage · how far we take you",
      body: <JourneyEN />,
    },
  },
  cta: {
    title: "Ready to start",
    subtitle: "You can use the simulator free, no account needed. If you want to save projects, run an LCA or export submission packages, check the plans.",
    primary: "Try the simulator",
    secondary: "See plans",
  },
};

function JourneyEN() {
  return (
    <>
      <p>
        The reality: from idea to issued credits takes <strong>12–24 months</strong>. biocharpro.io does not eliminate that
        timeline (no software can — labs, VVBs and certifiers are humans with their own schedules), but <strong>we save you
        3–6 of the first months</strong> and leave you perfectly positioned for the rest. Here's each stage, honestly, with
        what we cover:
      </p>
      <JourneyVisual
        steps={[
          { mes: "Month 0",    title: "Simulation + initial decision",         body: "You run the simulator, pick a feedstock + T°, see the preliminary score across 5 live methodologies and keep Gold Standard in preparation. 1–2 hours of work.",                             coverage: 100, coverageLabel: "Fully covered",                   tone: "green", note: "Simulator + score + methodology recommendation — all here." },
          { mes: "Month 1",    title: "Lab analysis + LCA",                    body: "You order a real-biochar lab analysis (USD 500–1,500). Upload the PDF and the AI pre-fills a custom feedstock. You run the LCA with operational data.",                                     coverage:  70, coverageLabel: "We cover most",                    tone: "green", note: "Us: AI PDF extract + structured LCA. You: ship biomass to an accredited lab." },
          { mes: "Months 2–3", title: "PDD draft",                             body: "You open the PDD Builder (Engineer tier), complete the 11 workstreams with already-computed data, export the PDF draft ready for the VVB.",                                                  coverage:  80, coverageLabel: "Covered via PDD Builder",          tone: "green", note: "Us: 11 workstreams with specific questions + auto-fill. You: the remaining 20% of project-specific context." },
          { mes: "Months 4–6", title: "VVB engagement + stakeholder consultation", body: "You engage a VVB (USD 30K–80K for Verra). For Gold Standard you run a 2-week public consultation. Local stakeholder workshops.",                                                    coverage:  25, coverageLabel: "We orient you",                   tone: "amber", note: "Us: submission guide with recommended VVBs + contacts + timeline per certifier. You: hire + manage the VVB relationship." },
          { mes: "Months 6–12", title: "Validation + registration",            body: "The VVB validates your PDD (desk review + field visit). You respond to CARs/CLs. You register the project on the chosen registry.",                                                        coverage:  40, coverageLabel: "Material ready · human process",   tone: "amber", note: "Us: structured JSON + PDF for the VVB, auto-checks already verified. You: respond to clarification requests + coordinate the field visit." },
          { mes: "Month 12+",  title: "Monitoring + verification + issuance",  body: "You produce biochar + apply it + monitor batches. The VVB verifies periodically → issuance of CORCs/VCUs/etc. on the registry.",                                                          coverage:  10, coverageLabel: "Future roadmap",                    tone: "gray",  note: "Continuous MRV integration is on our roadmap. Today we give you the monitoring plan template." },
        ]}
        summary={{
          percent: "~60%",   percentLabel: "of documentation work",
          months: "3–6",     monthsLabel: "months typically saved",
          cost: "$40K+",     costLabel: "vs. traditional consulting",
          methods: "6/6",    methodsLabel: "methodologies in parallel",
        }}
        calloutTitle="The honest expectation"
        calloutBody={
          <>
            Puro.earth usually closes in 6–9 months from <em>having the PDD ready</em>. Verra/Gold Standard, 12–24.
            Add another 3–6 months to get to the PDD if you're starting from scratch — and <strong>that</strong> is what
            biocharpro.io compresses. Of the first 4–6 months you'd normally spend managing consultants, 1–2 will remain.
          </>
        }
      />
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const GUIDE_CONTENT: Record<Lang, GuideContent> = { es, en };

/** Map the i18next locale string to one of our two supported languages. */
export function pickLang(i18nLang: string | undefined): Lang {
  if (!i18nLang) return "es";
  return i18nLang.toLowerCase().startsWith("en") ? "en" : "es";
}
