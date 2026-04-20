/**
 * First-visit welcome banner for anonymous / free-tier users on /app.
 *
 * Goal: reduce the "dropped into a working simulator with no context" problem.
 * Shows a 3-bullet orientation card the first time a user lands on /app; once
 * dismissed (via X button) or after they click any of the CTAs, it persists
 * as dismissed in localStorage and never appears again for that browser.
 *
 * Rules:
 *   - Never shown to paid users (they've converted — no onboarding pitch).
 *   - Always dismissable.
 *   - Persists dismissal per-browser via `bop_welcome_seen` localStorage key.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Sparkles, X, ArrowRight, FileUp, Search, Eye,
} from "lucide-react";
import { useTier } from "@/hooks/useTier";
import { useAuth } from "@/_core/hooks/useAuth";

const STORAGE_KEY = "bop_welcome_seen";

export default function WelcomeBanner() {
  const { t } = useTranslation("home");
  const { hasAccess, isLoading: tierLoading } = useTier();
  const { loading: authLoading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (authLoading || tierLoading) return;
    // Show for anyone who hasn't dismissed it AND isn't already paid.
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen && !hasAccess("analyst")) {
        setVisible(true);
      }
    } catch {
      // localStorage blocked — don't show (fail closed, never spam).
    }
  }, [authLoading, tierLoading, hasAccess]);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {t("welcome.title", { defaultValue: "Bienvenido/a — Biochar Optimizer Pro en 3 pasos" })}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t("welcome.subtitle", {
                defaultValue:
                  "El simulador es gratis para siempre. Probá la app con estas 3 rutas rápidas:",
              })}
            </div>
          </div>
        </div>

        {/* 3 CTAs compact */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link href="/demo">
            <button
              onClick={dismiss}
              className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 py-1.5 rounded"
            >
              <Eye className="w-3 h-3" />
              {t("welcome.ctaDemo", { defaultValue: "Ver demo en vivo" })}
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </Link>
          <button
            onClick={() => {
              dismiss();
              // Scroll the "Nueva Biomasa" card into view if present.
              const el = document.getElementById("nueva-biomasa") ?? document.querySelector('[data-onboarding="nueva-biomasa"]');
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-card hover:bg-secondary/60 border border-border px-2.5 py-1.5 rounded"
          >
            <FileUp className="w-3 h-3" />
            {t("welcome.ctaUpload", { defaultValue: "Subir tu PDF de laboratorio" })}
          </button>
          <button
            onClick={() => {
              dismiss();
              const el = document.getElementById("ai-search") ?? document.querySelector('[data-onboarding="ai-search"]');
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              const input = el?.querySelector("input") as HTMLInputElement | null;
              setTimeout(() => input?.focus(), 400);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-card hover:bg-secondary/60 border border-border px-2.5 py-1.5 rounded"
          >
            <Search className="w-3 h-3" />
            {t("welcome.ctaAiSearch", { defaultValue: "Buscar biomasa con IA" })}
          </button>
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground flex-shrink-0 absolute sm:relative top-2 right-2 sm:top-auto sm:right-auto"
          aria-label={t("welcome.dismiss", { defaultValue: "Cerrar bienvenida" })}
          title={t("welcome.dismiss", { defaultValue: "Cerrar bienvenida" })}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
