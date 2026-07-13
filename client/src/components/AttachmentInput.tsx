import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Paperclip, Trash2, Download, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Props {
  /** Which record this attachment backs. */
  relatedType: string;
  relatedId: number;
  /** Optional label shown above the drop zone. */
  label?: string;
  /** Optional CSS class for the outer container. */
  className?: string;
  /** MIME-type allowlist forwarded to the <input accept=""> attribute. */
  accept?: string;
}

const DEFAULT_ACCEPT =
  "application/pdf,image/png,image/jpeg,image/webp,text/csv,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.ms-excel";

/**
 * File attachment UI — attaches PDFs, images, spreadsheets to any record
 * that has a numeric ID (evidence entry, shipment, community record, etc.).
 *
 * Reads the existing files via `trpc.attachments.list`, uploads new ones
 * base64-encoded via `trpc.attachments.create`, and offers download
 * (browser navigation to /api/attachments/:id/download) + delete.
 *
 * Rendered inline inside the record editor so uploads happen after the
 * record has been saved (which is when we have a relatedId).
 */
export default function AttachmentInput({
  relatedType,
  relatedId,
  label,
  className = "",
  accept = DEFAULT_ACCEPT,
}: Props) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const query = trpc.attachments.list.useQuery(
    { relatedType, relatedId },
    { enabled: relatedId > 0 },
  );
  const createMutation = trpc.attachments.create.useMutation({
    onSuccess: () => utils.attachments.list.invalidate({ relatedType, relatedId }),
  });
  const deleteMutation = trpc.attachments.delete.useMutation({
    onSuccess: () => utils.attachments.list.invalidate({ relatedType, relatedId }),
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const base64 = await readAsBase64(file);
          await createMutation.mutateAsync({
            relatedType,
            relatedId,
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            base64,
          });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [createMutation, relatedType, relatedId],
  );

  const attachments = query.data ?? [];

  if (relatedId <= 0) {
    return (
      <div className={`text-[11px] text-muted-foreground italic ${className}`}>
        {t("attachments.saveFirst", {
          defaultValue: "Guardá el registro primero para adjuntar archivos.",
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-1">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 text-xs bg-secondary/40 border border-border rounded px-2 py-1.5"
            >
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{a.filename}</div>
                <div className="text-[10px] text-muted-foreground">
                  {formatSize(a.sizeBytes)} · {shortContentType(a.contentType)}
                </div>
              </div>
              <a
                href={a.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary shrink-0"
                title={t("attachments.download", { defaultValue: "Descargar" })}
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => {
                  if (deleteMutation.isPending) return;
                  deleteMutation.mutate({ id: a.id });
                }}
                className="text-muted-foreground hover:text-red-500 shrink-0"
                title={t("attachments.delete", { defaultValue: "Eliminar" })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Paperclip className="w-3.5 h-3.5" />
          )}
          {uploading
            ? t("attachments.uploading", { defaultValue: "Subiendo..." })
            : t("attachments.addFile", { defaultValue: "Adjuntar archivo" })}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {error && (
          <div className="mt-1 text-[11px] text-red-500">{error}</div>
        )}
        <div className="mt-1 text-[10px] text-muted-foreground">
          {t("attachments.limitHint", {
            defaultValue: "Máx 20 MB · PDF, imagen, docx, xlsx, csv",
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected reader result"));
        return;
      }
      // dataURL is "data:<mime>;base64,<payload>" — strip the prefix.
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function shortContentType(ct: string): string {
  if (ct === "application/pdf") return "PDF";
  if (ct.startsWith("image/")) return ct.slice(6).toUpperCase();
  if (ct === "text/csv") return "CSV";
  if (ct === "text/plain") return "TXT";
  if (ct.includes("wordprocessingml")) return "DOCX";
  if (ct.includes("spreadsheetml")) return "XLSX";
  if (ct === "application/msword") return "DOC";
  if (ct === "application/vnd.ms-excel") return "XLS";
  return ct.split("/")[1]?.toUpperCase() ?? "FILE";
}
