# Biochar Optimizer Pro — Roadmap

Operational task list. Keep this file up to date — any agent (human or
automated) that works on the repo should read this + `CLAUDE.md` first.

**Legend:**

| Column | Meaning |
|--------|---------|
| P | Priority: **P0** (blocker) · **P1** (high) · **P2** (medium) · **P3** (nice-to-have) |
| Effort | Rough estimate in person-hours or days |
| Autonomy | 🟢 automatable (a scheduled agent can pick this up) · 🟡 needs review · 🔴 needs Pablo input |
| Status | `pending` · `in_progress` · `done` · `blocked` |

---

## 🚀 Active (priority order)

### R-001 · Watermark + Project ID in PDF exports
- **Priority:** P1
- **Effort:** 1 day
- **Autonomy:** 🟢
- **Status:** done (2026-04-19)
- **Depends on:** none
- **Why:** Every export that lands at a certifier's desk carries our brand + a unique ID (`BOP-2026-XXXX`). Marketing + audit trail. Foundation for the public verify page.
- **Acceptance:**
  - [x] Every project has an immutable `bopId` (format `BOP-<year>-<4-digit seq>`) — column added to `projects` table + migration. Auto-generated on create. Lazy backfill on first read for legacy projects.
  - [x] PDF export footer includes: `Generated with Biochar Optimizer Pro · biocharpro.io` + date + feedstock. Print-only (`hidden print:block`).
  - [x] Project Detail header shows the BOP ID badge (monospaced, primary-colored, tooltip explains what it is).
  - [ ] ID in PDD export — pending (PDD export is still a placeholder; will address when R-010/R-013 ship).

### R-002 · Public verify page (`/verify/:bopId`)
- **Priority:** P1
- **Effort:** 1 day
- **Autonomy:** 🟢
- **Status:** done (2026-04-19)
- **Depends on:** R-001
- **Why:** A certifier receiving a PDF with ID `BOP-2026-0042` can navigate to `biocharpro.io/verify/BOP-2026-0042` and see a public summary. Independent "proof of origin".
- **Acceptance:**
  - [x] Public route `/verify/:bopId`, no auth required (`projects.verifyByBopId` is a `publicProcedure`).
  - [x] Shows: project name, country, status, methodology, dates, BOP ID. Pyrolysis params (T, time, capacity, goal) shown only when visibility = "full". Lab data + exact coords NEVER exposed.
  - [x] Project owner controls visibility: `private` (404), `summary` (default), `full`. Selector in ProjectDetail sidebar.
  - [x] Project lifecycle status (`draft` / `submitted` / `approved` / `rejected`) editable from sidebar dropdown, surfaced as a status pill on the public page.
  - [x] 404-style not-found UI for invalid/unknown IDs (BOP-format regex check before DB lookup).
  - [x] Clickable BOP ID badge in ProjectDetail header opens the verify page in a new tab — instant preview for the owner.
- **Notes:** Score not shown on public page yet — manual checks (lab tests, additionality docs) aren't stored server-side, so a "score" computed from auto checks alone would be misleadingly low. v1.1 candidate: snapshot the score when the user marks status = "submitted".

### R-003 · Gold Standard methodology
- **Priority:** P1
- **Effort:** 2-3 days
- **Autonomy:** 🟡 (research-heavy — verify assumptions)
- **Status:** pending
- **Depends on:** none (framework already built from Puro.earth + Isometric)
- **Why:** Third credit-issuing methodology after Puro.earth and Isometric. Completes core coverage.
- **Acceptance:**
  - [ ] Gold Standard biochar methodology added to `methodologies.ts` with full check list.
  - [ ] i18n for all checks (EN + ES).
  - [ ] Moved from "coming soon" to active in the methodology selector.
  - [ ] Tier-gated to Engineer.
- **Research sources:** Gold Standard biochar methodology PDFs (public), summary docs.

