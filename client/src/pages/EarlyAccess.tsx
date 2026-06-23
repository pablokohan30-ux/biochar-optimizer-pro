import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, ClipboardCheck, LockKeyhole, Mail, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LogoLink from "@/components/LogoLink";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";
import { isCorporateEmail } from "@shared/corporateEmail";

const STAGE_KEYS = [
  "stageIdea",
  "stageFeasibility",
  "stageEngineering",
  "stageOperations",
  "stageInvestment",
] as const;

type StageKey = (typeof STAGE_KEYS)[number];

export default function EarlyAccess() {
  const { t, i18n } = useTranslation(["earlyAccess", "common"]);
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");
  const stageOptions = useMemo(() => STAGE_KEYS.map((key) => ({
    key,
    label: t(`common:earlyAccess.${key}`),
  })), [i18n.resolvedLanguage, t]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    country: "",
    biomass: "",
    stage: STAGE_KEYS[0] as StageKey,
    message: "",
  });

  const submitInquiry = trpc.launch.submitInquiry.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setEmailError("");
      setForm({
        name: "",
        email: "",
        company: "",
        country: "",
        biomass: "",
        stage: STAGE_KEYS[0] as StageKey,
        message: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || t("common:earlyAccess.formError", { defaultValue: "No pudimos guardar tu solicitud. Intenta de nuevo." }));
    },
  });

  const setField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleEmailChange = (value: string) => {
    const clean = value.replace(/\s+/g, "");
    setField("email", clean);
    setEmailError(clean.includes("@") && !isCorporateEmail(clean)
      ? t("common:earlyAccess.corporateOnly")
      : "");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!isCorporateEmail(trimmedEmail)) {
      setEmailError(t("common:earlyAccess.corporateOnly"));
      return;
    }

    const message = [
      "[Early access demo]",
      `${i18n.language.startsWith("es") ? "Pais" : "Country"}: ${form.country.trim() || (i18n.language.startsWith("es") ? "No informado" : "Not provided")}`,
      `${i18n.language.startsWith("es") ? "Biomasa" : "Biomass"}: ${form.biomass.trim() || (i18n.language.startsWith("es") ? "No informada" : "Not provided")}`,
      `${i18n.language.startsWith("es") ? "Etapa" : "Stage"}: ${t(`common:earlyAccess.${form.stage}`)}`,
      "",
      form.message.trim() || t("common:earlyAccess.placeholderProbe"),
    ].join("\n");

    await submitInquiry.mutateAsync({
      name: form.name.trim(),
      email: trimmedEmail,
      company: form.company.trim(),
      message,
      source: "early_access",
    });
  };

  return (
    <div className="min-h-screen bg-[#f6f3ea] text-[#152117] flex flex-col">
      <nav className="border-b border-[#d9d0bd] bg-[#f6f3ea]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          <div className="flex items-center gap-3">
            <LanguageSwitcher className="rounded-full border border-emerald-900/10 bg-white/70 px-2 py-1 shadow-sm" />
            <Link href="/demo">
              <Button variant="outline" size="sm" className="border-emerald-700/20 bg-white/70 text-emerald-900 hover:bg-white hover:text-emerald-950">
                {t("common:earlyAccess.navDemo")}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-28 -right-20 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="absolute top-48 -left-28 w-96 h-96 rounded-full bg-amber-500/20 blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/20 bg-white/70 px-3 py-1 text-xs font-semibold text-emerald-800 mb-5">
                <Sparkles className="w-3.5 h-3.5" />
                {t("common:earlyAccess.badge")}
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] max-w-3xl">
                {t("common:earlyAccess.title")}
              </h1>
              <p className="mt-5 text-base md:text-lg text-[#536052] max-w-2xl leading-relaxed">
                {t("common:earlyAccess.subtitle")}
              </p>
              <p className="mt-3 text-sm md:text-base text-[#536052] max-w-2xl leading-relaxed">
                {i18n.language.startsWith("es")
                  ? "La IA ordena datos, reduce fricción y te ahorra semanas entre el primer input y una versión que ya se puede revisar con más claridad."
                  : "AI helps organize data, reduce friction, and save weeks between the first input and a version that is actually ready to review."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 max-w-2xl">
                <Proof icon={<ClipboardCheck className="w-4 h-4" />} title={t("common:earlyAccess.proofSimulateTitle")} body={t("common:earlyAccess.proofSimulateBody")} />
                <Proof icon={<LockKeyhole className="w-4 h-4" />} title={t("common:earlyAccess.proofCertifyTitle")} body={t("common:earlyAccess.proofCertifyBody")} />
                <Proof icon={<Mail className="w-4 h-4" />} title={t("common:earlyAccess.proofSellTitle")} body={t("common:earlyAccess.proofSellBody")} />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <a href="#request-access">
                  <Button size="lg" className="bg-[#173b23] hover:bg-[#102a19] text-white gap-2 shadow-lg shadow-emerald-950/15 px-6">
                    {t("common:earlyAccess.ctaRequest")} <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="border-[#173b23]/25 bg-white/80 px-6">
                    {t("common:earlyAccess.ctaDemo")}
                  </Button>
                </Link>
              </div>
            </div>

            <div id="request-access" className="scroll-mt-24 lg:pl-4">
              <div className="rounded-3xl border border-[#d7cbb8] bg-white/90 shadow-2xl shadow-emerald-950/10 p-6 md:p-8 lg:p-9">
                {submitted ? (
                  <div className="py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-bold">{t("common:earlyAccess.successTitle")}</h2>
                    <p className="text-sm text-[#536052] mt-2 max-w-sm mx-auto">
                      {t("common:earlyAccess.successBody")}
                    </p>
                    <Link href="/demo">
                      <Button className="mt-6" variant="outline">{t("common:earlyAccess.successCta")}</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="mb-5">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">{t("common:earlyAccess.formBadge")}</div>
                      <h2 className="text-2xl font-bold mt-1">{t("common:earlyAccess.formTitle")}</h2>
                      <p className="text-sm text-[#536052] mt-2">
                        {t("common:earlyAccess.formSubtitle")}
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label={t("common:earlyAccess.fieldName")} required value={form.name} onChange={(v) => setField("name", v)} placeholder={t("common:earlyAccess.placeholderName")} />
                        <Field label={t("common:earlyAccess.fieldCompany")} required value={form.company} onChange={(v) => setField("company", v)} placeholder={t("common:earlyAccess.placeholderCompany")} />
                      </div>
                      <div>
                        <Field label={t("common:earlyAccess.fieldEmail")} required type="email" value={form.email} onChange={handleEmailChange} placeholder={t("common:earlyAccess.placeholderEmail")} error={emailError} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label={t("common:earlyAccess.fieldCountry")} value={form.country} onChange={(v) => setField("country", v)} placeholder={t("common:earlyAccess.placeholderCountry")} />
                        <Field label={t("common:earlyAccess.fieldBiomass")} value={form.biomass} onChange={(v) => setField("biomass", v)} placeholder={t("common:earlyAccess.placeholderBiomass")} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#536052] mb-1">{t("common:earlyAccess.fieldStage")}</label>
                        <select
                          value={form.stage}
                          onChange={(event) => setField("stage", event.target.value)}
                          className="w-full rounded-xl border border-[#d7cbb8] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-700/20"
                        >
                          {stageOptions.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#536052] mb-1">{t("common:earlyAccess.fieldProbe")}</label>
                        <textarea
                          required
                          rows={4}
                          value={form.message}
                          onChange={(event) => setField("message", event.target.value)}
                          placeholder={t("common:earlyAccess.placeholderProbe")}
                          className="w-full rounded-xl border border-[#d7cbb8] bg-white px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-emerald-700/20"
                        />
                      </div>
                      <Button type="submit" disabled={submitInquiry.isPending || !!emailError} className="w-full bg-[#173b23] hover:bg-[#102a19] text-white gap-2 py-6 text-base shadow-lg shadow-emerald-950/15">
                        {submitInquiry.isPending ? t("common:earlyAccess.sending") : <><Send className="w-4 h-4" /> {t("common:earlyAccess.send")}</>}
                      </Button>
                      <p className="text-[11px] text-[#6d7468] text-center">
                        {t("common:earlyAccess.note")}
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Proof({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[#d7cbb8] bg-white/65 p-4">
      <div className="w-9 h-9 rounded-xl bg-emerald-700/10 text-emerald-800 flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="font-bold text-sm">{title}</div>
      <div className="text-xs text-[#536052] mt-1 leading-relaxed">{body}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[#536052] mb-1">
        {label}{required ? " *" : ""}
      </span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-700/20 ${
          error ? "border-red-400" : "border-[#d7cbb8]"
        }`}
      />
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}
