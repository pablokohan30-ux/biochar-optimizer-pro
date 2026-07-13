/**
 * Public audit package viewer — Route: /audit/:token (no auth).
 *
 * The VVB / corporate buyer opens the link the operator shared, sees a
 * read-only rendering of the frozen snapshot, and either scrolls through
 * or hits Cmd/Ctrl+P to print. Server-side PDF rendering would drop a
 * ~200 MB Chromium dep into the Docker image; using the browser's built-in
 * print gives us the same output with zero new infrastructure and matches
 * the tooling the operator already uses in ProjectAuditPackage.tsx.
 *
 * The endpoint returns the frozen JSON snapshot only — never live tables —
 * so a revoked link cannot leak data the operator wanted to withdraw.
 */

import { useMemo, useRef } from "react";
import { useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2, Printer, ShieldCheck } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { trpc } from "@/lib/trpc";

interface Snapshot {
  packageId: string;
  generatedAtMs: number;
  project: {
    id: number;
    name: string;
    country: string | null;
    location: string | null;
    bopId: string | null;
  };
  period: { startMs: number; endMs: number };
  buyerName: string | null;
  executiveSummary: string;
  totals: { evidenceCount: number; shipmentCount: number; communityCount: number };
  evidence: Array<Record<string, unknown>>;
  shipments: Array<Record<string, unknown>>;
  community: Array<Record<string, unknown>>;
}

export default function PublicAuditPackage() {
  const { t } = useTranslation("common");
  const tp = (k: string, fb: string) => t(`publicAuditPackage.${k}`, { defaultValue: fb });
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const query = trpc.auditPackage.getPublic.useQuery(
    { token },
    { enabled: !!token, retry: false },
  );

  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: query.data?.packageId ? `${query.data.packageId}_audit-package` : "audit-package",
  });

  const snapshot = useMemo(() => {
    const s = query.data?.snapshot;
    if (!s || typeof s !== "object") return null;
    return s as Snapshot;
  }, [query.data]);

  if (query.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!query.data || !snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
          <h1 className="text-lg font-semibold text-foreground">
            {tp("notFoundTitle", "Enlace inválido o revocado")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tp("notFoundBody", "Este paquete de auditoría no está disponible. Puede haber sido revocado por su propietario, o el enlace es incorrecto.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Print-hidden action bar */}
      <div className="print:hidden sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-mono">{snapshot.packageId}</span>
            <span>·</span>
            <span>
              {tp("frozenAt", "Snapshot congelado el")}{" "}
              {new Date(snapshot.generatedAtMs).toLocaleDateString()}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handlePrint()}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90"
          >
            <Printer className="w-3.5 h-3.5" />
            {tp("printCta", "Imprimir / Guardar PDF")}
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div ref={contentRef} className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header className="space-y-2 border-b border-border pb-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {tp("audit", "Audit package")}
          </div>
          <h1 className="text-2xl font-bold">{snapshot.project.name}</h1>
          <div className="text-xs text-muted-foreground space-x-2">
            {snapshot.project.bopId && (
              <span className="font-mono">{snapshot.project.bopId}</span>
            )}
            {snapshot.project.country && <span>· {snapshot.project.country}</span>}
            {snapshot.project.location && <span>· {snapshot.project.location}</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {tp("periodLabel", "Período")}:{" "}
            {new Date(snapshot.period.startMs).toLocaleDateString()} →{" "}
            {new Date(snapshot.period.endMs).toLocaleDateString()}
          </div>
          {snapshot.buyerName && (
            <div className="text-xs text-muted-foreground">
              {tp("buyerLabel", "Preparado para")}: <strong>{snapshot.buyerName}</strong>
            </div>
          )}
        </header>

        <section>
          <h2 className="text-lg font-semibold mb-2">
            {tp("execSummary", "Resumen ejecutivo")}
          </h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
            {snapshot.executiveSummary}
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <TotalCard label={tp("evidence", "Evidencia operativa")} value={snapshot.totals.evidenceCount} />
          <TotalCard label={tp("shipments", "Envíos trazables")} value={snapshot.totals.shipmentCount} />
          <TotalCard label={tp("community", "Registros comunitarios")} value={snapshot.totals.communityCount} />
        </section>

        <SnapshotList title={tp("evidenceTitle", "Evidencia operativa")} rows={snapshot.evidence} keyFields={["dataType", "periodStart"]} />
        <SnapshotList title={tp("shipmentsTitle", "Envíos y cadena de custodia")} rows={snapshot.shipments} keyFields={["shipmentCode", "status"]} />
        <SnapshotList title={tp("communityTitle", "Impacto comunitario")} rows={snapshot.community} keyFields={["recordType", "recordDate"]} />
      </div>

      <footer className="print:hidden max-w-5xl mx-auto px-4 py-6 text-[10px] text-muted-foreground border-t border-border">
        {tp("footer", "Este paquete es un snapshot inmutable generado por el operador. Cualquier ediciones posteriores a los datos originales no se reflejan aquí.")}
      </footer>
    </div>
  );
}

function TotalCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value.toLocaleString()}</div>
    </div>
  );
}

function SnapshotList({
  title, rows, keyFields,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  keyFields: string[];
}) {
  if (!rows || rows.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-xs text-muted-foreground italic">— sin registros —</p>
      </section>
    );
  }
  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">
        {title} <span className="text-sm text-muted-foreground font-normal">({rows.length})</span>
      </h2>
      <div className="space-y-2">
        {rows.slice(0, 40).map((row, i) => (
          <div key={i} className="rounded border border-border bg-card p-3 text-xs">
            <div className="flex flex-wrap gap-2 items-center mb-1">
              {keyFields.map((k) => {
                const v = row[k];
                if (v == null) return null;
                return (
                  <span key={k} className="font-mono text-[10px] px-1.5 py-0.5 bg-secondary/60 rounded">
                    {k}: {String(v).slice(0, 60)}
                  </span>
                );
              })}
            </div>
            <details>
              <summary className="cursor-pointer text-muted-foreground text-[11px]">
                {rows.length > 0 && "Ver detalles"}
              </summary>
              <pre className="mt-2 text-[10px] whitespace-pre-wrap break-all bg-secondary/30 p-2 rounded">
                {JSON.stringify(row, null, 2)}
              </pre>
            </details>
          </div>
        ))}
        {rows.length > 40 && (
          <div className="text-[11px] text-muted-foreground italic">
            +{rows.length - 40} registros adicionales — visibles en la impresión completa
          </div>
        )}
      </div>
    </section>
  );
}
