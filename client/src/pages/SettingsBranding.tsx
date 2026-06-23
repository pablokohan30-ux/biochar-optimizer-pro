/**
 * White-label branding settings — Developer tier feature.
 *
 * Route: /settings/branding
 *
 * Lets Developer tier users upload a logo, pick a primary color, set a company
 * name + footer text. The branding is applied to the AI Builder PDF export,
 * Submission Prints, and Executive Summary prints.
 *
 * Preview panel on the right shows how a print header will look with the
 * current settings.
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Palette, Upload, Trash2, Save, Lock, Sparkles, Check, AlertTriangle,
  RefreshCw,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";
import { BRAND_NAME, BRAND_URL, DEFAULT_EXPORT_COMPANY } from "@/lib/brand";

const DEFAULT_COLOR = "#22c55e";

export default function SettingsBranding() {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`branding.${k}`, { defaultValue: fallback });
  const [, navigate] = useLocation();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();

  const [companyName, setCompanyName] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_COLOR);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [footerText, setFooterText] = useState<string>("");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasDeveloper = hasAccess("developer");
  const brandingQuery = trpc.branding.get.useQuery(undefined, {
    enabled: isAuthenticated && !tierLoading && hasDeveloper,
  });

  // Hydrate state from server data once
  useEffect(() => {
    const d = brandingQuery.data;
    if (d) {
      setCompanyName(d.companyName ?? "");
      setPrimaryColor(d.primaryColor ?? DEFAULT_COLOR);
      setLogoDataUrl(d.logoDataUrl ?? null);
      setFooterText(d.footerText ?? "");
    }
  }, [brandingQuery.data]);

  const updateMutation = trpc.branding.update.useMutation({
    onSuccess: () => {
      setSavedMessage(tb("saved", "Branding saved."));
      setTimeout(() => setSavedMessage(null), 3000);
      brandingQuery.refetch();
    },
    onError: (err) => setErrorMessage(err.message),
  });
  const clearMutation = trpc.branding.clear.useMutation({
    onSuccess: () => {
      setCompanyName("");
      setPrimaryColor(DEFAULT_COLOR);
      setLogoDataUrl(null);
      setFooterText("");
      setSavedMessage(tb("cleared", "Branding cleared — reverted to default."));
      setTimeout(() => setSavedMessage(null), 3000);
      brandingQuery.refetch();
    },
  });

  const handleLogoUpload = async (file: File) => {
    setErrorMessage(null);
    if (!file.type.match(/^image\/(png|jpeg|jpg|svg\+xml|webp)$/)) {
      setErrorMessage(tb("errUnsupported", "Only PNG, JPG, SVG, or WebP logos are accepted."));
      return;
    }
    if (file.size > 250 * 1024) {
      setErrorMessage(tb("errTooLarge", "Logo too large (max 250 KB). Optimize it first."));
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      setLogoDataUrl(`data:${file.type};base64,${base64}`);
    } catch (err: any) {
      setErrorMessage(err?.message ?? String(err));
    }
  };

  const handleSave = () => {
    setErrorMessage(null);
    updateMutation.mutate({
      companyName: companyName.trim() || null,
      primaryColor: primaryColor.trim() || null,
      logoDataUrl: logoDataUrl,
      footerText: footerText.trim() || null,
    });
  };

  const handleClear = () => {
    if (!confirm(tb("clearConfirm", `Clear all branding and revert to default ${BRAND_NAME}? Your exports will no longer use your logo.`))) return;
    clearMutation.mutate();
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || tierLoading) return <PageLoader />;
  if (!isAuthenticated) {
    return null;
  }

  if (!hasDeveloper) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4">
              <Palette className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">{tb("title", "Marca blanca")}</h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              {tb("marketingDesc", `Reemplaza la marca de ${BRAND_NAME} en los PDF exportados con tu propio logo, nombre de empresa y color principal. Se aplica al paquete del constructor IA de proyectos, al envío de Puro.earth y a la exportación del resumen ejecutivo.`)}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-amber-900 mb-1">{tb("expertRequired", "Se requiere plan Developer o superior")}</div>
              <p className="text-sm text-amber-800 mb-3">
                {tb("expertRequiredDesc", `La marca blanca está incluida desde el plan Developer. Actualiza tu plan para quitar ${BRAND_NAME} de las exportaciones que compartes con clientes.`)}
              </p>
              <button
                onClick={() => navigate("/pricing")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-900 text-white text-sm font-medium rounded-lg hover:bg-amber-950"
              >
                {tb("seeExpertPlan", "Ver plan Developer")}
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{tb("title", "Marca blanca")}</h1>
              <p className="text-sm text-muted-foreground">{tb("subtitle", "Reemplaza la marca de la plataforma en todos tus PDF exportados.")}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: form */}
          <section className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-foreground">{tb("formTitle", "Tu marca")}</h2>

            {/* Company name */}
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1.5">{tb("companyName", "Nombre de la empresa")}</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={tb("companyNamePlaceholder", "ej. Acme Biochar SRL")}
                maxLength={200}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{tb("companyNameHint", "Aparece en el encabezado del PDF. Déjalo vacío para usar el valor por defecto.")}</p>
            </div>

            {/* Logo upload */}
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1.5">{tb("logo", "Logo")}</label>
              <div className="border border-dashed border-input rounded-lg p-4 bg-muted/40/50">
                {logoDataUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-card border border-border rounded flex items-center justify-center p-2">
                      <img src={logoDataUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground mb-1">{tb("logoUploaded", "Logo cargado")}</div>
                      <div className="flex gap-2">
                        <label className="text-xs text-indigo-600 hover:text-indigo-800 underline cursor-pointer">
                          {tb("logoReplace", "Replace")}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleLogoUpload(f);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setLogoDataUrl(null)}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                        >
                          {tb("logoRemove", "Quitar")}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 cursor-pointer py-4">
                    <Upload className="w-6 h-6 text-muted-foreground/70" />
                    <div className="text-sm text-foreground/90 font-medium">{tb("logoUploadPrompt", "Haz clic para subir el logo")}</div>
                    <div className="text-xs text-muted-foreground">{tb("logoHint", "PNG / JPG / SVG / WebP, max 250 KB")}</div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoUpload(f);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Primary color */}
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1.5">{tb("primaryColor", "Primary color")}</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 border border-input rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  maxLength={7}
                  placeholder="#22c55e"
                  className="flex-1 border border-input rounded-lg px-3 py-2 text-sm font-mono focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPrimaryColor(DEFAULT_COLOR)}
                  className="p-2 text-muted-foreground/70 hover:text-foreground/90"
                  title={tb("primaryColorReset", "Volver al valor por defecto")}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{tb("primaryColorHint", "Se usa en encabezados, acentos y en la portada de los PDF exportados.")}</p>
            </div>

            {/* Footer text */}
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1.5">{tb("footerText", "Texto del footer")}</label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder={tb("footerPlaceholder", "ej. acmebiochar.com · confidencial")}
                maxLength={500}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{tb("footerHint", "Aparece al pie de cada página del PDF (tu URL, nota legal, etc.).")}</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>{errorMessage}</div>
              </div>
            )}

            {savedMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>{savedMessage}</div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? tb("saving", "Guardando...") : tb("save", "Guardar marca")}
              </button>
              <button
                onClick={handleClear}
                disabled={clearMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-red-200 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {tb("clear", "Restablecer valor por defecto")}
              </button>
            </div>
          </section>

          {/* Right: preview */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{tb("previewTitle", "Vista previa")}</h2>

            {/* Preview card — mimics the cover of the AI Builder PDF */}
            <div className="bg-card border-2 border-border rounded-lg overflow-hidden shadow-sm">
              <div className="p-6 border-b-2" style={{ borderColor: primaryColor ? `${primaryColor}40` : "#22c55e40" }}>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {logoDataUrl ? (
                      <img src={logoDataUrl} alt="Logo" className="w-12 h-12 object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: primaryColor || "#22c55e" }}>
                        Paquete de proyecto generado con IA
                      </div>
                      <div className="text-xl font-bold text-foreground">{companyName?.trim() || DEFAULT_EXPORT_COMPANY}</div>
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">Proyecto de ejemplo</div>
                <div className="text-sm text-muted-foreground">60,000 tn/yr · Argentina · Puro.earth</div>
              </div>
              <div className="p-4 bg-muted/40">
                <div className="text-xs text-muted-foreground mb-2">Tabla de contenido</div>
                <ol className="text-xs text-muted-foreground space-y-0.5 pl-4 list-decimal">
                  <li>Resumen ejecutivo</li>
                  <li>Visión técnica general</li>
                  <li>Lista de equipos</li>
                  <li className="opacity-60">...14 más</li>
                </ol>
              </div>
              <div className="p-3 border-t border-border/60 text-xs text-muted-foreground text-center">
                {footerText?.trim() || `Generated by ${companyName?.trim() || DEFAULT_EXPORT_COMPANY} · ${BRAND_URL}`}
              </div>
            </div>

            <div className="bg-muted/40 border border-border rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">{tb("appliedTo", "Se aplica a:")}</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>{tb("appliedAiBuilder", "Exportación PDF del constructor IA de proyectos")}</li>
                <li>{tb("appliedSubmission", "PDF de envío de Puro.earth")}</li>
                <li>{tb("appliedExecutive", "Exportación del resumen ejecutivo")}</li>
              </ul>
              <p className="mt-2 italic text-muted-foreground">{tb("notAffected", "La marca de agua \"DRAFT — AI-generated\" se mantiene en cada exportación, sin importar tu marca.")}</p>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
