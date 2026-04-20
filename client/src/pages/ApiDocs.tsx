import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";
import UpgradeModal from "@/components/UpgradeModal";
import SiteFooter from "@/components/SiteFooter";
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

export default function ApiDocs() {
  const { t } = useTranslation("api");
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [newKeyName, setNewKeyName] = useState("Default");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  if (authLoading || tierLoading) return <PageLoader />;

  if (!user) {
    setLocation("/login");
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

          {/* Created key alert */}
          {createdKey && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-foreground font-medium">{t("keys.copyWarning")}</p>
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
        </section>
      </div>
      <div className="mt-8">
        <SiteFooter />
      </div>
    </AppLayout>
  );
}
