/**
 * Per-route SEO metadata override.
 *
 * Problem: our SPA serves a single `index.html` for every route, so every URL
 * appears to crawlers (LinkedIn, WhatsApp, Twitter, Google) with the SAME
 * title + description + OG image. When Pablo shares `/demo` or `/pricing`
 * on social media, the preview always reads "Digital infrastructure for
 * biochar carbon projects" regardless of what the link is actually about.
 *
 * Fix: on the SPA fallback, match the request URL against this override
 * table and swap the relevant `<title>`, `<meta name="description">`, and
 * `<meta property="og:*">` tags in the HTML before serving.
 *
 * Works for:
 *   - Crawlers that don't execute JS (LinkedIn, WhatsApp preview, Slack)
 *   - Crawlers that do execute JS (Google, Twitter) — they still prefer the
 *     initial HTML meta tags for crawl-time classification.
 */

import {
  ANALYST_MONTHLY_USD,
  DEVELOPER_MONTHLY_USD,
  ENGINEER_MONTHLY_USD,
  EXPERT_MONTHLY_USD,
} from "../../client/src/lib/pricingCatalog";
import { BRAND_NAME, BRAND_URL } from "../../client/src/lib/brand";

export interface MetaOverride {
  title: string;
  description: string;
  /** Optional per-page OG image override. Falls back to the site-wide one. */
  ogImage?: string;
  /** Explicit canonical URL override. Defaults to `https://biocharpro.io<path>`. */
  canonical?: string;
  /**
   * Optional JSON-LD block injected right before `</head>`. Use schema.org
   * types — we set reasonable defaults via `buildJsonLd` when absent, but
   * specific pages can opt into more specific schemas (Article, FAQPage, etc).
   */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SITE_OG_IMAGE = "https://biocharpro.io/og-image.png";

/**
 * Site-wide Organization schema — Google uses this for the Knowledge Panel
 * and rich brand results. Injected on every page as a second JSON-LD block.
 */
const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND_NAME,
  alternateName: BRAND_URL,
  url: "https://biocharpro.io",
  logo: "https://biocharpro.io/og-image.png",
  description:
    "Digital infrastructure for biochar carbon-removal projects. From simulation to certification package.",
  sameAs: [
    "https://biocharpro.io",
  ],
};

/**
 * Site-wide SoftwareApplication schema — surfaces biocharpro.io as a SaaS
 * product in search, with tier pricing. Google can render this as a rich
 * result with ratings/offers when enough signal accumulates.
 */
const SOFTWARE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: BRAND_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any (web)",
  description:
    "Multi-methodology biochar project platform: pyrolysis simulation, LCA, PDD builder, submission packages for five live methodologies (Puro.earth, Isometric, Verra VM0044, EBC, Rainbow) plus Gold Standard preparation.",
  offers: [
    { "@type": "Offer", name: "Explorer", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Analyst", price: String(ANALYST_MONTHLY_USD), priceCurrency: "USD" },
    { "@type": "Offer", name: "Developer", price: String(DEVELOPER_MONTHLY_USD), priceCurrency: "USD" },
    { "@type": "Offer", name: "Engineer", price: String(ENGINEER_MONTHLY_USD), priceCurrency: "USD" },
    { "@type": "Offer", name: "Expert", price: String(EXPERT_MONTHLY_USD), priceCurrency: "USD" },
  ],
  url: "https://biocharpro.io",
};

/**
 * Path-keyed overrides. Exact match on `req.path` (the URL without query
 * string). Use `matchOverride()` below to handle dynamic prefixes like
 * `/solutions/:vertical` or `/verify/:bopId`.
 */
