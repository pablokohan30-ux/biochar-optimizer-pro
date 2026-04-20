import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "react-i18next";

/**
 * Full-page centered loading spinner.
 * Drop-in replacement for the plain "Loading..." text screens.
 */
export default function PageLoader({ label }: { label?: string }) {
  const { t } = useTranslation("common");
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="w-6 h-6 text-primary" />
        <p className="text-sm text-muted-foreground">{label ?? t("loading")}</p>
      </div>
    </div>
  );
}
