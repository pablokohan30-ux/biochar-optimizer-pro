import { Link } from "wouter";
import { Activity, Flame } from "lucide-react";
import { BRAND_WORDMARK } from "@/lib/brand";

type LogoLinkProps = {
  variant?: "default" | "compact";
  iconType?: "activity" | "flame";
  showSubtitle?: boolean;
  subtitle?: string;
};

export default function LogoLink({
  variant = "default",
  iconType = "activity",
  showSubtitle = true,
  subtitle = "Pyrolysis Simulation & Project Development Platform",
}: LogoLinkProps) {
  const Icon = iconType === "flame" ? Flame : Activity;
  const isCompact = variant === "compact";

  return (
    <Link href="/">
      <div className="flex items-center gap-3 cursor-pointer group">
        <div
          className={`${
            isCompact ? "w-8 h-8" : "w-10 h-10"
          } rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors`}
        >
          <Icon className={isCompact ? "w-4 h-4" : "w-6 h-6"} />
        </div>
        <div>
          <div
            className={`font-bold tracking-wider text-primary ${
              isCompact ? "text-sm" : "text-lg"
            } group-hover:opacity-80 transition-opacity`}
          >
            {BRAND_WORDMARK}
          </div>
          {showSubtitle && !isCompact && (
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