const STATIC_OVERRIDES: Record<string, MetaOverride> = {
  "/demo": {
    title: `Live demo — Huila Coffee Husk project · ${BRAND_NAME}`,
    description:
      "Explora un proyecto real de biochar en Colombia: cáscara de café, pirólisis a 650 °C, 32.6 kt CO₂e/año. Score Puro.earth calculado en vivo. Sin registro.",
  },
  "/lca": {
    title: `Calculadora LCA de biochar · ${BRAND_NAME}`,
    description:
      "Calcula el ciclo de vida completo de tu biochar — emisiones de transporte, energía, secado y pirólisis — para conocer el CO₂e neto del proyecto. Calibrado contra literatura peer-reviewed.",
  },
  "/batch": {
    title: `Comparación batch de biomasas · ${BRAND_NAME}`,
    description:
      "Compara hasta 48 biomasas en paralelo a la misma temperatura y tiempo de residencia. Identifica el feedstock óptimo para tu proyecto en segundos. Exporta a CSV.",
  },
  "/pricing": {
    title: `Planes y precios · ${BRAND_NAME}`,
    description:
      `Gratis para siempre para el simulador. Desde USD ${ANALYST_MONTHLY_USD}/mes para gestión de proyectos, 5 metodologías activas (Puro.earth · Isometric · Verra VM0044 · EBC · Rainbow) y Gold Standard en preparación.`,
  },
  "/early-access": {
    title: `Early access demo · ${BRAND_NAME}`,
    description:
      "Solicita acceso a la demo pública de BiocharPro y explora simulación, trazabilidad, evidencia operativa y preparación comercial para proyectos reales de biochar.",
    canonical: "https://biocharpro.io/early-access",
  },
  "/guide": {
    title: `Guía del usuario — cómo, porqué y resultados · ${BRAND_NAME}`,
    description:
      "Toda la operativa de biocharpro.io en una página: cómo simular un biochar, por qué el H/C importa, qué significa el BiocharPro Score y cómo elegir metodología de certificación.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Guía del usuario — cómo, porqué y resultados de biocharpro.io",
      description:
        "Cómo usar biocharpro.io end-to-end: simulador, LCA, proyectos, metodologías de certificación, interpretación de outputs.",
      inLanguage: "es",
      isAccessibleForFree: true,
      publisher: {
        "@type": "Organization",
        name: BRAND_NAME,
        url: "https://biocharpro.io",
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": "https://biocharpro.io/guide",
      },
    },
  },
  "/company/partners": {
    title: `Partners — Ecosistema biochar · ${BRAND_NAME}`,
    description:
      "Certificadores, plataformas MRV, fabricantes de pirolizadores y laboratorios con los que interoperamos. Te dejamos en la puerta de cada uno.",
  },
  "/company/about": {
    title: `Sobre nosotros · ${BRAND_NAME}`,
    description:
      "Infraestructura digital para proyectos de biochar, de la idea a la certificación. Posición, valores, y cómo pensamos el producto.",
  },
  "/api": {
    title: `API REST · ${BRAND_NAME}`,
    description:
      `API REST del simulador de pirólisis + score multi-metodología. Integrá ${BRAND_NAME} en tu workflow. Developer tier.`,
  },
  "/product/modules": {
    title: `Los 6 módulos de la plataforma · ${BRAND_NAME}`,
    description:
      "Simulación técnica, LCA, diseño de proyecto, ingeniería de planta, regulatorio y aplicación agronómica. Cada módulo con su tier y sus features.",
  },
  "/product/methodologies": {
    title: `Metodologías de certificación cubiertas · ${BRAND_NAME}`,
    description:
      "6 rutas cubiertas: 5 metodologías activas (Puro.earth, Isometric, EBC, Verra VM0044 y Rainbow) más Gold Standard en preparación. Compara umbrales, precios y timelines lado a lado.",
  },
  "/product/project-package": {
    title: `Project package completo · ${BRAND_NAME}`,
    description:
      "6 entregables que genera biocharpro.io desde tu proyecto: PDD, especificación de equipos, layout de planta, diseño eléctrico, control de calidad y documentación de certificación.",
  },
  "/legal/terms": {
    title: `Términos · ${BRAND_NAME}`,
    description: `Términos de servicio de ${BRAND_NAME}.`,
  },
  "/legal/privacy": {
    title: `Privacidad · ${BRAND_NAME}`,
    description: `Política de privacidad de ${BRAND_NAME}.`,
  },
  "/legal/security": {
    title: `Seguridad · ${BRAND_NAME}`,
    description: "Cómo protegemos tus datos y credenciales.",
  },
};

/** Dynamic-path overrides (prefix match). */
const VERTICAL_OVERRIDES: Record<string, MetaOverride> = {
  developer: {
    title: `Para project developers · ${BRAND_NAME}`,
    description:
      "De la idea al PDD completo: simulación, LCA, multi-metodología, exportación de submission package. Todo en un lugar.",
  },
  consultant: {
    title: `Para consultores · ${BRAND_NAME}`,
    description:
      "Batch comparison de residuos, scoring contra 4 metodologías, export de submission package. Acelerá tus proyectos de clientes 10×.",
  },
  trader: {
    title: `Para traders de carbono · ${BRAND_NAME}`,
    description:
      "Screening rápido con Developer tier, due diligence profunda con Engineer tier. Evaluá oportunidades de biochar antes que tu competencia.",
  },
  agribusiness: {
    title: `Para agribusinesses · ${BRAND_NAME}`,
    description:
      "¿Qué hacer con tus residuos agrícolas? Compara cáscaras, pajas y bagazos lado a lado para ver cuál produce el mejor biochar y los mejores créditos.",
  },
  integrator: {
    title: `Para integradores y EPCs · ${BRAND_NAME}`,
    description:
      "Cotiza, dimensiona y documenta proyectos de biochar con data calibrada. API REST para automatizar workflows con tu CRM.",
  },
  researcher: {
    title: `Para investigadores · ${BRAND_NAME}`,
    description:
      "Modelo empírico calibrado contra literatura peer-reviewed (CONICET / CINDECA). 53 biomasas modeladas. Exporta data en JSON.",
  },
};

