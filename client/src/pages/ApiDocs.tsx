import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Code2,
  Zap,
  Database,
  Layers,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Gauge,
  ExternalLink,
  Terminal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";
import UpgradeModal from "@/components/UpgradeModal";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";

const BASE_URL = "https://biocharpro.io";

const EXAMPLE_SIMULATE = `curl -X POST ${BASE_URL}/api/v1/simulate \\
  -H "Authorization: Bearer bop_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "temperature": 600,
    "residenceTime": 30,
    "feedstockId": "pine_sawdust"
  }'`;

const EXAMPLE_BATCH = `curl -X POST ${BASE_URL}/api/v1/batch \\
  -H "Authorization: Bearer bop_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "temperature": 600,
    "residenceTime": 30,
    "feedstockIds": ["pine_sawdust", "rice_husk", "wheat_straw"]
  }'`;

const EXAMPLE_FEEDSTOCKS = `curl ${BASE_URL}/api/v1/feedstocks \\
  -H "Authorization: Bearer bop_YOUR_API_KEY"`;

const EXAMPLE_EXTRACT_LAB = `# Encode your lab-analysis PDF as base64 first, then:
curl -X POST ${BASE_URL}/api/v1/extract-lab-analysis \\
  -H "Authorization: Bearer bop_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pdfBase64": "JVBERi0xLjQKJeLjz9MK...",
    "pdfName": "lab_analysis.pdf"
  }'`;

/**
 * Build the `claude mcp add` command a user can paste into their terminal to
 * connect biocharpro.io as an MCP server. When `apiKey` is provided (i.e. the
 * user just created a new key and we still have the raw string in memory) we
 * embed it directly. Otherwise we leave a `bop_YOUR_API_KEY` placeholder so
 * existing-key users copy, then manually swap in their own key.
 */
function buildMcpAddCommand(apiKey: string | null): string {
  const key = apiKey ?? "bop_YOUR_API_KEY";
  return `claude mcp add biocharpro \\
  --transport http \\
  --header "Authorization: Bearer ${key}" \\
  ${BASE_URL}/mcp`;
}

/**
 * HTTP codes the API emits. Uniform error shape is
 *   { error: { code: string, message: string, details?: object } }
 */
const ERROR_CODES: Array<{ http: string; code: string; meaning: string }> = [
  { http: "400", code: "MISSING_PARAMS / PARAM_OUT_OF_RANGE / UNKNOWN_FEEDSTOCK", meaning: "Bad request — check your input shape" },
  { http: "401", code: "MISSING_AUTH / INVALID_KEY / EMPTY_KEY", meaning: "Authentication failed" },
  { http: "403", code: "TIER_REQUIRED / TIER_ACCESS_EXPIRED", meaning: "Developer tier or higher required" },
  { http: "413", code: "PDF_TOO_LARGE / BATCH_TOO_LARGE", meaning: "Payload exceeds limits (10 MB PDF, 50 feedstocks)" },
  { http: "422", code: "EXTRACTION_FAILED", meaning: "PDF unreadable by the AI" },
  { http: "429", code: "RATE_LIMITED / AI_QUOTA_EXCEEDED", meaning: "Slow down — retry with exponential backoff" },
  { http: "500", code: "SIMULATE_FAILED / BATCH_FAILED / EXTRACT_LAB_FAILED", meaning: "Unexpected server error" },
  { http: "503", code: "AI_UNAVAILABLE / DB_UNAVAILABLE", meaning: "Downstream service down temporarily" },
  { http: "504", code: "AI_TIMEOUT", meaning: "AI extraction took longer than the timeout" },
];