### R-004 · EBC (European Biochar Certificate)
- **Priority:** P1
- **Effort:** 1-2 days
- **Autonomy:** 🟢
- **Status:** done (2026-04-19)
- **Depends on:** none
- **Why:** Quality standard (not credit-issuing) but foundational — many developers need EBC certification as prerequisite for Puro.earth/Isometric. Simpler checklist than credit methodologies.
- **Acceptance:**
  - [x] EBC added to `methodologies.ts` with 12 checks (4 auto from simulation: C ≥ 50%, H:Corg < 0.7, T ≥ 350°C, pH 6-11; 8 manual: positive list, anoxic production, heavy metals lab tested, PAH, PCB, moisture, class declared, audit trail).
  - [x] Marked as `credits: false` in config.
  - [x] Available from Analyst tier ($299).
  - [x] i18n EN + ES.
  - [x] Active in selector (3 methodologies now: Puro.earth, Isometric, EBC).
- **Notes:** Threshold values use conservative/Basic-class limits. Final certification still requires lab testing per official EBC document; the platform serves as pre-audit heuristic.

### R-005 · IBI (International Biochar Initiative)
- **Priority:** P2
- **Effort:** 1-2 days
- **Autonomy:** 🟢
- **Status:** done (2026-04-19)
- **Depends on:** R-004 (same pattern)
- **Why:** Global quality standard. Complementary to EBC.
- **Acceptance:**
  - [x] IBI added to `methodologies.ts` with 12 checks (4 auto: carbon class assignment 1/2/3, H:Corg < 0.7, T ≥ 350°C, BET ≥ 50 m²/g; 8 manual: heavy metals, PAH, CCE, bulk density, particle size, germination test, IBI-recognized lab cert, labeling declaration).
  - [x] `credits: false` (IBI is a quality cert, not credit-issuing).
  - [x] Available from Developer tier ($499) — slightly more advanced than EBC.
  - [x] i18n EN + ES.
  - [x] Active in selector (4 methodologies now: Puro.earth, Isometric, EBC, IBI).

