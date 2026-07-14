/**
 * AI Project Builder — available from the Engineer tier.
 *
 * Simple flow:
 *   1. User picks biomass (from catalog or custom) + enters capacity + country.
 *   2. Clicks "Generate project". Backend queues ~5 docs, returns project ID.
 *   3. We redirect to /ai-builder/:id where the user sees docs appear
 *      progressively (poll every 3s).
 *
 * The form is intentionally short — the point of this feature is MINIMAL
 * user input, MAXIMAL AI output.
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Sparkles, FileText, Clock, CheckCircle2, AlertTriangle, Lock, Trash2, Upload, FileCheck } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import GuideLink from "@/components/GuideLink";
import UpgradeModal from "@/components/UpgradeModal";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";
import { FEEDSTOCK_DB } from "@/lib/biocharModel";
import { getFeedstockName } from "@/lib/feedstockI18n";
import { ENGINEER_MONTHLY_USD } from "@/lib/pricingCatalog";

// ISO-2 countries we explicitly support in the grounding data.
// Others can be entered but the AI will flag approximations.
const COUNTRY_OPTIONS: Array<{ code: string; name: string; hasGrounding: boolean }> = [
  { code: "AR", name: "Argentina", hasGrounding: true },
  { code: "BR", name: "Brazil", hasGrounding: true },
  { code: "CL", name: "Chile", hasGrounding: true },
  { code: "CO", name: "Colombia", hasGrounding: true },
  { code: "MX", name: "Mexico", hasGrounding: true },
  { code: "PE", name: "Peru", hasGrounding: true },
  { code: "UY", name: "Uruguay", hasGrounding: false },
  { code: "PY", name: "Paraguay", hasGrounding: false },
  { code: "BO", name: "Bolivia", hasGrounding: false },
  { code: "EC", name: "Ecuador", hasGrounding: false },
  { code: "US", name: "United States", hasGrounding: true },
  { code: "CA", name: "Canada", hasGrounding: false },
  { code: "ES", name: "Spain", hasGrounding: true },
  { code: "DE", name: "Germany", hasGrounding: true },
  { code: "FR", name: "France", hasGrounding: false },
  { code: "UK", name: "United Kingdom", hasGrounding: false },
  { code: "IN", name: "India", hasGrounding: true },
  { code: "AU", name: "Australia", hasGrounding: false },
  { code: "ZA", name: "South Africa", hasGrounding: false },
];

const METHODOLOGY_OPTIONS = [
  "puro-earth",
  "isometric",
  "ebc",
  "verra-vm0044",
  "gold-standard",
  "rainbow-standard",
] as const;

export default function AiBuilder() {
  const { t, i18n } = useTranslation("common");
  const { t: tFs } = useTranslation("feedstocks");
  const tb = (k: string, fallback: string, opts?: Record<string, any>) =>
    t(`aiBuilder.${k}`, { defaultValue: fallback, ...(opts ?? {}) });
  const locale = i18n.resolvedLanguage?.toLowerCase().startsWith("es")
    ? "es-AR"
    : (i18n.resolvedLanguage || "en-US");
  const countryDisplayNames = typeof Intl.DisplayNames !== "undefined"
    ? new Intl.DisplayNames([locale], { type: "region" })
    : null;
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const [, navigate] = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [biomassMode, setBiomassMode] = useState<"catalog" | "labPdf">("catalog");
  const [biomassId, setBiomassId] = useState<string>("pine_sawdust");
  const [capacityTnYear, setCapacityTnYear] = useState<number>(30000);
  const [country, setCountry] = useState<string>("AR");
  const [location, setLocation] = useState<string>("");
  // Debounced location autocomplete (Nominatim via projects.searchLocation)
  const [locationQuery, setLocationQuery] = useState<string>("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [offtakerType, setOfftakerType] = useState<"investor" | "certifier" | "both">("both");
  const [targetMethodology, setTargetMethodology] = useState<string>("puro-earth");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSpanish = (i18n.language ?? "").toLowerCase().startsWith("es");

  // Custom methodologies dropdown — only Expert users have them, and they
  // may have 0. The standard methodologies are always available.
  const customMethodologiesQuery = trpc.customMethodology.list.useQuery(undefined, {
    enabled: true, // non-Expert returns empty, so no harm in firing
  });
  const customMethodologies = customMethodologiesQuery.data ?? [];

  // Debounce location → search query (300ms after typing stops)
  useEffect(() => {
    const id = setTimeout(() => setLocationQuery(location.trim()), 300);
    return () => clearTimeout(id);
  }, [location]);
  const locationSearch = trpc.projects.searchLocation.useQuery(
    { query: locationQuery },
    { enabled: locationQuery.length >= 3 && showLocationDropdown, staleTime: 60_000 },
  );

  // Lab PDF state
  const [labExtracting, setLabExtracting] = useState(false);
  const [labBiomassName, setLabBiomassName] = useState<string>("");
  const [labBiomassSource, setLabBiomassSource] = useState<string>("");
  // Measured biochar-side data from the lab PDF. When present, these flow
  // into the deterministic carbon balance on the server so C_org and
  // permanence come from the actual batch instead of feedstock defaults.
  const [labBiocharCOrgPct, setLabBiocharCOrgPct] = useState<number | null>(null);
  const [labBiocharHCorgMolar, setLabBiocharHCorgMolar] = useState<number | null>(null);
  // Advanced overrides — for users with prior LCA study or pyrolyzer
  // performance data. Undefined means "use the helper default"; a value
  // means "trust this input". Kept optional to preserve the low-friction
  // flow for first-time users.
  const [overrideLcaEmissionsPct, setOverrideLcaEmissionsPct] = useState<number | null>(null);
  const [overrideBiocharYieldPct, setOverrideBiocharYieldPct] = useState<number | null>(null);
  const [overrideBiocharCOrgPct, setOverrideBiocharCOrgPct] = useState<number | null>(null);
  const [overridePermanencePct, setOverridePermanencePct] = useState<number | null>(null);
  // Moisture as an explicit override (5th field). Catalog + lab PDF already
  // supply moisture, but operators with oven-dried feedstock (say sawdust
  // at 8-12% vs the catalog's 46%) need to correct it without uploading a
  // full lab — moisture is exactly the input that caused the ~2× CDR
  // overreport bug so it earns a first-class override slot.
  const [overrideMoisturePct, setOverrideMoisturePct] = useState<number | null>(null);
  const [labComposition, setLabComposition] = useState<
    | { C: number; H: number; O: number; N: number; S: number; ash: number; moisture: number }
    | null
  >(null);
  const [labPdfFileName, setLabPdfFileName] = useState<string>("");
  const extractLabMutation = trpc.biomass.extractLabAnalysis.useMutation();
  const methodologyOptions = METHODOLOGY_OPTIONS.map((value) => ({
    value,
    label:
      value === "gold-standard"
        ? tb("methodologyGoldStandard", "Gold Standard (in preparation)")
        : value === "rainbow-standard"
          ? tb("methodologyRainbowStandard", "Rainbow Standard (ICVCM-approved, <3mo timeline)")
          : value === "verra-vm0044"
            ? "Verra VM0044"
            : value === "puro-earth"
              ? "Puro.earth"
              : value === "isometric"
                ? "Isometric"
                : "EBC",
  }));

  // List existing projects
  const projectsQuery = trpc.aiBuilder.list.useQuery(undefined, {
    enabled: isAuthenticated && !tierLoading && hasAccess("engineer"),
    refetchInterval: (query) => {
      // If any project is "generating", poll every 5s. Otherwise no poll.
      const data = query.state.data;
      if (!data) return false;
      return data.some((p) => p.status === "generating" || p.status === "pending") ? 5000 : false;
    },
  });

  const createMutation = trpc.aiBuilder.create.useMutation({
    // Auto-retry twice on transient errors (network drop, 5xx, server
    // rolling-deploy blackout). Prod deploys can take 30-90s between the
    // machine draining and the new one accepting traffic; without this
    // the first user request during that window silently drops.
    retry: (failureCount, err) => {
      if (failureCount >= 2) return false;
      const msg = String(err?.message ?? "").toLowerCase();
      const transient =
        msg.includes("fetch") ||
        msg.includes("network") ||
        msg.includes("timeout") ||
        msg.includes("aborted") ||
        msg.includes("502") ||
        msg.includes("503") ||
        msg.includes("504");
      return transient;
    },
    retryDelay: (attempt) => Math.min(3_000 * 2 ** attempt, 12_000),
    onSuccess: (data) => {
      setSubmitting(false);
      // Belt-and-suspenders: an empty projectId would leave the user on a
      // dead route ("/ai-builder/undefined") with no error — surface it as
      // an error instead. Should never happen given the server contract,
      // but the whole reason we're here is a bug where the UI trusted a
      // response that never came.
      if (!data || typeof data.projectId !== "number") {
        setErrorMessage(
          isSpanish
            ? "El servidor respondió sin ID de proyecto. Probá de nuevo en unos segundos."
            : "The server responded without a project ID. Please try again in a few seconds.",
        );
        return;
      }
      navigate(`/ai-builder/${data.projectId}`);
    },
    onError: (err) => {
      setSubmitting(false);
      const msg = String(err?.message ?? "");
      const isNetwork =
        /fetch|network|timeout|abort|502|503|504/i.test(msg);
      if (isNetwork) {
        setErrorMessage(
          isSpanish
            ? "No pudimos alcanzar el servidor (posible deploy en curso o red inestable). Reintentamos dos veces automáticamente; probá una vez más en unos segundos."
            : "We couldn't reach the server (possible in-flight deploy or unstable network). We retried twice automatically; try once more in a few seconds.",
        );
      } else {
        setErrorMessage(msg);
      }
    },
  });

  const deleteMutation = trpc.aiBuilder.delete.useMutation({
    onSuccess: () => projectsQuery.refetch(),
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || tierLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const hasEngineer = hasAccess("engineer");
  const hasExpert = hasAccess("expert");

  // ─── Lab PDF upload handler ───────────────────────────────────────────────
  const handleLabPdfUpload = async (file: File) => {
    setErrorMessage(null);
    if (file.type !== "application/pdf") {
      setErrorMessage("Please upload a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("PDF too large (max 10 MB).");
      return;
    }
    setLabExtracting(true);
    setLabPdfFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const pdfBase64 = btoa(binary);

      const result = await extractLabMutation.mutateAsync({
        pdfBase64,
        pdfName: file.name,
        allowPublicUse: false,
      });

      const bm = result?.biomass ?? {};
      const bc = (result as { biochar?: { C?: number | null; HCorgMolar?: number | null } })?.biochar ?? {};
      setLabBiomassName(result?.biomassName ?? file.name.replace(/\.pdf$/i, ""));
      setLabBiomassSource(result?.source ?? "Lab analysis upload");
      setLabComposition({
        C: bm.C ?? 0,
        H: bm.H ?? 0,
        O: bm.O ?? 0,
        N: bm.N ?? 0,
        S: bm.S ?? 0,
        ash: bm.ash ?? 0,
        moisture: bm.moisture ?? 0,
      });
      // Biochar-side measurements — used to override the feedstock C_org
      // lookup and to tighten the permanence factor via H:Corg tiering.
      setLabBiocharCOrgPct(typeof bc.C === "number" && bc.C > 0 ? bc.C : null);
      setLabBiocharHCorgMolar(typeof bc.HCorgMolar === "number" && bc.HCorgMolar > 0 ? bc.HCorgMolar : null);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.startsWith("UPGRADE_REQUIRED")) {
        setErrorMessage("La carga de PDF de laboratorio requiere plan Analyst o superior. Este flujo del plan Engineer ya lo incluye; si sigues viendo este mensaje, contacta soporte.");
      } else {
        setErrorMessage(`Couldn't extract lab analysis: ${msg}`);
      }
    } finally {
      setLabExtracting(false);
    }
  };

  // Every guard sets an errorMessage and scrolls it into view so the user
  // never sees "nothing happened" when the button is clicked. Also used by
  // input onInvalid handlers to surface native constraint validation messages
  // (fixes a real bug where step=1000 mismatches aborted the submit silently).
  const surfaceError = (msg: string, focusId?: string) => {
    setErrorMessage(msg);
    requestAnimationFrame(() => {
      document.getElementById("ai-builder-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (focusId) (document.getElementById(focusId) as HTMLInputElement | null)?.focus();
    });
  };

  // ─── Submit handler ───────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hasEngineer) {
      setShowUpgrade(true);
      return;
    }

    if (!name.trim()) {
      surfaceError("Falta el nombre del proyecto (arriba de todo del formulario).", "ai-builder-name");
      return;
    }

    let biomassPayload: {
      biomassId: string;
      biomassName: string;
      biomassComposition?: { C: number; H: number; O: number; N: number; S: number; ash: number; moisture: number };
      biomassSource?: string;
    };

    if (biomassMode === "catalog") {
      const biomass = FEEDSTOCK_DB[biomassId];
      if (!biomass) {
        surfaceError("Elige una biomasa del catálogo antes de generar.");
        return;
      }
      biomassPayload = {
        biomassId,
        biomassName: biomass.name,
        biomassComposition: {
          C: biomass.C, H: biomass.H, O: biomass.O, N: biomass.N, S: biomass.S,
          ash: biomass.ash, moisture: biomass.moisture,
        },
        biomassSource: biomass.source,
      };
    } else {
      // Lab PDF mode
      if (!labComposition || !labBiomassName) {
        surfaceError("Sube un análisis de laboratorio en PDF y espera que termine la extracción antes de generar.");
        return;
      }
      biomassPayload = {
        biomassId: "custom-lab",
        biomassName: labBiomassName,
        biomassComposition: labComposition,
        biomassSource: labBiomassSource || "Lab analysis PDF upload",
      };
    }

    setSubmitting(true);

    // The methodology dropdown can hold either a public methodology id
    // ("puro-earth", "isometric", etc) or a custom one ("custom:42").
    // Split the payload accordingly.
    const mSelected = targetMethodology;
    const isCustom = mSelected.startsWith("custom:");
    const customMethodologyId = isCustom ? Number(mSelected.slice("custom:".length)) : undefined;
    const publicMethodology = isCustom ? undefined : (mSelected as any);

    createMutation.mutate({
      name: name.trim(),
      ...biomassPayload,
      capacityTnYear,
      country,
      location: location.trim() || undefined,
      offtakerType,
      targetMethodology: publicMethodology,
      customMethodologyId,
      lang: i18n.language,
      // Lab-measured biochar figures — server uses these to bypass the
      // feedstock-family C_org lookup and refine permanence via H:Corg
      // when the operator uploaded a real lab report. Manual overrides
      // (from the advanced section) take precedence over the lab values.
      biocharCOrgPct: overrideBiocharCOrgPct
        ?? (biomassMode === "labPdf" && labBiocharCOrgPct != null ? labBiocharCOrgPct : undefined),
      biocharHCorgMolar: biomassMode === "labPdf" && labBiocharHCorgMolar != null ? labBiocharHCorgMolar : undefined,
      lcaEmissionsPct: overrideLcaEmissionsPct ?? undefined,
      biocharYieldPct: overrideBiocharYieldPct ?? undefined,
      permanencePct: overridePermanencePct ?? undefined,
      moistureOverridePct: overrideMoisturePct ?? undefined,
    });
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* ═══ Header ═══ */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{tb("title", "Constructor IA de proyectos")}</h1>
              <p className="text-sm text-muted-foreground">{tb("subtitle", "Cargas biomasa, capacidad y país, y la IA redacta un paquete inicial para acelerar el trabajo de tu equipo, no para reemplazarlo.")}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
            <Sparkles className="w-3 h-3" /> {tb("tierBadge", `Incluido desde Engineer — USD $${ENGINEER_MONTHLY_USD}/mes`)}
          </div>
          <div className="mt-4 rounded-xl border border-border bg-card/70 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {tb("flowEyebrow", "Cómo usar este flujo")}
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {tb("flowTitle", "Primero borrador AI, después PDD editable, y por último proyecto estándar")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {tb("flowBody", "Esta pantalla sirve para armar un paquete inicial rápido. No es el cierre final del proyecto: después revisas el paquete, abres el PDD editable y continúas el mismo trabajo en /projects.")}
            </p>
            <GuideLink anchor="como-ai-builder" label="Ver guía completa de AI Builder" className="mt-3 inline-flex" />
          </div>
        </div>

        {!hasEngineer && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-amber-900 mb-1">{tb("expertRequired", "Se requiere plan Engineer o superior")}</div>
              <p className="text-sm text-amber-800 mb-3">{tb("expertRequiredDesc", "El constructor IA de proyectos está incluido desde el plan Engineer. Genera un primer paquete documental en minutos a partir de catálogos curados de equipos y factores de emisión por país, para que luego lo revises y ajustes.")}</p>
              <button
                onClick={() => navigate("/pricing")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-900 text-white text-sm font-medium rounded-lg hover:bg-amber-950"
              >
                {tb("seeExpertPlan", "Ver plan Engineer")}
              </button>
            </div>
          </div>
        )}

        {/* ═══ Form ═══ */}
        <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1">{tb("newProject", "Nuevo proyecto")}</h2>
          <p className="text-sm text-muted-foreground mb-6">{tb("newProjectHint", "Tres inputs. La IA arma el primer borrador.")}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Project name */}
            <div>
              <label htmlFor="ai-builder-name" className="block text-sm font-medium text-foreground/90 mb-1.5">
                {tb("projectName", "Project name")} <span className="text-red-500">*</span>
              </label>
              <input
                id="ai-builder-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tb("projectNamePlaceholder", "e.g. North Patagonia Biochar Facility")}
                maxLength={200}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            {/* Biomass mode tabs */}
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1.5">{tb("biomass", "Biomass feedstock")}</label>
              <div className="inline-flex border border-input rounded-lg overflow-hidden mb-3">
                <button
                  type="button"
                  onClick={() => setBiomassMode("catalog")}
                  className={`px-3 py-1.5 text-xs font-medium ${biomassMode === "catalog" ? "bg-indigo-600 text-white" : "bg-card text-foreground/90 hover:bg-muted/40"}`}
                >
                  {tb("biomassFromCatalog", "From catalog")}
                </button>
                <button
                  type="button"
                  onClick={() => setBiomassMode("labPdf")}
                  className={`px-3 py-1.5 text-xs font-medium border-l border-input ${biomassMode === "labPdf" ? "bg-indigo-600 text-white" : "bg-card text-foreground/90 hover:bg-muted/40"}`}
                >
                  {tb("biomassFromLabPdf", "Upload lab analysis PDF")}
                </button>
              </div>

              {biomassMode === "catalog" ? (
                <>
                  <select
                    value={biomassId}
                    onChange={(e) => setBiomassId(e.target.value)}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                  >
                    {Object.entries(FEEDSTOCK_DB)
                      .map(([id, f]) => ({ id, f, name: getFeedstockName(id, f.name, tFs) }))
                      .sort((a, b) => a.name.localeCompare(b.name, i18n.language, { sensitivity: "base" }))
                      .map(({ id, name }) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">{tb("biomassCatalogHint", "Pick from 48 curated feedstocks.")}</p>
                </>
              ) : (
                <div className="border border-dashed border-input rounded-lg p-4 bg-muted/40/50">
                  {!labComposition && !labExtracting && (
                    <label className="flex flex-col items-center justify-center gap-2 cursor-pointer text-center py-4">
                      <Upload className="w-6 h-6 text-muted-foreground/70" />
                      <div className="text-sm text-foreground/90 font-medium">{tb("labPdfTitle", "Upload lab analysis PDF")}</div>
                      <div className="text-xs text-muted-foreground">{tb("labPdfHint", "Max 10 MB. AI will extract the elemental composition (CHONS, ash, moisture) to ground the project generation.")}</div>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleLabPdfUpload(f);
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 bg-card border border-input text-foreground/90 text-xs font-medium rounded hover:bg-muted/40">
                        {tb("labPdfChoose", "Choose PDF")}
                      </span>
                    </label>
                  )}
                  {labExtracting && (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 animate-pulse" />
                      {tb("labPdfExtracting", "Extracting composition from")} {labPdfFileName}…
                    </div>
                  )}
                  {labComposition && !labExtracting && (
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <div>
                            <div className="text-sm font-medium text-foreground">{labBiomassName}</div>
                            <div className="text-xs text-muted-foreground">Extracted from {labPdfFileName}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLabComposition(null);
                            setLabBiomassName("");
                            setLabBiomassSource("");
                            setLabPdfFileName("");
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                        >
                          {tb("labPdfReupload", "Re-upload")}
                        </button>
                      </div>
                      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                        {(["C", "H", "O", "N", "S", "ash", "moisture"] as const).map((k) => (
                          <div key={k} className="bg-card border border-border rounded px-2 py-1.5 text-center">
                            <div className="text-xs text-muted-foreground uppercase">{k}</div>
                            <input
                              type="number"
                              step="0.01"
                              value={labComposition[k]}
                              onChange={(e) => setLabComposition({ ...labComposition, [k]: Number(e.target.value) })}
                              className="w-full text-center text-sm font-semibold text-foreground bg-transparent outline-none"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 italic">{tb("labPdfExtractedHint", "Edit any value if the lab report was misread.")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Capacity */}
            <div>
              <label htmlFor="ai-builder-capacity" className="block text-sm font-medium text-foreground/90 mb-1.5">
                {tb("capacity", "Annual biomass capacity (tn/year)")} <span className="text-red-500">*</span>
              </label>
              <input
                id="ai-builder-capacity"
                type="number"
                value={capacityTnYear}
                onChange={(e) => setCapacityTnYear(Number(e.target.value))}
                min={1000}
                max={1_000_000}
                step={1}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                required
                onInvalid={(e) => {
                  // Surface the native constraint validation message ourselves,
                  // otherwise the browser silently aborts the submit and the
                  // user sees nothing. Fixes a real bug where entering a
                  // non-round number (e.g. 66449) blocked the form silently.
                  const el = e.currentTarget;
                  surfaceError(el.validationMessage || "La capacidad ingresada no es válida.", "ai-builder-capacity");
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">{tb("capacityHint", "Common range: 20,000–150,000 tn/yr (wet basis). Biochar output ≈ 30% of DRY biomass — moisture is subtracted first.")}</p>
            </div>

            {/* Advanced overrides — collapsed by default. For operators with
                real LCA / pyrolyzer study data that would otherwise be
                replaced by industry defaults, so the generated dossier can
                use measured values instead of estimates. */}
            <details className="border border-input rounded-lg group">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground/90 select-none list-none flex items-center justify-between hover:bg-muted/40">
                <span>{tb("overridesSummary", "Overrides avanzados (opcional) — para reemplazar defaults con mediciones reales del proyecto")}</span>
                <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-input space-y-3 bg-muted/20">
                <p className="text-[11px] text-muted-foreground">
                  {tb("overridesDescription", "Sin valores acá, el helper usa: 15% LCA emissions (media Puro registry), 30% yield (peer-reviewed), C_org típico por familia, 85% permanencia. Cuando el paquete se genera con defaults, cada documento lleva un disclaimer indicando qué números requieren validación antes del envío a VVB. Metá los valores medidos si tenés estudio propio.")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground/80 mb-1">{tb("overrideMoistureLabel", "Humedad (%)")}</label>
                    <input
                      type="number" min="0" max="80" step="0.01"
                      placeholder="—"
                      value={overrideMoisturePct ?? ""}
                      onChange={(e) => setOverrideMoisturePct(e.target.value === "" ? null : Number(e.target.value))}
                      className="w-full border border-input rounded px-2 py-1.5 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">{tb("overrideMoistureHint", "Si el catálogo/lab no refleja tu biomasa. Aserrín secado: 8-15%. Verde: 40-55%.")}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/80 mb-1">{tb("overrideLcaLabel", "LCA emissions (%)")}</label>
                    <input
                      type="number" min="0" max="80" step="0.01"
                      placeholder="15"
                      value={overrideLcaEmissionsPct ?? ""}
                      onChange={(e) => setOverrideLcaEmissionsPct(e.target.value === "" ? null : Number(e.target.value))}
                      className="w-full border border-input rounded px-2 py-1.5 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">{tb("overrideLcaHint", "Rango real 5-30%. Aperam 15-25%, Wakefield ~7%.")}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/80 mb-1">{tb("overrideYieldLabel", "Biochar yield (% base seca)")}</label>
                    <input
                      type="number" min="10" max="60" step="0.01"
                      placeholder="30"
                      value={overrideBiocharYieldPct ?? ""}
                      onChange={(e) => setOverrideBiocharYieldPct(e.target.value === "" ? null : Number(e.target.value))}
                      className="w-full border border-input rounded px-2 py-1.5 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">{tb("overrideYieldHint", "Rango típico 25-35% según reactor y temperatura.")}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/80 mb-1">{tb("overrideCOrgLabel", "Biochar C_org (%)")}</label>
                    <input
                      type="number" min="30" max="99" step="0.01"
                      placeholder="—"
                      value={overrideBiocharCOrgPct ?? ""}
                      onChange={(e) => setOverrideBiocharCOrgPct(e.target.value === "" ? null : Number(e.target.value))}
                      className="w-full border border-input rounded px-2 py-1.5 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">{tb("overrideCOrgHint", "Si subiste lab PDF ya viene de ahí. Sólo llenar para overridear.")}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/80 mb-1">{tb("overridePermanenceLabel", "Permanence (%)")}</label>
                    <input
                      type="number" min="30" max="100" step="0.01"
                      placeholder="85"
                      value={overridePermanencePct ?? ""}
                      onChange={(e) => setOverridePermanencePct(e.target.value === "" ? null : Number(e.target.value))}
                      className="w-full border border-input rounded px-2 py-1.5 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">{tb("overridePermanenceHint", "Default Puro 85%. Iso 90%. Con H:Corg ≤ 0.4 medido → 90-95%.")}</p>
                  </div>
                </div>
              </div>
            </details>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1.5">{tb("country", "Country")}</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {countryDisplayNames?.of(c.code === "UK" ? "GB" : c.code) ?? c.name}
                      {c.hasGrounding ? "" : ` ${tb("countryApproximateGridData", "(approximate grid data)")}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location with autocomplete (Nominatim via projects.searchLocation) */}
              <div className="relative">
                <label className="block text-sm font-medium text-foreground/90 mb-1.5">
                  {tb("location", "Region / city")} <span className="text-muted-foreground/70 font-normal">{tb("locationOptional", "(optional)")}</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); setShowLocationDropdown(true); }}
                  onFocus={() => setShowLocationDropdown(true)}
                  onBlur={() => setTimeout(() => setShowLocationDropdown(false), 150)}
                  placeholder={tb("locationPlaceholder", "e.g. Corrientes Province")}
                  maxLength={200}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
                {showLocationDropdown && locationQuery.length >= 3 && (
                  <div className="absolute left-0 right-0 mt-1 z-20 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {locationSearch.isLoading && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{tb("locationSearching", "Searching...")}</div>
                    )}
                    {!locationSearch.isLoading && (locationSearch.data?.length ?? 0) === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{tb("locationNoResults", "No results — keep typing or skip this field")}</div>
                    )}
                    {locationSearch.data?.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setLocation(r.displayName); setShowLocationDropdown(false); }}
                        className="block w-full text-left px-3 py-2 text-xs hover:bg-muted/40 border-b border-border/60 last:border-b-0"
                      >
                        <div className="font-medium text-foreground">{r.displayName}</div>
                        {r.country && <div className="text-[10px] text-muted-foreground mt-0.5">{r.country}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Offtaker type */}
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1.5">{tb("audience", "Audience")}</label>
                <select
                  value={offtakerType}
                  onChange={(e) => setOfftakerType(e.target.value as any)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  <option value="both">{tb("audienceBoth", "Investor + certifier (balanced)")}</option>
                  <option value="investor">{tb("audienceInvestor", "Investor pitch")}</option>
                  <option value="certifier">{tb("audienceCertifier", "Certifier submission")}</option>
                </select>
              </div>

              {/* Target methodology */}
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1.5">{tb("methodology", "Primary methodology")}</label>
                <select
                  value={targetMethodology}
                  onChange={(e) => setTargetMethodology(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  {customMethodologies.length > 0 && (
                    <optgroup label={tb("customMethodologiesGroup", "Your custom methodologies")}>
                      {customMethodologies.map((cm) => (
                        <option key={`custom-${cm.id}`} value={`custom:${cm.id}`}>
                          {cm.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={tb("publicMethodologiesGroup", "Public methodologies")}>
                    {methodologyOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {hasExpert && customMethodologies.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {tb("addOwnMethodologyPre", "Want to add your own methodology?")}{" "}
                    <Link href="/methodologies" className="text-indigo-600 hover:underline">
                      {tb("addOwnMethodologyLink", "Define one here")}
                    </Link>
                    .
                  </p>
                )}
              </div>
            </div>

            {errorMessage && (
              <div
                id="ai-builder-error"
                role="alert"
                className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>{errorMessage}</div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                {submitting ? tb("generating", "Creando proyecto...") : tb("generate", "Generar paquete del proyecto")}
              </button>
              <p className="text-xs text-muted-foreground">{tb("generationTime", "La generación suele tardar entre 2 y 4 minutos. Verás aparecer los documentos a medida que estén listos.")}</p>
            </div>
          </form>
        </section>

        {/* ═══ Existing projects ═══ */}
        {hasEngineer && projectsQuery.data && projectsQuery.data.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">{tb("existingProjects", "Your generated projects")}</h2>
            <div className="space-y-2">
              {projectsQuery.data.map((p) => (
                <Link key={p.id} href={`/ai-builder/${p.id}`}>
                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.capacityTnYear.toLocaleString(locale)} tn/yr · {p.country} · {new Date(p.createdAt).toLocaleDateString(locale)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm(tb("deleteConfirm", 'Delete project "{{name}}"? This cannot be undone.', { name: p.name }))) {
                            deleteMutation.mutate({ projectId: p.id });
                          }
                        }}
                        className="p-1.5 text-muted-foreground/70 hover:text-red-600 rounded"
                        title={tb("deleteAction", "Delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {showUpgrade && <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} featureName="Constructor IA de proyectos" requiredTier="engineer" />}
    </AppLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string, opts?: Record<string, any>) =>
    t(`aiBuilder.${k}`, { defaultValue: fallback, ...(opts ?? {}) });
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> {tb("statusComplete", "Complete")}
      </span>
    );
  }
  if (status === "generating" || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-200">
        <Clock className="w-3 h-3 animate-pulse" /> {tb("statusGenerating", "Generating")}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded border border-red-200">
        <AlertTriangle className="w-3 h-3" /> {tb("statusError", "Error")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted/40 text-foreground/90 text-xs rounded border border-border">
      <FileText className="w-3 h-3" /> {status}
    </span>
  );
}
