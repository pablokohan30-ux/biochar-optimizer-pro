import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Mail, Lock, User, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import LogoLink from "@/components/LogoLink";
import SiteFooter from "@/components/SiteFooter";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const FREE_EMAIL_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.ar", "hotmail.com",
  "outlook.com", "live.com", "aol.com", "icloud.com", "me.com", "mail.com",
  "protonmail.com", "proton.me", "zoho.com", "yandex.com", "gmx.com",
];

function isCorporateEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && !FREE_EMAIL_DOMAINS.includes(domain);
}

// Read query params on first render — wouter doesn't ship a useSearchParams hook,
// so we parse window.location.search directly. This runs only on mount.
function getInitialMode(): "login" | "register" {
  if (typeof window === "undefined") return "login";
  const params = new URLSearchParams(window.location.search);
  return params.get("signup") === "1" ? "register" : "login";
}

function getFromSource(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("from");
}

export default function Login() {
  const { t } = useTranslation(["auth", "common"]);
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">(getInitialMode);
  const [fromSource] = useState<string | null>(getFromSource);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // If the user is already authenticated (e.g. refreshed /login with a live
  // session cookie) send them straight to the simulator so they don't get
  // stuck on the auth page.
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/app");
    }
  }, [isAuthenticated, setLocation]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setLocation("/app");
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setLocation("/app");
    },
    onError: (err) => setError(err.message),
  });

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register" && !isCorporateEmail(email)) {
      setError(t("auth:login.errors.corporateOnly"));
      return;
    }

    if (mode === "register" && password.length < 8) {
      setError(t("auth:login.errors.passwordTooShort"));
      return;
    }

    if (mode === "register" && !acceptedTerms) {
      setError(t("auth:login.errors.mustAcceptTerms"));
      return;
    }

    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, name });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar with just a language switcher — auth page has no nav otherwise */}
      <div className="flex justify-end px-4 pt-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? t("auth:login.title") : t("auth:login.register")}
          </p>
        </div>

        {/* Contextual banner when coming from the simulator (gated free access) */}
        {fromSource === "simulator" && mode === "register" && (
          <div className="mb-4 bg-green-500/5 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{t("auth:login.fromSimulator.title")}</span>{" "}
              {t("auth:login.fromSimulator.body")}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
          {mode === "register" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                {t("auth:login.fullName")}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t("auth:login.fullNamePlaceholder")}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              {t("auth:login.email")}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t("auth:login.emailPlaceholder")}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              {t("auth:login.password")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === "register" ? t("auth:login.passwordPlaceholderMin") : t("auth:login.passwordPlaceholder")}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              />
            </div>
          </div>

          {mode === "register" && (
            <label className="flex items-start gap-2 cursor-pointer text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-primary cursor-pointer"
              />
              <span>
                {t("auth:login.acceptTermsPrefix")}
                <Link href="/legal/terms">
                  <span className="text-primary hover:underline cursor-pointer">{t("auth:login.acceptTermsTerms")}</span>
                </Link>
                {t("auth:login.acceptTermsAnd")}
                <Link href="/legal/privacy">
                  <span className="text-primary hover:underline cursor-pointer">{t("auth:login.acceptTermsPrivacy")}</span>
                </Link>
                {t("auth:login.acceptTermsSuffix")}
              </span>
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === "login" ? t("auth:login.signInButton") : t("auth:login.createAccountButton")}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "login" ? (
            <>
              {t("auth:login.noAccount")}{" "}
              <button onClick={() => { setMode("register"); setError(null); }} className="text-green-500 hover:underline">
                {t("auth:login.createOne")}
              </button>
            </>
          ) : (
            <>
              {t("auth:login.haveAccount")}{" "}
              <button onClick={() => { setMode("login"); setError(null); }} className="text-green-500 hover:underline">
                {t("auth:login.signIn")}
              </button>
            </>
          )}
        </p>

        {mode === "register" && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            {t("auth:login.corporateRequired")}
          </p>
        )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