export default function ApiDocs() {
  const { t } = useTranslation("api");
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [newKeyName, setNewKeyName] = useState("Default");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** Which snippet was most recently copied — drives the per-button ✓ icon. */
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const keysQuery = trpc.apiKeys.list.useQuery(undefined, {
    enabled: !!user && hasAccess("developer"),
  });

  const createKey = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.key);
      utils.apiKeys.list.invalidate();
    },
  });

  const revokeKey = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => utils.apiKeys.list.invalidate(),
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /** Per-snippet copy so multiple ✓ indicators don't collide. */
  const handleCopySnippet = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
  };

  useEffect(() => {
    if (!authLoading && !user) setLocation("/login");
  }, [authLoading, user, setLocation]);

  if (authLoading || tierLoading) return <PageLoader />;

  if (!user) {
    return null;
  }

  if (!hasAccess("developer")) {
    return (
      <UpgradeModal
        isOpen={true}
        onClose={() => setLocation("/app")}
        featureName="REST API"
        requiredTier="developer"
      />
    );
  }

  const activeKeys = (keysQuery.data ?? []).filter((k: any) => !k.revokedAt);

  return (
    <AppLayout
      pageTitle={<span className="flex items-center gap-2"><Code2 className="w-4 h-4 text-primary" /> {t("title")}</span>}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* API Keys management */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Key className="w-4 h-4" /> {t("keys.title")}
            </h2>
          </div>

          {/* Created key alert — shows the raw key + the ready-to-paste MCP
              command with that key already embedded (the user only sees the
              key once, so we capture the opportunity). */}
          {createdKey && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-foreground font-medium">{t("keys.copyWarning")}</p>
              </div>

              {/* Raw key */}
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("keys.yourKey", { defaultValue: "Your API key" })}
                </div>
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                  <code className="text-xs font-mono flex-1 break-all">{createdKey}</code>
                  <button
                    onClick={() => handleCopy(createdKey)}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Ready-to-paste MCP command with the key embedded */}
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  {t("mcp.readyCommand", { defaultValue: "One-click Claude Code setup · paste in terminal" })}
                </div>
                <div className="flex items-start gap-2 bg-background border border-border rounded-lg px-3 py-2">
                  <pre className="text-[11px] font-mono flex-1 whitespace-pre-wrap break-all">{buildMcpAddCommand(createdKey)}</pre>
                  <button
                    onClick={() => handleCopySnippet(buildMcpAddCommand(createdKey), "mcp-embedded")}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
                    title={t("mcp.copyCmd", { defaultValue: "Copy command" })}
                  >
                    {copiedKey === "mcp-embedded" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                  {t("mcp.readyHint", {
                    defaultValue: "Paste into your terminal. Claude Code will register biocharpro as an MCP server and expose 4 tools (simulate, batch, list feedstocks, extract lab PDF) to any session.",
                  })}
                </p>
              </div>

              <button
                onClick={() => setCreatedKey(null)}
                className="text-[10px] text-muted-foreground hover:underline"
              >
                {t("keys.dismiss")}
              </button>
            </div>
          )}

          {/* Key list */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            {activeKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("keys.empty")}</p>
            ) : (
              activeKeys.map((key: any) => (
                <div key={key.id} className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2.5">
                  <div>
                    <div className="text-xs font-medium">{key.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{key.keyPrefix}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {key.lastUsedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {t("keys.lastUsed")}: {new Date(key.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      onClick={() => { if (confirm(t("keys.revokeConfirm"))) revokeKey.mutate({ id: key.id }); }}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={t("keys.namePlaceholder")}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs"
              />
              <Button
                size="sm"
                onClick={() => createKey.mutate({ name: newKeyName })}
                disabled={createKey.isPending || activeKeys.length >= 5}
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t("keys.create")}
              </Button>
            </div>
            {activeKeys.length >= 5 && (
              <p className="text-[10px] text-muted-foreground">{t("keys.limit")}</p>
            )}
          </div>
        </section>

        {/* ─── MCP · Connect from Claude Code ──────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            {t("mcp.title", { defaultValue: "Connect from Claude Code" })}
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              MCP
            </span>
          </h2>

          <div className="bg-gradient-to-br from-primary/5 via-card to-card border border-primary/30 rounded-xl p-4 md:p-5 space-y-3">
            <p className="text-xs md:text-sm text-foreground/90 leading-relaxed">
              {t("mcp.description", {
                defaultValue:
                  "biocharpro.io speaks the Model Context Protocol. Paste the command below into any terminal with Claude Code installed to expose 4 tools (simulate, batch comparison, list feedstocks, extract lab PDF) inside any Claude session.",
              })}
            </p>

            {/* Command block with placeholder or embedded key */}
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" />
                {t("mcp.oneClick", { defaultValue: "One-click setup" })}
              </div>
              <div className="flex items-start gap-2 bg-background border border-border rounded-lg px-3 py-2.5">
                <pre className="text-[11px] md:text-xs font-mono flex-1 whitespace-pre-wrap break-all leading-relaxed">{buildMcpAddCommand(null)}</pre>
                <button
                  onClick={() => handleCopySnippet(buildMcpAddCommand(null), "mcp-placeholder")}
                  className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
                  title={t("mcp.copyCmd", { defaultValue: "Copy command" })}
                >
                  {copiedKey === "mcp-placeholder" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                {t("mcp.replaceHint", {
                  defaultValue:
                    "Replace bop_YOUR_API_KEY with one of your active keys above. If you don't have one yet, create it in the section above — on creation you'll also get the same command with your key already embedded.",
                })}
              </p>
            </div>

            {/* What you can do next */}
            <div className="border-t border-border/60 pt-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {t("mcp.tryThese", { defaultValue: "Once connected, try these prompts in Claude Code:" })}
              </div>
              <ul className="space-y-1.5 text-xs text-foreground/80">
                <li className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">›</span>
                  <span className="italic">{t("mcp.prompt1", { defaultValue: "\"Simulate pine sawdust at 650°C for 30 min using biocharpro. Explain the H:Corg ratio.\"" })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">›</span>
                  <span className="italic">{t("mcp.prompt2", { defaultValue: "\"Using biocharpro, compare pine_sawdust, coffee_husk, rice_straw and corn_stover at 600°C for 30 min. Which gives the best net CO₂e per tonne?\"" })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">›</span>
                  <span className="italic">{t("mcp.prompt3", { defaultValue: "\"List all feedstocks in biocharpro with carbon content above 50%.\"" })}</span>
                </li>
              </ul>
            </div>

            {/* Details */}
            <div className="border-t border-border/60 pt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              <div>
                <div className="font-bold text-foreground mb-0.5">{t("mcp.transport", { defaultValue: "Transport" })}</div>
                <div className="text-muted-foreground">Streamable HTTP · stateless</div>
              </div>
              <div>
                <div className="font-bold text-foreground mb-0.5">{t("mcp.auth", { defaultValue: "Auth" })}</div>
                <div className="text-muted-foreground">Bearer token (same as REST)</div>
              </div>
              <div>
                <div className="font-bold text-foreground mb-0.5">{t("mcp.endpoint", { defaultValue: "Endpoint" })}</div>
                <div className="text-muted-foreground font-mono">{BASE_URL}/mcp</div>
              </div>
            </div>
          </div>
        </section>

        {/* Endpoints */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <Zap className="w-4 h-4" /> {t("endpoints.title")}
          </h2>

          {/* POST /simulate */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-secondary/30 px-4 py-2.5 border-b border-border flex items-center gap-2">
              <span className="bg-green-500/10 text-green-600 text-[10px] font-bold px-1.5 py-0.5 rounded">POST</span>
              <code className="text-xs font-mono">/api/v1/simulate</code>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">{t("endpoints.simulateDesc")}</p>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("endpoints.params")}:</div>
              <div className="grid grid-cols-1 gap-1 text-xs">
                <div className="flex gap-2"><code className="font-mono text-primary">temperature</code><span className="text-muted-foreground">int, 300–900 °C</span></div>
                <div className="flex gap-2"><code className="font-mono text-primary">residenceTime</code><span className="text-muted-foreground">int, 5–180 min</span></div>
                <div className="flex gap-2"><code className="font-mono text-primary">feedstockId</code><span className="text-muted-foreground">string (OR custom feedstock object)</span></div>
              </div>
              <pre className="bg-background border border-border rounded-lg p-3 text-[11px] font-mono overflow-x-auto whitespace-pre">{EXAMPLE_SIMULATE}</pre>
            </div>
          </div>

          {/* POST /batch */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-secondary/30 px-4 py-2.5 border-b border-border flex items-center gap-2">
              <span className="bg-green-500/10 text-green-600 text-[10px] font-bold px-1.5 py-0.5 rounded">POST</span>
              <code className="text-xs font-mono">/api/v1/batch</code>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">{t("endpoints.batchDesc")}</p>
              <pre className="bg-background border border-border rounded-lg p-3 text-[11px] font-mono overflow-x-auto whitespace-pre">{EXAMPLE_BATCH}</pre>
            </div>
          </div>

          {/* GET /feedstocks */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-secondary/30 px-4 py-2.5 border-b border-border flex items-center gap-2">
              <span className="bg-blue-500/10 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded">GET</span>
              <code className="text-xs font-mono">/api/v1/feedstocks</code>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">{t("endpoints.feedstocksDesc")}</p>
              <pre className="bg-background border border-border rounded-lg p-3 text-[11px] font-mono overflow-x-auto whitespace-pre">{EXAMPLE_FEEDSTOCKS}</pre>
            </div>
          </div>

          {/* POST /extract-lab-analysis */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-secondary/30 px-4 py-2.5 border-b border-border flex items-center gap-2">
              <span className="bg-green-500/10 text-green-600 text-[10px] font-bold px-1.5 py-0.5 rounded">POST</span>
              <code className="text-xs font-mono">/api/v1/extract-lab-analysis</code>
              <span className="ml-auto bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">AI</span>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                {t("endpoints.extractLabDesc", {
                  defaultValue:
                    "Sube un PDF de análisis de laboratorio codificado en base64 y recibí JSON estructurado con 20+ parámetros (biomasa + biochar + pirólisis + metales pesados). Max 10 MB.",
                })}
              </p>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("endpoints.params", { defaultValue: "Params" })}:</div>
              <div className="grid grid-cols-1 gap-1 text-xs">
                <div className="flex gap-2"><code className="font-mono text-primary">pdfBase64</code><span className="text-muted-foreground">string (PDF en base64, max 10 MB)</span></div>
                <div className="flex gap-2"><code className="font-mono text-primary">pdfName</code><span className="text-muted-foreground">string (opcional, para logs)</span></div>
              </div>
              <pre className="bg-background border border-border rounded-lg p-3 text-[11px] font-mono overflow-x-auto whitespace-pre">{EXAMPLE_EXTRACT_LAB}</pre>
            </div>
          </div>
        </section>

        {/* ─── Rate limits ────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <Gauge className="w-4 h-4" /> Rate limits
          </h2>
          <div className="bg-card border border-border rounded-xl p-4 text-xs space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-border rounded-lg p-3">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Developer</div>
                <div className="text-2xl font-mono font-bold text-primary">100</div>
                <div className="text-[11px] text-muted-foreground">requests / minute / API key</div>
              </div>
              <div className="border border-border rounded-lg p-3">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Engineer · Expert</div>
                <div className="text-2xl font-mono font-bold text-green-500">500</div>
                <div className="text-[11px] text-muted-foreground">requests / minute / API key</div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed pt-2">
              El servidor emite los headers estándar <code className="text-primary">RateLimit-Limit</code>,{" "}
              <code className="text-primary">RateLimit-Remaining</code> y <code className="text-primary">RateLimit-Reset</code>.
              Cuando pases el límite vas a recibir <code className="text-primary">429 RATE_LIMITED</code>. Recomendado:
              retry con exponential backoff (1s, 2s, 4s…).
            </p>
          </div>
        </section>

        {/* ─── Error codes ──────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Error handling
          </h2>
          <div className="bg-card border border-border rounded-xl p-4 text-xs space-y-3">
            <p className="text-muted-foreground leading-relaxed">
              Todos los errores siguen la misma forma:{" "}
              <code className="text-primary">{`{ error: { code, message, details? } }`}</code>. El campo{" "}
              <code className="text-primary">code</code> es estable — parsea eso, no el <code>message</code>.
            </p>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[60px_1fr_1.5fr] text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted/30 px-3 py-2 border-b border-border">
                <div>HTTP</div>
                <div>Code</div>
                <div>Meaning</div>
              </div>
              {ERROR_CODES.map((row) => (
                <div key={row.http + row.code} className="grid grid-cols-[60px_1fr_1.5fr] px-3 py-2 border-b border-border/40 last:border-b-0 text-[11px]">
                  <div className="font-mono font-bold text-primary">{row.http}</div>
                  <div className="font-mono text-foreground">{row.code}</div>
                  <div className="text-muted-foreground leading-snug">{row.meaning}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── OpenAPI spec ─────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <FileText className="w-4 h-4" /> OpenAPI 3.0 spec
          </h2>
          <div className="bg-card border border-border rounded-xl p-4 text-xs space-y-3">
            <p className="text-muted-foreground leading-relaxed">
              La API esta descrita formalmente en un spec OpenAPI 3.0 público. Usalo para generar SDK clients
              (openapi-generator, Swagger Codegen), importar en Postman/Insomnia, o alimentar un integración tipo MCP.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`${BASE_URL}/api/openapi.json`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold px-3 py-1.5 rounded-md border border-primary/20"
              >
                <FileText className="w-3.5 h-3.5" />
                openapi.json
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
              <code className="text-[11px] font-mono text-muted-foreground">GET {BASE_URL}/api/openapi.json</code>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
