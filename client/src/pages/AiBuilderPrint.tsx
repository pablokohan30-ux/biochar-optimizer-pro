/**
 * AI Builder — printable PDF view of a generated project package.
 *
 * Route: `/ai-builder/:id/print`
 *
 * Renders all 15 generated documents in a print-friendly single-column layout
 * with page breaks between docs. Users open this, hit Cmd/Ctrl+P → Save as
 * PDF to get the full project package in one file.
 *
 * Opened from AiBuilderProject with `?autoprint=1` to trigger the print
 * dialog automatically.
 */

import { useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useReactToPrint } from "react-to-print";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Printer, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BRAND_URL, DEFAULT_EXPORT_COMPANY } from "@/lib/brand";
import { useAuth } from "@/_core/hooks/useAuth";
import PageLoader from "@/components/PageLoader";

export default function AiBuilderPrint() {
  const { t, i18n } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);

  const projectQuery = trpc.aiBuilder.get.useQuery(
    { projectId },
    { enabled: isAuthenticated && Number.isFinite(projectId) },
  );
  const docTypesQuery = trpc.aiBuilder.listDocTypes.useQuery(undefined, { enabled: isAuthenticated });
  const brandingQuery = trpc.branding.get.useQuery(undefined, { enabled: isAuthenticated });
  const branding = brandingQuery.data;
  const brandPrimary = branding?.primaryColor ?? null;
  const brandCompany = branding?.companyName ?? null;
  const brandLogo = branding?.logoDataUrl ?? null;
  const brandFooter = branding?.footerText ?? null;

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: projectQuery.data?.name ?? "biochar-project-package",
  });

  // Auto-fire print dialog when ?autoprint=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoprint") !== "1") return;
    if (!projectQuery.data) return;
    // Give React a tick to finish rendering docs
    const t = setTimeout(() => handlePrint(), 600);
    return () => clearTimeout(t);
  }, [projectQuery.data, handlePrint]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) return <PageLoader />;
  if (!isAuthenticated) {
    return null;
  }

  const project = projectQuery.data;
  const docTypes = docTypesQuery.data ?? [];

  if (!project) return <PageLoader />;

  const docs = project.docs ?? {};
  const orderedDocTypes = [...docTypes].sort((a, b) => a.order - b.order);
  const locale = i18n.resolvedLanguage?.toLowerCase().startsWith("es")
    ? "es-AR"
    : (i18n.resolvedLanguage || "en-US");
  const methodologyLabels: Record<string, string> = {
    "puro-earth": "Puro.earth",
    isometric: "Isometric",
    ebc: "EBC",
    "verra-vm0044": "Verra VM0044",
    "gold-standard": "Gold Standard",
    "rainbow-standard": "Rainbow Standard",
  };
  const audienceLabels: Record<string, string> = {
    both: tb("audienceBoth", "Inversor + certificadora (balanceado)"),
    investor: tb("audienceInvestor", "Presentación para inversor"),
    certifier: tb("audienceCertifier", "Envío para certificadora"),
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* On-screen header (hidden when printing) */}
      <div className="print:hidden bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(`/ai-builder/${projectId}`)}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> {tb("printBack", "Back to project")}
          </button>
          <button
            onClick={() => handlePrint()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            <Printer className="w-4 h-4" /> {tb("printButton", "Print / Save as PDF")}
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div
        ref={contentRef}
        className="max-w-4xl mx-auto bg-white my-8 print:my-0 print:max-w-none px-10 py-10 print:px-8 print:py-6 print:shadow-none shadow-lg text-slate-900"
      >
        {/* Cover page */}
        <div
          className="pb-8 border-b-2 page-break-after-always"
          style={{ borderColor: brandPrimary ? `${brandPrimary}40` : undefined }}
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: brandPrimary ?? undefined }}
            >
              {brandLogo ? (
                <img src={brandLogo} alt={brandCompany ?? "Logo"} className="h-8 max-w-[120px] object-contain" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {tb("printCoverBadge", "AI-Generated Project Package")}
                </>
              )}
            </div>
            {brandCompany && (
              <div className="text-sm font-semibold text-slate-900">{brandCompany}</div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{project.name}</h1>
          <div className="grid grid-cols-2 gap-4 text-sm mt-6">
            <InfoRow label={tb("biomassLabel", "Biomass")} value={(project.biomassData as any)?.name ?? "—"} />
            <InfoRow label={tb("capacityLabel", "Capacity")} value={`${project.capacityTnYear.toLocaleString(locale)} t/año de biomasa`} />
            <InfoRow label={tb("countryLabel", "Country")} value={project.country} />
            {project.location && <InfoRow label={tb("locationLabel", "Location")} value={project.location} />}
            {project.targetMethodology && <InfoRow label={tb("targetMethodologyLabel", "Target methodology")} value={methodologyLabels[project.targetMethodology] ?? project.targetMethodology} />}
            <InfoRow label={tb("audienceLabel", "Audience")} value={project.offtakerType ? audienceLabels[project.offtakerType] ?? project.offtakerType : "—"} />
            <InfoRow label={tb("generatedLabel", "Generated")} value={new Date(project.createdAt).toLocaleDateString(locale)} />
          </div>

          <div className="mt-10 text-sm text-slate-700 leading-relaxed">
            <div className="font-semibold text-slate-900 mb-2">{tb("printTocTitle", "Table of Contents")}</div>
            <ol className="list-decimal pl-6 space-y-1">
              {orderedDocTypes.map((d) => (
                <li key={d.id}>{d.title}</li>
              ))}
            </ol>
          </div>

          <div className="mt-12 text-xs italic text-amber-800 bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
            {tb("printDraftWarning", "DRAFT — AI-GENERATED, REQUIRES HUMAN REVIEW. This package is a starting draft. Every number, legal reference, supplier name, and equipment specification must be verified by qualified professionals (engineering firms, local legal counsel, accredited certification bodies, LCA consultants) before use in investment decisions or certifier submissions. Not for contractual use.")}
          </div>
        </div>

        {/* Each doc */}
        {orderedDocTypes.map((docType) => {
          const doc = docs[docType.id];
          return (
            <div key={docType.id} className="pt-8 pb-4 page-break-before">
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">{docType.category}</div>
                <h2
                  className="text-2xl font-bold text-slate-900 mb-1"
                  style={{ color: brandPrimary ?? undefined }}
                >
                  {docType.title}
                </h2>
                <p className="text-sm text-slate-500">{docType.description}</p>
              </div>
              {!doc ? (
                <div className="text-sm italic text-slate-500">{tb("printDocNotGenerated", "Document not generated yet.")}</div>
              ) : doc.error ? (
                <div className="text-sm italic text-red-600">
                  {tb("printDocFailed", "Generation failed:")} {doc.error}
                </div>
              ) : (
                <PrintDocRenderer doc={doc} />
              )}
            </div>
          );
        })}

        {/* Footer */}
          <div className="mt-16 pt-6 border-t-2 border-slate-200 text-xs text-slate-500 text-center">
          {brandFooter ? (
            <span>{brandFooter} · {new Date().toLocaleDateString(locale)}</span>
          ) : brandCompany ? (
            <span>{tb("printFooter", "Generated by")} <strong>{brandCompany}</strong> · {new Date().toLocaleDateString(locale)}</span>
          ) : (
            <span>{tb("printFooter", "Generated by")} <strong>{DEFAULT_EXPORT_COMPANY}</strong> · {BRAND_URL} · {new Date().toLocaleDateString(locale)}</span>
          )}
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 18mm 15mm;
          }
          .page-break-before { page-break-before: always; }
          .page-break-after-always { page-break-after: always; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

// ─── Doc renderer specialized for print (no collapsing, full tables) ────────
function PrintDocRenderer({ doc }: { doc: any }) {
  if (doc.format === "markdown") {
    return <PrintMarkdown content={doc.content} />;
  }
  if (doc.format === "json") {
    let parsed: any = null;
    try {
      parsed = JSON.parse(doc.content);
    } catch {
      return <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">{doc.content}</pre>;
    }
    if (doc.docId === "equipment-bom") return <PrintBomTable data={parsed} />;
    if (doc.docId === "risk-register") return <PrintRiskTable data={parsed} />;
    if (doc.docId === "permit-matrix") return <PrintPermitTable data={parsed} />;
    if (doc.docId === "electrical-package") return <PrintElectrical data={parsed} />;
    if (doc.docId === "financial-summary") return <PrintFinancial data={parsed} />;
    if (doc.docId === "methodology-compliance") return <PrintMethodology data={parsed} />;
    if (doc.docId === "stakeholder-mapping") return <PrintStakeholder data={parsed} />;
    if (doc.docId === "pdd-pre-fill") return <PrintPddFill data={parsed} />;
    return (
      <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono bg-slate-50 p-3 rounded">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  }
  return null;
}

function PrintMarkdown({ content }: { content: string }) {
  const html = useMemo(() => {
    const escaped = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let out = escaped
      .replace(/^###### (.+)$/gm, '<h6 class="font-semibold text-sm mt-4 mb-1">$1</h6>')
      .replace(/^##### (.+)$/gm, '<h5 class="font-semibold text-sm mt-4 mb-1">$1</h5>')
      .replace(/^#### (.+)$/gm, '<h4 class="font-semibold text-base mt-4 mb-2">$1</h4>')
      .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-base mt-5 mb-2 text-slate-900">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-lg mt-6 mb-2 text-slate-900">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="font-semibold text-xl mt-6 mb-3 text-slate-900">$1</h1>');
    out = out
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-slate-800 text-xs rounded font-mono">$1</code>');

    // Parse tables (| col | col |)
    const lines = out.split("\n");
    const result: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^\|.+\|$/.test(line.trim()) && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
        // Found a table
        const headers = line.trim().slice(1, -1).split("|").map((s) => s.trim());
        i += 2; // skip separator
        const rows: string[][] = [];
        while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
          rows.push(lines[i].trim().slice(1, -1).split("|").map((s) => s.trim()));
          i++;
        }
        result.push('<table class="w-full text-xs border border-slate-200 my-3">');
        result.push('<thead class="bg-slate-50"><tr>' + headers.map((h) => `<th class="text-left px-2 py-1.5 font-semibold">${h}</th>`).join("") + '</tr></thead>');
        result.push('<tbody>' + rows.map((r) => '<tr class="border-t border-slate-100">' + r.map((c) => `<td class="px-2 py-1.5 align-top">${c}</td>`).join("") + '</tr>').join("") + '</tbody>');
        result.push('</table>');
        continue;
      }
      result.push(line);
      i++;
    }
    let joined = result.join("\n");

    // Lists
    const lines2 = joined.split("\n");
    const rebuilt: string[] = [];
    let inList = false;
    for (const ln of lines2) {
      if (/^[-*] /.test(ln)) {
        if (!inList) { rebuilt.push('<ul class="list-disc pl-6 space-y-1 my-3 text-slate-700">'); inList = true; }
        rebuilt.push(`<li>${ln.replace(/^[-*] /, "")}</li>`);
      } else {
        if (inList) { rebuilt.push("</ul>"); inList = false; }
        rebuilt.push(ln);
      }
    }
    if (inList) rebuilt.push("</ul>");

    // Paragraphs
    const joined2 = rebuilt.join("\n");
    const blocks = joined2.split(/\n{2,}/).map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h[1-6]|ul|ol|pre|table|div)/.test(trimmed)) return trimmed;
      return `<p class="text-sm text-slate-700 my-2 leading-relaxed">${trimmed.replace(/\n/g, "<br/>")}</p>`;
    });

    return blocks.join("\n");
  }, [content]);

  return <div className="prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

function PrintBomTable({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  if (!data?.items) return null;
  return (
    <div>
      {data.summary && (
        <div className="mb-4 text-sm">
          <div><strong>{tb("connectedLoad", "Connected load")}:</strong> {data.summary.totalConnectedLoadKw?.toLocaleString()} kW · <strong>{tb("demandLoad", "Demand load")}:</strong> {data.summary.demandLoadKw?.toLocaleString()} kW · <strong>{tb("transformer", "Transformer")}:</strong> {data.summary.mainTransformerKva?.toLocaleString()} kVA · <strong>{tb("equipmentCapex", "Equipment CAPEX")}:</strong> USD {data.summary.estimatedEquipmentCapexUsd?.toLocaleString()}</div>
        </div>
      )}
      <table className="w-full text-xs border border-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-2 py-1.5 font-semibold">Tag</th>
            <th className="text-left px-2 py-1.5 font-semibold">{tb("category", "Category")}</th>
            <th className="text-left px-2 py-1.5 font-semibold">{tb("bomNameModel", "Name / Model")}</th>
            <th className="text-right px-2 py-1.5 font-semibold">Qty</th>
            <th className="text-right px-2 py-1.5 font-semibold">kW ea</th>
            <th className="text-right px-2 py-1.5 font-semibold">Total kW</th>
            <th className="text-right px-2 py-1.5 font-semibold">USD</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item: any, i: number) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-2 py-1.5 font-mono">{item.tag}</td>
              <td className="px-2 py-1.5 text-xs text-slate-600">{item.category}</td>
              <td className="px-2 py-1.5">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-slate-500">{item.modelOrType}</div>
              </td>
              <td className="px-2 py-1.5 text-right">{item.quantity}</td>
              <td className="px-2 py-1.5 text-right">{item.powerKwEach?.toLocaleString()}</td>
              <td className="px-2 py-1.5 text-right">{item.totalPowerKw?.toLocaleString()}</td>
              <td className="px-2 py-1.5 text-right">{item.estimatedCostUsd?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrintRiskTable({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  if (!data?.risks) return null;
  return (
    <table className="w-full text-xs border border-slate-200">
      <thead className="bg-slate-50">
        <tr>
          <th className="text-left px-2 py-1.5 font-semibold">{tb("type", "Type")}</th>
          <th className="text-left px-2 py-1.5 font-semibold">{tb("riskDescription", "Risk description")}</th>
          <th className="text-left px-2 py-1.5 font-semibold">{tb("level", "Level")}</th>
          <th className="text-left px-2 py-1.5 font-semibold">{tb("mitigation", "Mitigation")}</th>
          <th className="text-left px-2 py-1.5 font-semibold">{tb("owner", "Owner")}</th>
        </tr>
      </thead>
      <tbody>
        {data.risks.map((r: any, i: number) => (
          <tr key={i} className="border-t border-slate-100 align-top">
            <td className="px-2 py-1.5 font-medium whitespace-nowrap">{r.type}</td>
            <td className="px-2 py-1.5">{r.description}</td>
            <td className="px-2 py-1.5 whitespace-nowrap">{r.riskLevel}</td>
            <td className="px-2 py-1.5">{r.mitigation}</td>
            <td className="px-2 py-1.5 whitespace-nowrap">{r.owner}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrintPermitTable({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  if (!data?.permits) return null;
  return (
    <div>
      <div className="mb-3 text-sm"><strong>{tb("countryLabel", "Country")}:</strong> {data.country}</div>
      <table className="w-full text-xs border border-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-2 py-1.5 font-semibold">{tb("permit", "Permit")}</th>
            <th className="text-left px-2 py-1.5 font-semibold">{tb("authority", "Authority")}</th>
            <th className="text-left px-2 py-1.5 font-semibold">{tb("legalReference", "Legal ref.")}</th>
            <th className="text-right px-2 py-1.5 font-semibold">Days</th>
            <th className="text-right px-2 py-1.5 font-semibold">{tb("feeUsd", "Fee USD")}</th>
            <th className="text-left px-2 py-1.5 font-semibold">{tb("critical", "Critical")}</th>
          </tr>
        </thead>
        <tbody>
          {data.permits.map((p: any, i: number) => (
            <tr key={i} className="border-t border-slate-100 align-top">
              <td className="px-2 py-1.5">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">{p.category}</div>
              </td>
              <td className="px-2 py-1.5">{p.issuingAuthority}</td>
              <td className="px-2 py-1.5 font-mono text-xs">{p.legalReference}</td>
              <td className="px-2 py-1.5 text-right">{p.typicalTimelineDays}</td>
              <td className="px-2 py-1.5 text-right">{p.feesEstimateUsd?.toLocaleString()}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{p.criticalPathImpact}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.disclaimer && <p className="text-xs italic text-amber-800 mt-3">{data.disclaimer}</p>}
    </div>
  );
}

function PrintElectrical({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  if (!data) return null;
  const s = data.systemSummary ?? {};
  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="font-semibold mb-1">{tb("systemSummary", "System Summary")}</div>
        <div className="text-xs">
          {tb("mainSupply", "Main supply")}: {s.mainSupplyVoltage} / {s.frequency} / {s.phases} ·
          {" "}{tb("connectedLoad", "Connected load")}: {s.totalConnectedLoadKw?.toLocaleString()} kW ·
          {" "}{tb("demandLoad", "Demand load")}: {s.demandLoadKw?.toLocaleString()} kW (diversity {s.diversityFactor}) ·
          {" "}{tb("transformer", "Transformer")}: {s.mainTransformerKva?.toLocaleString()} kVA ·
          {" "}{tb("switchboard", "Switchboard")}: {s.mainSwitchboardRatingA?.toLocaleString()} A ·
          {" "}{tb("backupGenerator", "Backup gen")}: {s.emergencyGeneratorKw?.toLocaleString()} kW ·
          PF: {s.powerFactor} ·
          {" "}{tb("annualEnergy", "Annual energy")}: {s.estimatedAnnualEnergyMwh?.toLocaleString()} MWh
        </div>
      </div>

      {Array.isArray(data.loadCenters) && (
        <div>
          <div className="font-semibold mb-1">{tb("loadCenters", "Load Centers")}</div>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-50">
              <tr><th className="text-left px-2 py-1 font-semibold">{tb("area", "Area")}</th><th className="text-right px-2 py-1 font-semibold">kW</th></tr>
            </thead>
            <tbody>
              {data.loadCenters.map((lc: any, i: number) => (
                <tr key={i} className="border-t border-slate-100"><td className="px-2 py-1">{lc.name}</td><td className="px-2 py-1 text-right">{lc.kw?.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {Array.isArray(data.mccs) && data.mccs.map((mcc: any, i: number) => (
        <div key={i}>
          <div className="font-semibold mb-1">MCC — {mcc.id} ({mcc.location})</div>
          <div className="text-xs mb-1">{tb("capacityLabel", "Capacity")}: {mcc.capacityA} A · {mcc.voltage}</div>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-50">
              <tr><th className="text-left px-2 py-1 font-semibold">{tb("equipment", "Equipment")}</th><th className="text-right px-2 py-1 font-semibold">{tb("currentAmps", "Current (A)")}</th><th className="text-left px-2 py-1 font-semibold">{tb("notes", "Notes")}</th></tr>
            </thead>
            <tbody>
              {(mcc.feeders ?? []).map((f: any, j: number) => (
                <tr key={j} className="border-t border-slate-100"><td className="px-2 py-1">{f.equipment}</td><td className="px-2 py-1 text-right">{f.currentA}</td><td className="px-2 py-1">{f.notes}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {data.singleLineDiagramDescription && (
        <div>
          <div className="font-semibold mb-1">{tb("singleLineDescription", "Single-Line Diagram Description")}</div>
          <p className="text-xs leading-relaxed">{data.singleLineDiagramDescription}</p>
        </div>
      )}

      {data.status && <p className="text-xs italic text-amber-800 border-l-2 border-amber-300 pl-2">{data.status}</p>}
    </div>
  );
}

function PrintFinancial({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  if (!data) return null;
  const capex = data.capex ?? {};
  const opex = data.opex ?? {};
  const revenue = data.revenueStack ?? {};
  const econ = data.economics ?? {};
  const add = data.additionality ?? {};
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-4 gap-2">
        <KPIBox label="CAPEX" value={`USD ${capex.totalUsd?.toLocaleString()}`} />
        <KPIBox label={tb("annualOpex", "Annual OPEX")} value={`USD ${opex.annualTotalUsd?.toLocaleString()}`} />
        <KPIBox label={tb("revenueYear3", "Revenue Yr 3")} value={`USD ${revenue.annualTotalUsdYear3?.toLocaleString()}`} />
        <KPIBox label="IRR" value={`${econ.irrPercentage?.toFixed(1)}%`} />
      </div>

      {Array.isArray(capex.breakdown) && (
        <div>
          <div className="font-semibold mb-1">CAPEX</div>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-50"><tr><th className="text-left px-2 py-1 font-semibold">{tb("category", "Category")}</th><th className="text-right px-2 py-1 font-semibold">USD</th><th className="text-right px-2 py-1 font-semibold">%</th><th className="text-left px-2 py-1 font-semibold">{tb("notes", "Notes")}</th></tr></thead>
            <tbody>{capex.breakdown.map((b: any, i: number) => (<tr key={i} className="border-t border-slate-100"><td className="px-2 py-1">{b.category}</td><td className="px-2 py-1 text-right">{b.usd?.toLocaleString()}</td><td className="px-2 py-1 text-right">{b.percentage?.toFixed(1)}%</td><td className="px-2 py-1 text-slate-500">{b.notes}</td></tr>))}</tbody>
          </table>
        </div>
      )}

      {Array.isArray(opex.breakdown) && (
        <div>
          <div className="font-semibold mb-1">{tb("opexBreakdown", "OPEX (Annual)")}</div>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-50"><tr><th className="text-left px-2 py-1 font-semibold">{tb("category", "Category")}</th><th className="text-right px-2 py-1 font-semibold">{tb("usdPerYear", "USD/yr")}</th><th className="text-right px-2 py-1 font-semibold">%</th><th className="text-left px-2 py-1 font-semibold">{tb("notes", "Notes")}</th></tr></thead>
            <tbody>{opex.breakdown.map((b: any, i: number) => (<tr key={i} className="border-t border-slate-100"><td className="px-2 py-1">{b.category}</td><td className="px-2 py-1 text-right">{b.annualUsd?.toLocaleString()}</td><td className="px-2 py-1 text-right">{b.percentage?.toFixed(1)}%</td><td className="px-2 py-1 text-slate-500">{b.notes}</td></tr>))}</tbody>
          </table>
        </div>
      )}

      <div>
        <div className="font-semibold mb-1">{tb("revenueStackYear3", "Revenue Stack (Year 3)")}</div>
        <div className="text-xs">
          {tb("carbonCredits", "Carbon credits")}: {revenue.carbonCreditsAnnualTco2e?.toLocaleString()} tCO2e × USD {revenue.carbonCreditPriceUsdPerTon}/t = <strong>USD {revenue.carbonCreditAnnualRevenueUsd?.toLocaleString()}/yr</strong><br/>
          {tb("biocharSales", "Biochar")}: {revenue.biocharAnnualTonnes?.toLocaleString()} t × USD {revenue.biocharPriceUsdPerTonne}/t = <strong>USD {revenue.biocharAnnualRevenueUsd?.toLocaleString()}/yr</strong><br/>
          {tb("otherRevenue", "Other")}: {revenue.otherRevenueStreams}
        </div>
      </div>

      <div>
        <div className="font-semibold mb-1">Economics</div>
        <div className="text-xs">
          Ramp-up: {econ.rampUp}<br/>
          Payback: {econ.paybackYears} years · IRR: {econ.irrPercentage?.toFixed(1)}% · NPV: USD {econ.npvUsd?.toLocaleString()}<br/>
          {econ.notes}
        </div>
      </div>

      <div className="border-l-4 border-indigo-500 bg-indigo-50 p-3 text-xs">
        <div className="font-semibold text-indigo-900 mb-1">{tb("financialAdditionality", "Financial Additionality")}</div>
        <div className="text-indigo-800">{add.narrative}</div>
        <div className="text-indigo-700 mt-1">Carbon revenue = {add.carbonRevenueShareOfTotalPercentage?.toFixed(1)}% of total · Unsubsidized cost: USD {add.unsubsidizedCostUsd?.toLocaleString()}</div>
      </div>

      {data.disclaimer && <p className="text-xs italic text-amber-800 border-l-2 border-amber-300 pl-2">{data.disclaimer}</p>}
    </div>
  );
}

function PrintMethodology({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  if (!data?.methodologies) return null;
  return (
    <div className="space-y-4 text-sm">
      {data.bestFitMethodology && (
        <div className="border-l-4 border-indigo-500 bg-indigo-50 p-3 text-xs">
          <div className="font-semibold text-indigo-900">{tb("recommendedMethodology", "Recommended methodology")}: {data.bestFitMethodology}</div>
          {data.rationale && <div className="text-indigo-800 mt-1">{data.rationale}</div>}
        </div>
      )}
      {data.methodologies.map((m: any, i: number) => (
        <div key={i}>
          <div className="font-semibold mb-1">{m.name} <span className="text-xs font-normal text-slate-500">· {m.status} · Fit: {m.overallFit}</span></div>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-50"><tr><th className="text-left px-2 py-1 font-semibold">{tb("criterion", "Criterion")}</th><th className="text-left px-2 py-1 font-semibold">{tb("requirement", "Requirement")}</th><th className="text-left px-2 py-1 font-semibold">{tb("status", "Status")}</th><th className="text-left px-2 py-1 font-semibold">{tb("notes", "Notes")}</th></tr></thead>
            <tbody>{(m.criteria ?? []).map((c: any, j: number) => (<tr key={j} className="border-t border-slate-100 align-top"><td className="px-2 py-1 font-medium">{c.criterion}</td><td className="px-2 py-1">{c.requirement}</td><td className="px-2 py-1 whitespace-nowrap">{c.projectStatus}</td><td className="px-2 py-1 text-slate-500">{c.notes}</td></tr>))}</tbody>
          </table>
          {m.recommendation && <p className="text-xs italic text-slate-600 mt-1">{tb("nextSteps", "Next steps")}: {m.recommendation}</p>}
        </div>
      ))}
    </div>
  );
}

function PrintStakeholder({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  const strategyLabel = (value: string) => {
    if (value === "Manage closely") return tb("stakeholderManageClosely", "Manage closely");
    if (value === "Keep satisfied") return tb("stakeholderKeepSatisfied", "Keep satisfied");
    if (value === "Keep informed") return tb("stakeholderKeepInformed", "Keep informed");
    if (value === "Monitor") return tb("monitor", "Monitor");
    return value;
  };
  if (!data?.stakeholders) return null;
  return (
    <div className="space-y-4 text-sm">
      {data.methodology && <p className="text-xs italic text-slate-600">{data.methodology}</p>}
      {data.influenceInterestMatrix && (
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="border border-slate-200 rounded p-2">
            <div className="font-semibold">{tb("stakeholderManageClosely", "Manage closely")}</div>
            <div className="text-slate-500">H infl. × H int.</div>
            <div className="text-lg font-bold">{data.influenceInterestMatrix.highInfluenceHighInterest}</div>
          </div>
          <div className="border border-slate-200 rounded p-2">
            <div className="font-semibold">{tb("stakeholderKeepSatisfied", "Keep satisfied")}</div>
            <div className="text-slate-500">H infl. × L int.</div>
            <div className="text-lg font-bold">{data.influenceInterestMatrix.highInfluenceLowInterest}</div>
          </div>
          <div className="border border-slate-200 rounded p-2">
            <div className="font-semibold">{tb("stakeholderKeepInformed", "Keep informed")}</div>
            <div className="text-slate-500">L infl. × H int.</div>
            <div className="text-lg font-bold">{data.influenceInterestMatrix.lowInfluenceHighInterest}</div>
          </div>
          <div className="border border-slate-200 rounded p-2">
            <div className="font-semibold">{tb("monitor", "Monitor")}</div>
            <div className="text-slate-500">L infl. × L int.</div>
            <div className="text-lg font-bold">{data.influenceInterestMatrix.lowInfluenceLowInterest}</div>
          </div>
        </div>
      )}
      <table className="w-full text-xs border border-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-2 py-1 font-semibold">{tb("stakeholderLabel", "Stakeholder")}</th>
            <th className="text-left px-2 py-1 font-semibold">{tb("category", "Category")}</th>
            <th className="text-left px-2 py-1 font-semibold">{tb("influenceShort", "Infl.")}</th>
            <th className="text-left px-2 py-1 font-semibold">{tb("interestShortLong", "Int.")}</th>
            <th className="text-left px-2 py-1 font-semibold">{tb("strategy", "Strategy")}</th>
            <th className="text-left px-2 py-1 font-semibold">{tb("cadence", "Cadence")}</th>
            <th className="text-left px-2 py-1 font-semibold">{tb("roleRisks", "Role / Risks")}</th>
          </tr>
        </thead>
        <tbody>
          {data.stakeholders.map((s: any, i: number) => (
            <tr key={i} className="border-t border-slate-100 align-top">
              <td className="px-2 py-1 font-medium">{s.name}</td>
              <td className="px-2 py-1 text-slate-500">{s.category}</td>
              <td className="px-2 py-1">{s.influence}</td>
              <td className="px-2 py-1">{s.interest}</td>
              <td className="px-2 py-1">{strategyLabel(s.engagementStrategy)}</td>
              <td className="px-2 py-1">{s.cadence}</td>
              <td className="px-2 py-1">
                <div>{s.role}</div>
                {s.risks && <div className="text-xs italic text-slate-500 mt-0.5">{tb("riskLabel", "Risk")}: {s.risks}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.notes && <p className="text-xs italic text-slate-600">{data.notes}</p>}
    </div>
  );
}

function PrintPddFill({ data }: { data: any }) {
  const { t } = useTranslation("common");
  const tb = (k: string, fallback: string) => t(`aiBuilder.${k}`, { defaultValue: fallback });
  if (!data?.workstreams) return null;
  return (
    <div className="space-y-4 text-sm">
      {data.workstreams.map((ws: any, i: number) => (
        <div key={i}>
          <div className="font-semibold mb-2 text-slate-900">{ws.id.toUpperCase()}. {ws.title}</div>
          <div className="space-y-2">
            {(ws.answers ?? []).map((a: any, j: number) => (
              <div key={j} className="border-l-2 border-slate-300 pl-3">
                <div className="text-xs font-semibold text-slate-900 mb-0.5">{a.questionLabel} <span className="text-slate-500 font-normal">({a.confidence}{a.requiresUserInput ? `, ${tb("needsUserInput", "Needs user input").toLowerCase()}` : ""})</span></div>
                <div className="text-xs text-slate-700 whitespace-pre-wrap">{a.draftAnswer}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KPIBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded p-2">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