/**
 * Match a request path against the override table.
 * Returns null if no override applies → caller falls back to site-wide defaults.
 */
export function matchOverride(pathname: string): MetaOverride | null {
  // Exact match first
  if (STATIC_OVERRIDES[pathname]) return STATIC_OVERRIDES[pathname];

  // /solutions/:vertical
  const solMatch = pathname.match(/^\/solutions\/([a-z0-9-]+)\/?$/);
  if (solMatch) {
    const vertical = solMatch[1];
    if (VERTICAL_OVERRIDES[vertical]) return VERTICAL_OVERRIDES[vertical];
  }

  // /verify/:bopId — generic override (we don't know the project name from the URL alone)
  if (/^\/verify\/[A-Z0-9-]+\/?$/i.test(pathname)) {
    return {
      title: `Verificar proyecto · ${BRAND_NAME}`,
      description:
        "Confirma que un proyecto de biochar está registrado en biocharpro.io. Muestra metodología objetivo, score de auto-checks y estimaciones anuales.",
    };
  }

  // /demo/:slug — per-demo override (slug becomes a readable label in the title)
  const demoMatch = pathname.match(/^\/demo\/([a-z0-9-]+)\/?$/i);
  if (demoMatch) {
    const slug = demoMatch[1];
    const readable = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      title: `Demo: ${readable} · ${BRAND_NAME}`,
      description:
        "Explora un proyecto demo de biochar end-to-end: simulación, evidencia operativa, score de auto-checks contra metodología objetivo y dossier listo para revisión.",
    };
  }

  return null;
}

/**
 * Takes the raw index.html + a MetaOverride and returns a mutated HTML string
 * with the relevant tags swapped. If override is null, returns the HTML
 * unchanged.
 *
 * Implementation notes:
 *   - Uses simple regex substitution on the limited set of tags we control.
 *   - Escapes user-facing text to prevent XSS / broken markup.
 *   - Keeps the Twitter card tags consistent with OG.
 */
export function applyMetaOverride(
  html: string,
  override: MetaOverride | null,
  pathname: string,
): string {
  if (!override) return injectJsonLd(html, [ORGANIZATION_JSONLD, SOFTWARE_JSONLD]);

  const title = escapeHtml(override.title);
  const desc = escapeHtml(override.description);
  const image = override.ogImage ?? SITE_OG_IMAGE;
  const canonical = override.canonical ?? `https://biocharpro.io${pathname}`;

  const withMeta = html
    // <title>
    .replace(
      /<title>[^<]*<\/title>/,
      `<title>${title}</title>`,
    )
    // meta description
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${desc}" />`,
    )
    // canonical
    .replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    )
    // og:url
    .replace(
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    )
    // og:title
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${title}" />`,
    )
    // og:description
    .replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${desc}" />`,
    )
    // og:image
    .replace(
      /<meta property="og:image" content="[^"]*" \/>/,
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
    )
    // twitter:title
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${title}" />`,
    )
    // twitter:description
    .replace(
      /<meta name="twitter:description" content="[^"]*" \/>/,
      `<meta name="twitter:description" content="${desc}" />`,
    )
    // twitter:image
    .replace(
      /<meta name="twitter:image" content="[^"]*" \/>/,
      `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    );

  // Compose JSON-LD blocks: always inject Organization + Software, and the
  // page-specific one if the override defined it.
  const blocks: Array<Record<string, unknown>> = [ORGANIZATION_JSONLD, SOFTWARE_JSONLD];
  if (override.jsonLd) {
    if (Array.isArray(override.jsonLd)) {
      blocks.push(...override.jsonLd);
    } else {
      blocks.push(override.jsonLd);
    }
  }
  return injectJsonLd(withMeta, blocks);
}

/**
 * Injects one or more JSON-LD script tags just before `</head>`.
 * Safe against HTML injection — the JSON payload is serialised via JSON.stringify.
 * If the template doesn't have a `</head>` (unexpected), returns the HTML unchanged.
 */
function injectJsonLd(html: string, blocks: Array<Record<string, unknown>>): string {
  if (blocks.length === 0) return html;
  const scripts = blocks
    .map(
      (b) =>
        `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, "\\u003c")}</script>`,
    )
    .join("\n");
  // Idempotency: if we already injected once, don't duplicate. The marker is
  // the site-wide Organization block's unique url — check for its presence.
  if (html.includes('"https://biocharpro.io","logo"')) return html;
  return html.replace(/<\/head>/, `${scripts}\n</head>`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