### R-006 · Verra VM0044 methodology
- **Priority:** P1
- **Effort:** 7-10 days
- **Autonomy:** 🟡 (complex — don't rush)
- **Status:** pending
- **Depends on:** R-003, R-004, R-005 preferred first
- **Why:** The largest VCM registry. Opens LatAm market where VCS dominates. Complex — traditional VCS methodology with baseline scenario, additionality test, common-practice analysis, IRR/ECON, formal monitoring plan with statistical sampling.
- **Don't shortcut — a half-done Verra will make us look bad.**
- **Acceptance:**
  - [ ] Full VM0044 PDD template (80+ sections mapped).
  - [ ] Additionality test workflow (baseline + barriers + common practice).
  - [ ] ECON analysis scaffolding (IRR input, NPV, sensitivity).
  - [ ] Permanence tolerance calculation.
  - [ ] Sampling plan generator for monitoring.

### R-007 · Cross-methodology Comparison Dashboard (killer feature)
- **Priority:** P0 (killer marketing feature)
- **Effort:** 2-3 days
- **Autonomy:** 🟢 (after R-003, R-004, R-005 done)
- **Status:** done (2026-04-19)
- **Depends on:** At least 3 methodologies active
- **Why:** "Tu proyecto contra todas las certificaciones a la vez." Killer feature nobody else has.
- **Acceptance:**
  - [x] New component `MethodologyComparison.tsx` — 4 score cards side-by-side (one per active methodology), sorted best-fit-first.
  - [x] Counts per methodology: passed / failed / pending checks visible at a glance.
  - [x] Automated recommendation banner: "Best fit: X · YY/100" with reasoning that adapts to project state (ready vs. close vs. best-effort).
  - [x] "Best fit" badge highlights the recommended card.
  - [x] Tier-locked card with upgrade CTA when user is below Engineer plan.
  - [x] Manual check states shared with `MethodologyAssessment` via the same localStorage key — confirm a check once, applies everywhere.
  - [x] Mounted in ProjectDetail directly below the BiocharPro Score panel.
- **Notes:** Gated to Engineer ($799) since Expert ($999) tier isn't built yet. When Expert ships, this can be moved up.

### R-008 · PostHog analytics integration
- **Priority:** P1
- **Effort:** 2-3 hours
- **Autonomy:** 🟢
- **Status:** pending
- **Depends on:** none
- **Why:** Pablo asked about traffic Apr 16 — we have nothing. Free tier covers 1M events/month. Track page views, CTA clicks, signups, tier upgrades.
- **Acceptance:**
  - [ ] PostHog JS snippet in `index.html`.
  - [ ] Events: `page_viewed`, `cta_clicked`, `signup_started`, `signup_completed`, `checkout_started`, `subscription_activated`, `lab_pdf_uploaded`, `project_created`, `pdd_started`.
  - [ ] Identify user after login (`posthog.identify(userId, { tier, email })`).
  - [ ] Funnel: visit → signup → activate → upgrade visible in PostHog dashboard.
- **Secret needed:** `POSTHOG_KEY` (free, create on posthog.com).

### R-009 · Sentry error monitoring
- **Priority:** P2
- **Effort:** 1-2 hours
- **Autonomy:** 🟢
- **Status:** pending
- **Depends on:** none
- **Why:** Today bugs only surface if users write us. Free tier 5K errors/month.
- **Acceptance:**
  - [ ] Sentry SDK added to both client + server.
  - [ ] Source maps uploaded on deploy.
  - [ ] Alerts email Pablo for any error >= ERROR level.
- **Secret needed:** `SENTRY_DSN`.

---

## 📦 Backlog (medium priority)

### R-010 · PDD file upload (attachments)
- **Priority:** P2
- **Effort:** 1-2 days
- **Autonomy:** 🟡
- **Status:** pending
- **Why:** Users can attach contracts, permits, lab reports to PDD answers. Supports "proof" requirements of certifiers.

### R-011 · PDD AI auto-fill (big feature)
- **Priority:** P1 (killer feature)
- **Effort:** 4-6 days
- **Autonomy:** 🔴 (design decisions needed)
- **Status:** pending
- **Why:** "Dame location + feedstock + capacity, y la IA arma el PDD completo". Auto-populates:
  - `qualities.permittingStatus` — permits by country/state/municipality
  - `equipment.*` — equipment suggestions based on capacity/feedstock
  - `electrical.*` — calculations based on equipment
  - `financial.capex` — estimates from typical costs
  - `lca.*` — populated from the chosen methodology
- **Risk:** If AI hallucinates permits, we look like charlatans. Must cite sources + let user review/edit/confirm.

### R-012 · Supplier Directory
- **Priority:** P2
- **Effort:** 3-5 days
- **Autonomy:** 🟡
- **Status:** pending
- **Why:** Network effects. List pyrolyzer makers (Mingyang, Beston, PYREG, Ankur, Biowatt), labs, consultants, EPCs. Free listing → sponsored highlight (monetization).

### R-013 · Executive Summary PDF variant
- **Priority:** P2
- **Effort:** 1 day
- **Autonomy:** 🟢
- **Status:** done (2026-04-19)
- **Why:** Board-ready 2-page PDF for CFO/investor audiences. Non-technical narrative + KPIs.
- **Acceptance:**
  - [x] New route `/projects/:id/summary` (Analyst+).
  - [x] Page 1: brand bar + BOP ID, project identity (name/location/feedstock), recommended methodology + score, 4 KPIs (yield, fixed C, net CO₂, H:Corg), annual estimate (kt CO₂e/yr).
  - [x] Page 2: process snapshot (T/time/goal), cross-methodology readiness table with Best Fit tag, verify URL block, disclaimer, footer.
  - [x] Print button + auto-print on `?autoprint=1` query param.
  - [x] "Summary" button added to ProjectDetail header (visible to all paid tiers).

### R-014 · Public demo project (`/demo`)
- **Priority:** P1
- **Effort:** 2-3 days
- **Autonomy:** 🟡
- **Status:** done (2026-04-19, rebranded 2026-04-20 from Corrientes Pine Sawdust to Huila Coffee Husk)
- **Depends on:** R-001, R-002
- **Why:** Landing CTA "Ver en acción" → fully populated demo project that visitors can explore without login.
- **Acceptance:**
  - [x] `/demo` and `/demo/:slug` public routes (no auth, no DB writes).
  - [x] Read-only rendering of a pre-seeded "Huila Coffee Husk Pyrolysis Plant" project in Colombia (1.5 t/h, 650°C, BALANCED goal). All numbers computed live from biocharModel.
  - [x] Live components: ProjectMap (satellite Corrientes), MethodologyAssessment with all 4 methodologies, MethodologyComparison with best-fit recommendation.
  - [x] `forceUnlocked` prop added to MethodologyAssessment + MethodologyComparison so demo bypasses tier checks.
  - [x] Landing "Ver en acción" CTA repointed from `/#demo` anchor to `/demo` route.
  - [x] BOP-2026-DEMO badge in header is clickable (opens public verify page in new tab) — proves the verify page works end-to-end.
  - [x] Conversion CTA at the bottom: "Like what you see? Build your own in 2 minutes." with "Open the simulator (free)" + "See pricing".
- **Notes:** PDD section not included in demo for now (PDD requires Engineer tier and is its own complex module). Future v1.1 candidate.

### R-015 · Geospatial biomass availability (FAO GAEZ)
- **Priority:** P3
- **Effort:** 3-5 days
- **Autonomy:** 🟢
- **Status:** pending
- **Why:** "¿Hay suficiente bagazo disponible en esta región?" Integrate FAO GAEZ or MapBiomas.

### R-016 · Methodology export buttons ("Submit to X")
- **Priority:** P2
- **Effort:** 2-3 days per methodology
- **Autonomy:** 🟢
- **Status:** done (2026-04-20, Phase 1: JSON export for 4 methodologies)
- **Why:** "Submit to Puro.earth" / "Submit to Isometric" button. JSON export as supporting documentation for the official intake process.
- **Acceptance:**
  - [x] Generic server-side exporter `submissionExporter.ts` — methodology-agnostic base + per-methodology extras.
  - [x] tRPC `projects.exportSubmission` mutation (Developer+ tier).
  - [x] Supports 4 methodologies today: Puro.earth, Isometric, EBC, IBI.
  - [x] "Export ▾" dropdown in ProjectDetail header with one entry per methodology.
  - [x] Downloads a structured JSON with: project identity, feedstock composition, pyrolysis params, computed biochar characteristics, annual estimates at design capacity, CORC breakdown, per-methodology auto-check results + pending manual checks, methodology-specific fields (durability tier / carbon class / EBC class / CORC edition), verify URL, submission guidance per certifier.
  - [x] Schema tagged `bop.submission.v1` + generator metadata + ISO timestamp for provenance.
  - [x] Filename pattern: `{bopId}__{methodologyId}__submission.json`.
- **Notes:** This is NOT the official ingestion schema of any certifier — those platforms have their own intake. It IS a machine-readable supporting-documentation package that accompanies the official submission and makes our "infrastructure layer" pitch real.

### R-017 · Partnerships page (`/company/partners`)
- **Priority:** P3
- **Effort:** 1 day
- **Autonomy:** 🟢
- **Status:** done (2026-04-19)
- **Why:** Formal partner positioning for certifiers / MRV platforms / pyrolyzer makers. Signals "infrastructure" not "tool".
- **Acceptance:**
  - [x] New public route `/company/partners`.
  - [x] 4 categories listed: Certification standards, MRV/rating platforms, Pyrolyzer makers, Analytical labs.
  - [x] Each entry tagged: `active integration` / `ecosystem-aware` / `coming-soon`. Currently most are ecosystem-aware (no formal API integrations yet).
  - [x] "Become a partner" CTA pointing to /pricing#contact.
  - [x] Footer link added across all marketing pages.
  - [x] EN + ES i18n.

### R-018 · Approval rate stats (public)
- **Priority:** P3
- **Effort:** 2-3 days
- **Autonomy:** 🟡
- **Status:** pending
- **Depends on:** R-002 (status tracking on projects)
- **Why:** "Projects submitted via BiocharPro have X% approval rate at Puro.earth." Marketing gold. Needs data first.

---

## 🔮 Future (after core is solid)

### R-019 · Biochar Pro Claude plugin (publish)
- **Priority:** P1 (strategic distribution)
- **Effort:** 1-2 days
- **Autonomy:** 🔴
- **Status:** pending
- **Depends on:** All core methodologies (R-003 to R-006) + R-007
- **Why:** Distribution to 100M+ Claude users. Killer feature is cross-methodology comparison via `/biochar compare` slash command.

### R-020 · White-label embed (agritech/ERP partners)
- **Priority:** P3
- **Effort:** 1-2 weeks
- **Autonomy:** 🔴
- **Status:** pending
- **Why:** Embeddable simulator for John Deere Ops Center, Bayer Climate FieldView, etc.

### R-021 · Post-commissioning dMRV module
- **Priority:** P2
- **Effort:** 2-3 weeks
- **Autonomy:** 🟡
- **Status:** pending
- **Why:** Extend lifetime value. User keeps paying after construction when they're operating + monitoring.

### R-022 · Investor / portfolio dashboard
- **Priority:** P2
- **Effort:** 2-3 weeks
- **Autonomy:** 🟡
- **Status:** pending
- **Why:** Captures carbon traders as customers. Vista multi-proyecto con risk scoring.

---

## ✅ Recently shipped (for context)

- Multi-methodology framework (Puro.earth + Isometric) + BiocharPro Score 0-100
- Lab analysis PDF upload with Gemini AI extraction
- Regional data (Open-Meteo climate + SoilGrids soil, weighted 0-30cm)
- Location autocomplete (Nominatim /search with debounce)
- Satellite map toggle (Esri World Imagery, free)
- PDD Spanish fix (i18n key prefix bug)
- Market Pulse (biochartoday.com RSS, 1h cache)
- Delete projects (hover button on card)
- Nueva Biomasa prominent CTA card (encourages PDF upload)
- Honest CTAs (no more "Ver demo técnico" → /pricing)
- Trader 2-phase tier progression (Developer → Engineer)
- Miguel Ángel Martínez pull quote on landing
- 6 vertical landing pages (project developer, consultant, trader, agribusiness, integrator, researcher)
- Sidebar navigation (collapsible desktop + mobile drawer)
- REST API with key management, lab-analysis extraction endpoint
- Stripe integration with monthly/quarterly billing toggle
- 53 feedstocks translated (EN + ES)
- Temperature range extended to 400-850°C
- Quality Goal formulas fixed (MAX_CARBON, AGRONOMY, BALANCED now actually differ)

---

## 🤖 For scheduled automation agents

When firing a scheduled run, the agent should:

1. Read `CLAUDE.md` (project context + collaboration rules)
2. Read this file (`ROADMAP.md`)
3. Pick the highest-priority **pending** task marked 🟢 that has no blocked dependencies.
4. Execute: research → code → tsc check → vite build → flyctl deploy.
5. On success: update status to `done` in this file, add entry to `PROGRESS_LOG.md`.
6. On failure: set status to `blocked` with a note + commit, ping Pablo.

**Never touch 🔴 tasks without Pablo's explicit approval.**

**Hard no-go for automation:**
- Pricing changes
- Copy changes to landing hero / taglines
- Any change involving external accounts / new API keys
- Database migrations that could lose data
- Security-sensitive code (auth, payments)
