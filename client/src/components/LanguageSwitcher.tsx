import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

interface LanguageSwitcherProps {
  /** Compact variant for dense nav bars — just the two-letter code. */
  compact?: boolean;
  className?: string;
}

/**
 * EN / ES toggle for the nav bars.
 *
 * Writes the choice to `localStorage.lang` via i18next-browser-languagedetector
 * so it persists across sessions. Falls back to English on anything else.
 */
export default function LanguageSwitcher({ compact = false, className = "" }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation("common");

  // i18next exposes the full language tag (e.g. "es-CO"); take only the first
  // two chars to decide which button is active, since we only ship en/es.
  const current = (i18n.resolvedLanguage ?? i18n.language ?? "en").slice(0, 2) as SupportedLanguage;

  const setLang = (lang: SupportedLanguage) => {
    if (lang === current) return;
    void i18n.changeLanguage(lang);
  };

  return (
    <div
      className={`inline-flex items-center gap-1 text-xs ${className}`}
      role="group"
      aria-label={t("language.label")}
    >
      {!compact && <Globe className="w-3.5 h-3.5 text-muted-foreground mr-0.5" />}
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = current === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setLang(lang)}
            aria-pressed={active}
            className={`px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider transition-colors ${
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang}
          </button>
        );
      })}
    </div>
  );
}
