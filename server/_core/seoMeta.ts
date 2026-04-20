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

export interface MetaOverride {
  title: string;
  description: string;
  /** Optional per-page OG image override. Falls back to the site-wide one. */
  ogImage?: string;
  /** Explicit canonical URL override. Defaults to `https://biocharpro.io<path>`. */
  canonical?: string;
}

const SITE_OG_IMAGE = "https://biocharpro.io/og-image.png";

/**
 * Path-keyed overrides. Exact match on `req.path` (the URL without query
 * string). Use `matchOverride()` below to handle dynamic prefixes like
 * `/solutions/:vertical` or `/verify/:bopId`.
 */
const STATIC_OVERRIDES: Record<string, MetaOverride> = {
  "/demo": {
    title: "Live demo — Huila Coffee Husk project · Biochar Optimizer Pro",
    description:
      "Explorá un proyecto real de biochar en Colombia: cáscara de café, pirólisis a 650 °C, 32.6 kt CO₂e/año. Score Puro.earth calculado en vivo. Sin registro.",
  },
  "/pricing": {
    title: "Planes y precios · Biochar Optimizer Pro",
    description:
      "Gratis para siempre para el simulador. Desde USD 299/mes para gestión de proyectos, multi-metodología (Puro.earth · Isometric · EBC · IBI) y exportación de submission packages.",
  },
  "/company/partners": {
    title: "Partners — Ecosistema biochar · Biochar Optimizer Pro",
    description:
      "Certificadores, plataformas MRV, fabricantes de pirolizadores y laboratorios con los que interoperamos. Te dejamos en la puerta de cada uno.",
  },
  "/company/about": {
    title: "Sobre nosotros · Biochar Optimizer Pro",
    description:
      "Infraestructura digital para proyectos de biochar, de la idea a la certificación. Posición, valores, y cómo pensamos el producto.",
  },
  "/api": {
    title: "API REST · Biochar Optimizer Pro",
    description:
      "API REST del simulador de pirólisis + score multi-metodología. Integrá Biochar Optimizer Pro en tu workflow. Developer tier.",
  },
  "/legal/terms": {
    title: "Términos · Biochar Optimizer Pro",
    description: "Términos de servicio de Biochar Optimizer Pro.",
  },
  "/legal/privacy": {
    title: "Privacidad · Biochar Optimizer Pro",
    description: "Política de privacidad de Biochar Optimizer Pro.",
  },
  "/legal/security": {
    title: "Seguridad · Biochar Optimizer Pro",
    description: "Cómo protegemos tus datos y credenciales.",
  },
};

/** Dynamic-path overrides (prefix match). */
const VERTICAL_OVERRIDES: Record<string, MetaOverride> = {
  developer: {
    title: "Para project developers · Biochar Optimizer Pro",
    description:
      "De la idea al PDD completo: simulación, LCA, multi-metodología, exportación de submission package. Todo en un lugar.",
  },
  consultant: {
    title: "Para consultores · Biochar Optimizer Pro",
    description:
      "Batch comparison de residuos, scoring contra 4 metodologías, export de submission package. Acelerá tus proyectos de clientes 10×.",
  },
  trader: {
    title: "Para traders de carbono · Biochar Optimizer Pro",
    description:
      "Screening rápido con Developer tier, due diligence profunda con Engineer tier. Evaluá oportunidades de biochar antes que tu competencia.",
  },
  agribusiness: {
    title: "Para agribusinesses · Biochar Optimizer Pro",
    description:
      "¿Qué hacer con tus residuos agrícolas? Compará cáscaras, pajas y bagazos lado a lado para ver cuál produce el mejor biochar y los mejores créditos.",
  },
  integrator: {
    title: "Para integradores y EPCs · Biochar Optimizer Pro",
    description:
      "Cotizá, dimensioná y documentá proyectos de biochar con data calibrada. API REST para automatizar workflows con tu CRM.",
  },
  researcher: {
    title: "Para investigadores · Biochar Optimizer Pro",
    description:
      "Modelo empírico calibrado contra literatura peer-reviewed (CONICET / CINDECA). 53 biomasas modeladas. Exportá data en JSON.",
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
      title: "Verificar proyecto · Biochar Optimizer Pro",
      description:
        "Confirmá que un proyecto de biochar está registrado en biocharpro.io. Muestra metodología objetivo, score de auto-checks y estimaciones anuales.",
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
  if (!override) return html;

  const title = escapeHtml(override.title);
  const desc = escapeHtml(override.description);
  const image = override.ogImage ?? SITE_OG_IMAGE;
  const canonical = override.canonical ?? `https://biocharpro.io${pathname}`;

  return html
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
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
