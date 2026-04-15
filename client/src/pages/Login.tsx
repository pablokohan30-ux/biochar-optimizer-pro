import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import LogoLink from "@/components/LogoLink";
import SiteFooter from "@/components/SiteFooter";

const FREE_EMAIL_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.ar", "hotmail.com",
  "outlook.com", "live.com", "aol.com", "icloud.com", "me.com", "mail.com",
  "protonmail.com", "proton.me", "zoho.com", "yandex.com", "gmx.com",
];

function isCorporateEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && !FREE_EMAIL_DOMAINS.includes(domain);
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

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
      setError("Please use a corporate email address. Free email providers (Gmail, Yahoo, Hotmail, etc.) are not accepted.");
      return;
    }

    if (mode === "register" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (mode === "register" && !acceptedTerms) {
      setError("You must accept the Terms of Service and Privacy Policy to create an account.");
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
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
          {mode === "register" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Corporate Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Min. 8 characters" : "Your password"}
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
                I accept the{" "}
                <Link href="/legal/terms">
                  <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>
                </Link>
                {" "}and{" "}
                <Link href="/legal/privacy">
                  <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
                </Link>
                . My data is mine — Biochar Optimizer Pro will never sell it or use it to train AI models.
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
                {mode === "login" ? "Sign in" : "Create account"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "login" ? (
            <>
              No account yet?{" "}
              <button onClick={() => { setMode("register"); setError(null); }} className="text-green-500 hover:underline">
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(null); }} className="text-green-500 hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>

        {mode === "register" && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            Corporate email required. Free providers (Gmail, Yahoo, etc.) are not accepted.
          </p>
        )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
