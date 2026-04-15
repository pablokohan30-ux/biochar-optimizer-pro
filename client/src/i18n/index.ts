/**
 * i18n configuration for Biochar Optimizer Pro.
 *
 * Why inline resources (not JSON files loaded over HTTP):
 *   - We only ship EN/ES for launch at Carbon Forum Colombia 2026.
 *   - Inlining avoids a second network round-trip before first paint.
 *   - Vite tree-shakes unused strings out of the production bundle anyway.
 *
 * Language detection order:
 *   1. localStorage key `lang` (explicit user choice — the LanguageSwitcher writes here)
 *   2. `navigator.language` (browser default, e.g. "es-CO" → "es")
 *   3. Fallback to "en"
 *
 * Supported languages: `en`, `es`. Everything else falls back to English.
 *
 * Namespaces:
 *   - common: shared chrome (buttons, nav, footer)
 *   - landing: marketing home
 *   - pricing: plans & billing
 *   - auth: login / register
 *   - upgrade: premium gate modal
 *   - pass: Carbon Forum Pass promo
 */

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LANGUAGES = ["en", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Resources (inline)
// ─────────────────────────────────────────────────────────────────────────────

const resources = {
  en: {
    common: {
      brandName: "Biochar Optimizer Pro",
      nav: {
        pricing: "Pricing",
        simulator: "Simulator",
        projects: "My Projects",
        login: "Sign in",
        signUp: "Sign up",
        tryForFree: "Try for free",
        signUpFree: "Sign up free",
        signOut: "Sign out",
      },
      cta: {
        startFree: "Start for free",
        viewPlans: "View plans & pricing",
        getStarted: "Get started",
        back: "Back",
        learnMore: "Learn more",
        continue: "Continue",
        cancel: "Cancel",
      },
      footer: {
        tagline: "Empirical model calibrated with peer-reviewed pyrolysis literature data.",
        terms: "Terms",
        privacy: "Privacy",
        security: "Security",
      },
      loading: "Loading…",
      language: {
        label: "Language",
        english: "English",
        spanish: "Español",
      },
    },

    landing: {
      hero: {
        badge: "Biochar project development platform",
        titleLine1: "From biomass to",
        titleHighlight: "carbon credit",
        titleLine2: "step by step.",
        subtitle:
          "The only platform that accompanies the full lifecycle of a biochar project: from technical simulation to complete plant design, LCA, regulatory permits, and access to carbon markets.",
        ctaPrimary: "Start for free",
        ctaSecondary: "View plans & pricing",
        noCardRequired:
          "No credit card required · Full simulator free · Upgrade when your project needs it",
        trustBiomasses: "Biomass types",
        trustPuro: "Puro.earth ready",
        trustPeerReview: "Peer-reviewed",
        liveSimulation: "Live Simulation",
      },
      preview: {
        badge: "Live preview",
        title: "See it in action",
        subtitle:
          "Real output from our pyrolysis model running on Pine Sawdust at 650°C, and an LCA on the MAF Corrientes reference case.",
        thermalSensitivity: "Thermal Sensitivity",
        qualityProfile: "Quality Profile",
        tryInSimulator: "Try in simulator",
      },
    },

    pricing: {
      title: "Plans & Pricing",
      subtitle: "Start for free and scale when your project requires it.",
      billedQuarterly: "Billed quarterly · 3-month min",
      tiers: {
        explorer: {
          name: "Explorer",
          description:
            "Full access to the interactive pyrolysis simulator. Predict C%, H:Corg, yield, BET, pH and CO₂e credits for any feedstock — no account required.",
        },
        analyst: {
          name: "Analyst",
          description:
            "For teams preparing carbon certification dossiers. Includes the Project Manager, adaptable LCA module (Puro.earth Ed. 2025), EBC / Puro.earth / Isometric compliance analysis, full PDF report export and a downloadable Excel / Google Sheets LCA template.",
          mostPopular: "MOST POPULAR",
          save: "Save ${{amount}} vs monthly",
          billedQuarterlyAmount: "${{amount}} billed quarterly",
          perMonth: "/mo",
          subscribe: "Subscribe",
          free: "Free",
        },
      },
      carbonForumPromo: {
        badge: "Carbon Forum Colombia 2026",
        limitedTime: "Limited time",
        title: "Carbon Forum Pass —",
        access30days: "30-day full Analyst access",
        codeLabel: "Code",
        features: {
          simulator: "Pyrolysis simulator",
          optimizer: "T°/time optimizer",
          pdf: "PDF export",
          projects: "Project Manager",
          lca: "LCA (Puro.earth)",
          aiSearch: "AI biomass search",
        },
      },
      prefer: {
        title: "Prefer spreadsheets?",
        body:
          "Analyst subscribers can also download the LCA as an Excel / Google Sheets template (Puro.earth Ed. 2025, all formulas included) and work offline.",
      },
      buildInPublic:
        "More advanced tiers (Developer · Engineer · Expert) are on the way as we build them. We won't charge for vapor.",
      enterprise: {
        title: "Need more? Let's talk.",
        subtitle:
          "For detailed engineering, certification support, technical due diligence for investors, or full plant implementation — we work with you outside the platform.",
        name: "Name",
        corporateEmail: "Corporate Email",
        company: "Company / Organization",
        projectDescription: "Tell us about your project",
        namePlaceholder: "Your name",
        emailPlaceholder: "you@yourcompany.com",
        companyPlaceholder: "Company name",
        projectPlaceholder: "Describe your project: biomass type, scale, location, goals…",
        send: "Send message",
        sending: "Sending…",
        sent: "Message sent!",
        sentDetail: "We'll get back to you within 24 hours.",
        corporateOnly:
          "Please use a corporate email address. Personal email providers (Gmail, Hotmail, Yahoo, etc.) are not accepted.",
      },
      faq: {
        title: "Frequently asked questions",
        q1: "Can I cancel anytime?",
        a1:
          "Yes. Analyst is billed quarterly with a 3-month minimum. After that you can cancel any time and keep full access until the end of your current billing period.",
        q2: "What exactly is included in Analyst?",
        a2:
          "Everything in the free tier plus the T°/time optimizer, PDF report export, Project Manager with geographic data, the Puro.earth Ed. 2025 LCA module, an Excel / Google Sheets LCA template and EBC / Puro.earth / Isometric compliance analysis.",
        q3: "How does the Carbon Forum Pass work?",
        a3Before: "A one-time $50 payment gives you 30 days of full Analyst access. Click ",
        a3Button: "Get the Carbon Forum Pass",
        a3Middle: ", enter code ",
        a3Code: "CARBONFORUM50",
        a3After:
          " to unlock the $50 price, and you'll be redirected to Stripe Checkout. No auto-renew — if you want to keep using the platform after 30 days, you subscribe normally.",
        q4: "Is my data used to train AI models?",
        a4Before:
          "Never. Your simulations, projects and uploaded biomass data are yours. We don't sell them and we don't use them to train third-party AI models. See the ",
        a4Link: "Privacy Policy",
        a4After: " for details.",
      },
    },

    auth: {
      login: {
        title: "Sign in to your account",
        register: "Create your account",
        fullName: "Full Name",
        fullNamePlaceholder: "John Smith",
        email: "Corporate Email",
        emailPlaceholder: "you@company.com",
        password: "Password",
        passwordPlaceholderMin: "Min. 8 characters",
        passwordPlaceholder: "Your password",
        signInButton: "Sign in",
        createAccountButton: "Create account",
        noAccount: "No account yet?",
        createOne: "Create one",
        haveAccount: "Already have an account?",
        signIn: "Sign in",
        corporateRequired:
          "Corporate email required. Free providers (Gmail, Yahoo, etc.) are not accepted.",
        acceptTermsPrefix: "I accept the ",
        acceptTermsTerms: "Terms of Service",
        acceptTermsAnd: " and ",
        acceptTermsPrivacy: "Privacy Policy",
        acceptTermsSuffix:
          ". My data is mine — Biochar Optimizer Pro will never sell it or use it to train AI models.",
        errors: {
          corporateOnly:
            "Please use a corporate email address. Free email providers (Gmail, Yahoo, Hotmail, etc.) are not accepted.",
          passwordTooShort: "Password must be at least 8 characters.",
          mustAcceptTerms:
            "You must accept the Terms of Service and Privacy Policy to create an account.",
        },
        fromSimulator: {
          title: "Sign up free to use the simulator.",
          body:
            "The pyrolysis simulator is free to use — we just need a corporate email so we know who we're building this for. Personal providers (Gmail, Yahoo, Hotmail, etc.) are not accepted.",
        },
      },
    },

    pass: {
      buttonLabel: "Get the Pass",
      header: "Carbon Forum Pass",
      subheader: "30 days · full Analyst access",
      needAccount:
        "You need an account to activate the pass. Sign in or create an account — it takes under a minute.",
      signInOrCreate: "Sign in / create account",
      whatYouGet: "What you get",
      bullet30Days: "30 days of full Analyst access",
      bulletNoRenew: "No auto-renewal — one-time payment",
      bulletFeatures: "T°/time optimizer, LCA, PDF export, Project Manager",
      promoCode: "Promo code",
      promoCodeHint: "Find this code on the Carbon Forum Colombia 2026 promo card.",
      total: "Total",
      oneTime: "one-time",
      continueToCheckout: "Continue to checkout",
      redirecting: "Redirecting to checkout…",
      stripeNote: "Payment processed by Stripe. Access expires automatically after 30 days.",
      invalidCode:
        "Invalid promo code. The Carbon Forum Pass requires the code shown on-site.",
    },

    upgrade: {
      premiumFeature: "Premium Feature",
      requires: "This feature requires the",
      orHigher: "plan or higher.",
      includedIn: "Included in {{tier}}+",
      perMonth: "/mo",
      subscribeTo: "Subscribe to {{tier}} plan",
      processing: "Processing…",
      viewAllPlans: "View all plans",
    },
  },

  es: {
    common: {
      brandName: "Biochar Optimizer Pro",
      nav: {
        pricing: "Precios",
        simulator: "Simulador",
        projects: "Mis proyectos",
        login: "Iniciar sesión",
        signUp: "Crear cuenta",
        tryForFree: "Probar gratis",
        signUpFree: "Registrate gratis",
        signOut: "Cerrar sesión",
      },
      cta: {
        startFree: "Empezar gratis",
        viewPlans: "Ver planes y precios",
        getStarted: "Comenzar",
        back: "Volver",
        learnMore: "Saber más",
        continue: "Continuar",
        cancel: "Cancelar",
      },
      footer: {
        tagline:
          "Modelo empírico calibrado con datos de literatura científica revisada por pares sobre pirólisis.",
        terms: "Términos",
        privacy: "Privacidad",
        security: "Seguridad",
      },
      loading: "Cargando…",
      language: {
        label: "Idioma",
        english: "English",
        spanish: "Español",
      },
    },

    landing: {
      hero: {
        badge: "Plataforma de desarrollo de proyectos de biochar",
        titleLine1: "De la biomasa al",
        titleHighlight: "crédito de carbono",
        titleLine2: "paso a paso.",
        subtitle:
          "La única plataforma que acompaña el ciclo completo de un proyecto de biochar: desde la simulación técnica hasta el diseño completo de planta, LCA, permisos regulatorios y acceso a los mercados de carbono.",
        ctaPrimary: "Empezar gratis",
        ctaSecondary: "Ver planes y precios",
        noCardRequired:
          "Sin tarjeta de crédito · Simulador completo gratis · Actualizá cuando tu proyecto lo requiera",
        trustBiomasses: "Tipos de biomasa",
        trustPuro: "Listo para Puro.earth",
        trustPeerReview: "Revisado por pares",
        liveSimulation: "Simulación en vivo",
      },
      preview: {
        badge: "Vista previa en vivo",
        title: "Vélo en acción",
        subtitle:
          "Resultados reales de nuestro modelo de pirólisis corriendo sobre aserrín de pino a 650 °C, y un LCA sobre el caso de referencia MAF Corrientes.",
        thermalSensitivity: "Sensibilidad térmica",
        qualityProfile: "Perfil de calidad",
        tryInSimulator: "Probá en el simulador",
      },
    },

    pricing: {
      title: "Planes y precios",
      subtitle: "Empezá gratis y escalá cuando tu proyecto lo necesite.",
      billedQuarterly: "Facturado trimestralmente · 3 meses mínimo",
      tiers: {
        explorer: {
          name: "Explorer",
          description:
            "Acceso completo al simulador interactivo de pirólisis. Predecí C%, H:Corg, rendimiento, BET, pH y créditos de CO₂e para cualquier biomasa — sin cuenta requerida.",
        },
        analyst: {
          name: "Analyst",
          description:
            "Para equipos que preparan dossieres de certificación de carbono. Incluye el Administrador de Proyectos, el módulo de LCA adaptable (Puro.earth Ed. 2025), análisis de cumplimiento EBC / Puro.earth / Isometric, exportación completa de reportes en PDF y una plantilla de LCA descargable en Excel / Google Sheets.",
          mostPopular: "MÁS POPULAR",
          save: "Ahorrá ${{amount}} vs mensual",
          billedQuarterlyAmount: "${{amount}} facturados trimestralmente",
          perMonth: "/mes",
          subscribe: "Suscribirse",
          free: "Gratis",
        },
      },
      carbonForumPromo: {
        badge: "Carbon Forum Colombia 2026",
        limitedTime: "Tiempo limitado",
        title: "Carbon Forum Pass —",
        access30days: "30 días de acceso completo Analyst",
        codeLabel: "Código",
        features: {
          simulator: "Simulador de pirólisis",
          optimizer: "Optimizador T°/tiempo",
          pdf: "Exportación PDF",
          projects: "Administrador de Proyectos",
          lca: "LCA (Puro.earth)",
          aiSearch: "Búsqueda de biomasa con IA",
        },
      },
      prefer: {
        title: "¿Preferís planillas?",
        body:
          "Los suscriptores Analyst también pueden descargar el LCA como plantilla en Excel / Google Sheets (Puro.earth Ed. 2025, con todas las fórmulas incluidas) y trabajar offline.",
      },
      buildInPublic:
        "Los planes más avanzados (Developer · Engineer · Expert) vienen en camino a medida que los construimos. No cobramos por vapor.",
      enterprise: {
        title: "¿Necesitás más? Hablemos.",
        subtitle:
          "Para ingeniería de detalle, soporte de certificación, due diligence técnico para inversores, o implementación completa de planta — trabajamos con vos fuera de la plataforma.",
        name: "Nombre",
        corporateEmail: "Email corporativo",
        company: "Empresa / Organización",
        projectDescription: "Contanos sobre tu proyecto",
        namePlaceholder: "Tu nombre",
        emailPlaceholder: "vos@tuempresa.com",
        companyPlaceholder: "Nombre de la empresa",
        projectPlaceholder:
          "Describí tu proyecto: tipo de biomasa, escala, ubicación, objetivos…",
        send: "Enviar mensaje",
        sending: "Enviando…",
        sent: "¡Mensaje enviado!",
        sentDetail: "Te vamos a responder dentro de las próximas 24 horas.",
        corporateOnly:
          "Por favor usá un email corporativo. Los proveedores de correo personal (Gmail, Hotmail, Yahoo, etc.) no son aceptados.",
      },
      faq: {
        title: "Preguntas frecuentes",
        q1: "¿Puedo cancelar cuando quiera?",
        a1:
          "Sí. Analyst se factura trimestralmente con 3 meses de mínimo. Después de eso podés cancelar en cualquier momento y mantener el acceso completo hasta el final del período facturado actual.",
        q2: "¿Qué incluye exactamente Analyst?",
        a2:
          "Todo lo del plan gratuito más el optimizador de T°/tiempo, exportación de reportes en PDF, Administrador de Proyectos con datos geográficos, el módulo de LCA Puro.earth Ed. 2025, una plantilla de LCA en Excel / Google Sheets y análisis de cumplimiento EBC / Puro.earth / Isometric.",
        q3: "¿Cómo funciona el Carbon Forum Pass?",
        a3Before: "Un pago único de $50 te da 30 días de acceso completo Analyst. Hacé clic en ",
        a3Button: "Obtené el Carbon Forum Pass",
        a3Middle: ", ingresá el código ",
        a3Code: "CARBONFORUM50",
        a3After:
          " para desbloquear el precio de $50, y te redirigimos al Checkout de Stripe. Sin renovación automática — si querés seguir usando la plataforma después de 30 días, te suscribís normalmente.",
        q4: "¿Se usan mis datos para entrenar modelos de IA?",
        a4Before:
          "Nunca. Tus simulaciones, proyectos y datos de biomasa cargados son tuyos. No los vendemos y no los usamos para entrenar modelos de IA de terceros. Mirá la ",
        a4Link: "Política de Privacidad",
        a4After: " para más detalles.",
      },
    },

    auth: {
      login: {
        title: "Iniciá sesión en tu cuenta",
        register: "Creá tu cuenta",
        fullName: "Nombre completo",
        fullNamePlaceholder: "Juan Pérez",
        email: "Email corporativo",
        emailPlaceholder: "vos@empresa.com",
        password: "Contraseña",
        passwordPlaceholderMin: "Mínimo 8 caracteres",
        passwordPlaceholder: "Tu contraseña",
        signInButton: "Iniciar sesión",
        createAccountButton: "Crear cuenta",
        noAccount: "¿No tenés cuenta todavía?",
        createOne: "Creá una",
        haveAccount: "¿Ya tenés cuenta?",
        signIn: "Iniciar sesión",
        corporateRequired:
          "Email corporativo obligatorio. Los proveedores gratuitos (Gmail, Yahoo, etc.) no son aceptados.",
        acceptTermsPrefix: "Acepto los ",
        acceptTermsTerms: "Términos del Servicio",
        acceptTermsAnd: " y la ",
        acceptTermsPrivacy: "Política de Privacidad",
        acceptTermsSuffix:
          ". Mis datos son míos — Biochar Optimizer Pro nunca los va a vender ni usar para entrenar modelos de IA.",
        errors: {
          corporateOnly:
            "Por favor usá un email corporativo. Los proveedores gratuitos (Gmail, Yahoo, Hotmail, etc.) no son aceptados.",
          passwordTooShort: "La contraseña debe tener al menos 8 caracteres.",
          mustAcceptTerms:
            "Tenés que aceptar los Términos del Servicio y la Política de Privacidad para crear una cuenta.",
        },
        fromSimulator: {
          title: "Registrate gratis para usar el simulador.",
          body:
            "El simulador de pirólisis es gratuito — sólo necesitamos un email corporativo para saber para quién estamos construyendo esto. Los proveedores personales (Gmail, Yahoo, Hotmail, etc.) no son aceptados.",
        },
      },
    },

    pass: {
      buttonLabel: "Obtener el Pass",
      header: "Carbon Forum Pass",
      subheader: "30 días · acceso completo Analyst",
      needAccount:
        "Necesitás una cuenta para activar el pass. Iniciá sesión o creá una cuenta — te lleva menos de un minuto.",
      signInOrCreate: "Iniciar sesión / crear cuenta",
      whatYouGet: "Qué recibís",
      bullet30Days: "30 días de acceso completo Analyst",
      bulletNoRenew: "Sin renovación automática — pago único",
      bulletFeatures: "Optimizador T°/tiempo, LCA, exportación PDF, Administrador de Proyectos",
      promoCode: "Código promocional",
      promoCodeHint: "Buscá este código en la tarjeta promocional del Carbon Forum Colombia 2026.",
      total: "Total",
      oneTime: "pago único",
      continueToCheckout: "Continuar al checkout",
      redirecting: "Redirigiendo al checkout…",
      stripeNote: "Pago procesado por Stripe. El acceso expira automáticamente a los 30 días.",
      invalidCode:
        "Código promocional inválido. El Carbon Forum Pass requiere el código que aparece en el evento.",
    },

    upgrade: {
      premiumFeature: "Función Premium",
      requires: "Esta función requiere el plan",
      orHigher: "o superior.",
      includedIn: "Incluido en {{tier}}+",
      perMonth: "/mes",
      subscribeTo: "Suscribirse al plan {{tier}}",
      processing: "Procesando…",
      viewAllPlans: "Ver todos los planes",
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    // Strip region tags so "es-CO" / "es-AR" both map to our "es" bundle.
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    ns: ["common", "landing", "pricing", "auth", "pass", "upgrade"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
