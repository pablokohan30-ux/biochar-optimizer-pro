import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Mail, Lock, User, ArrowRight, AlertCircle, Sparkles,
  ArrowLeft, Flame, FlaskConical, Brain, Leaf, FolderKanban,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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

  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/app");
    }
  }, [isAuthenticated, setLocation]);

  const redirectAfterAuth = fromSource === "lca" ? "/lca" : "/app";

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setLocation(redirectAfterAuth);
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setLocation(redirectAfterAuth);
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

  const features = [
    { icon: FlaskConical, title: t("auth:login.hero.feature1title"), desc: t("auth:login.hero.feature1desc") },
    { icon: Brain, title: t("auth:login.hero.feature2title"), desc: t("auth:login.hero.feature2desc") },
    { icon: Leaf, title: t("auth:login.hero.feature3title"), desc: t("auth:login.hero.feature3desc") },
    { icon: FolderKanban, title: t("auth:login.hero.feature4title"), desc: t("auth:login.hero.feature4desc") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Top bar ─── */}
      <div className="relative z-50 flex items-center justify-between px-4 sm:px-6 pt-4 pb-2">
        <Link href="/">
          <div className="inline-flex items-center gap-2 px-3 py-2 -ml-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            {t("auth:login.backButton")}
          </div>
        </Link>
        <LanguageSwitcher />
      </div>

      {/* ─── Main content ─── */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-0 lg:gap-0 rounded-2xl border border-border overflow-hidden bg-card shadow-2xl shadow-black/20">

          {/* ─── Left panel: Branding ─── */}
          <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-green-950/80 via-background to-green-950/40 border-r border-border p-10 flex-col justify-between relative overflow-hidden">
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }} />

            <div className="relative z-10">
              {/* Logo */}
              <Link href="/">
                <div className="flex items-center gap-3 cursor-pointer group mb-10">
                  <div className="w-10 h-10 rounded-lg bg-green-500/15 border border-green-500/25 flex items-center justify-center text-green-500 group-hover:bg-green-500/25 transition-colors">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="font-bold tracking-wider text-green-500 text-base group-hover:opacity-80 transition-opacity">
                      BIOCHAR OPTIMIZER PRO
                    </h1>
                  </div>
                </div>
              </Link>

              {/* Tagline */}
              <p className="text-xs uppercase tracking-[0.2em] text-green-500/60 mb-3">
                {t("auth:login.hero.tagline")}
              </p>
              <h2 className="text-3xl font-bold text-foreground mb-4 leading-tight">
                {t("auth:login.hero.headline")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-10">
                {t("auth:login.hero.description")}
              </p>

              {/* Feature list */}
              <div className="space-y-5">
                {features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <f.icon className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{f.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom decorative element */}
            <div className="relative z-10 pt-8">
              <div className="h-px bg-gradient-to-r from-green-500/20 via-green-500/5 to-transparent mb-4" />
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
                Pyrolysis Simulation & Carbon Credit Platform
              </p>
            </div>
          </div>

          {/* ─── Right panel: Form ─── */}
          <div className="flex-1 p-6 sm:p-10 flex flex-col justify-center">
            {/* Mobile logo (hidden on lg+) */}
            <div className="lg:hidden text-center mb-8">
              <Link href="/">
                <div className="inline-flex items-center gap-3 cursor-pointer group">
                  <div className="w-9 h-9 rounded-lg bg-green-500/15 border border-green-500/25 flex items-center justify-center text-green-500">
                    <Flame className="w-4 h-4" />
                  </div>
                  <span className="font-bold tracking-wider text-green-500 text-sm">
                    BIOCHAR OPTIMIZER PRO
                  </span>
                </div>
              </Link>
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                {mode === "login" ? t("auth:login.title") : t("auth:login.register")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login" ? t("auth:login.noAccount") : t("auth:login.haveAccount")}
                {" "}
                <button
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
                  className="text-green-500 hover:text-green-400 hover:underline font-medium transition-colors"
                >
                  {mode === "login" ? t("auth:login.createOne") : t("auth:login.signIn")}
                </button>
              </p>
            </div>

            {/* Contextual banner when coming from the simulator */}
            {fromSource === "simulator" && mode === "register" && (
              <div className="mb-5 bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">{t("auth:login.fromSimulator.title")}</span>{" "}
                  {t("auth:login.fromSimulator.body")}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-shadow"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-shadow"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-shadow"
                  />
                </div>
              </div>

              {mode === "register" && (
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 accent-green-500 cursor-pointer"
                  />
                  <span className="leading-relaxed">
                    {t("auth:login.acceptTermsPrefix")}
                    <Link href="/legal/terms">
                      <span className="text-green-500 hover:underline cursor-pointer">{t("auth:login.acceptTermsTerms")}</span>
                    </Link>
                    {t("auth:login.acceptTermsAnd")}
                    <Link href="/legal/privacy">
                      <span className="text-green-500 hover:underline cursor-pointer">{t("auth:login.acceptTermsPrivacy")}</span>
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
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/20 hover:shadow-green-500/30"
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

            {mode === "register" && (
              <p className="text-center text-[11px] text-muted-foreground/60 mt-4">
                {t("auth:login.corporateRequired")}
              </p>
            )}

            {/* Footer links */}
            <div className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-4 text-[11px] text-muted-foreground/50">
              <Link href="/legal/terms" className="hover:text-foreground transition-colors">{t("common:footer.terms")}</Link>
              <span>·</span>
              <Link href="/legal/privacy" className="hover:text-foreground transition-colors">{t("common:footer.privacy")}</Link>
              <span>·</span>
              <Link href="/legal/security" className="hover:text-foreground transition-colors">{t("common:footer.security")}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
