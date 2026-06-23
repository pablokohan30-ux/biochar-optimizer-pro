# Biochar Optimizer Pro — Project Notes

Working notes for Claude Code to reference across sessions.

---

## Business context

- **Product:** Biochar Optimizer Pro — digital infrastructure for biochar carbon removal projects
- **Positioning:** "Proyectos de biochar, digitalizados, de punta a punta"
- **Owner:** Pablo Kohan (pablo.k@3verde.com, company 3verde / Emisiones Neutras)
- **Domain:** biocharpro.io (deployed on Fly.io, app name `biochar-optimizer-pro`)
- **Stack:** React + Vite (client), Express + tRPC (server), SQLite (Drizzle), Gemini 2.5 Flash (LLM)
- **Tiers:**
  - Free ($0) — simulator + 48 feedstocks + AI search
  - Analyst ($299/mo) — + LCA, projects, Puro.earth pre-assessment, lab PDF upload
  - Developer ($499/mo) — + Batch comparison, REST API
  - Engineer ($799/mo) — + PDD Builder (11 workstreams), equipment/layout/electrical templates
  - Expert ($999/mo) — + **AI Project Builder** (flagship, Apr 23 2026): input biomass + capacity + country → AI generates 15-doc package. Grounded in 9 real pyrolyzers + 20 countries' grid EFs + 13 countries' regulatory authorities. ~3 min, ~$0.021 LLM cost. Export as PDF + Open-in-PDD-Builder handoff.
- **Billing cycles:** monthly (full price) or quarterly (20% off, billed every 3 months)
- **Test user:** `test@biocharpro.io` / `biochar2026` (Expert tier, admin role, active)
- **Admin dashboard:** `/admin/ai-stats` — requires user role='admin'. Live tokens/cost stats for the AI Builder.

## Language & communication preferences

- Pablo speaks Spanish — respond in Spanish by default
- Move fast: Pablo dislikes being asked lots of clarifying questions. If there's an obvious default, take it and explain after.
- Pablo is non-technical — explain technical things at a business level with concrete examples, not just pure engineering terms.

## Collaboration mode (updated Apr 18 2026)

**Carta blanca on execution:** Pablo granted full autonomy to execute the agreed roadmap. Don't ask for OK on every step. Just execute, deploy, and report each milestone.

**BUT — push back before executing.** Pablo explicitly asked: *"que me cuestiones y no hagas siempre todo lo que yo te digo sin pensar antes consecuencias tiempos, pro y contras"*. Apply this every time:

- Before committing to a task, think: "Is this the right move? Are there hidden costs? Simpler approach? What's the risk?"
- If a user request has a trade-off, flag it BEFORE executing — not after.
- If an estimate seems optimistic (ex: complex work in X days), say so honestly.
- Offer alternatives. Don't be a yes-man.
- Challenge assumptions respectfully. Pablo values being challenged, not agreed with reflexively.

**Only ask Pablo before executing when:**
- The decision affects pricing / tiers
- It's a branding/copy change to landing hero or visible taglines
- It requires external account access / credentials
- It has a meaningful $ cost or user-facing risk

Everything else (code, deploys, i18n, methodology research, refactors, watermarks, integrations): execute and report.

**Update format:** brief milestone-by-milestone, with screenshots/links when relevant. Example: *"✅ Watermark deployed. Every PDF now has BOP-2026-XXXX ID + our brand in footer. Next up: Gold Standard methodology research."*

---

## Claude plugins directory — use as a mental map, NOT as installs

**Reference:** https://claude.com/plugins (120+ plugins bundling MCPs + skills + tools)

**How Pablo wants this used:** When a task matches a plugin's purpose, **reference the plugin by name** ("esto es lo que hace el plugin X — lo hago directo") and then **execute the work yourself** using existing tools (bash, edit, web fetch, etc). Do NOT install plugins, do NOT ask Pablo to install them. The directory is just a vocabulary to label what category of task we're doing — so Pablo recognises the shape of the work.

**Example phrasing:**
> "Esto es lo que hace el plugin Stripe — ver subscriptions activas. Lo corro directo con la API de Stripe en la terminal."

| Task / Situation | Matches plugin → say it and do it yourself |
|------------------|--------------------------------------------|
| Managing Stripe subscriptions, viewing churn, refunds, invoices | **Stripe** → use `stripe` CLI or Stripe API via curl |
| Deploying / viewing production logs | **Fly / Vercel / Railway** → we use Fly, `flyctl` already installed |
| Postgres DB work (if migrating from SQLite) | **Supabase** → use `psql` / Supabase API |
| Backlog / task tracking for feature requests | **Linear / Jira** → keep a TASKS.md or open an issue via `gh` |
| User analytics, funnel tracking, behaviour analytics | **PostHog** → add a client-side snippet or use their REST API (Pablo asked about traffic Apr 16 — no analytics yet) |
| Error monitoring in production | **Sentry** → add SDK + track errors programmatically |
| Security audits of deployed code | **Semgrep / Aikido Security** → run the CLI or scan with grep + manual review |
| Browser automation / scraping / UI testing | **Playwright** → there's a Chrome MCP I can use; otherwise write a small Playwright script |
| Code review before major deploys | **Code Review / CodeRabbit** → do it myself with the code-reviewer agent |
| Building custom Claude Code workflows / skills | **Skill Creator / Superpowers** → write the skill manually in .claude/skills/ |
| Frontend design work / component generation | **Frontend Design / Figma** → write the Tailwind/React directly |
| TypeScript/Python language intelligence | **LSP plugins** → use `tsc --noEmit` / `pyright` via bash |

**Strategic opportunity (not yet built):** Package our REST API as a **"Biochar Pro" Claude plugin** so OTHER Claude users can consume our API. That's the one case where we'd actually ship a plugin (as publishers, not as installers). Would expose `/api/v1/simulate`, `/batch`, `/feedstocks`, `/extract-lab-analysis` as slash commands inside any Claude session — distribution to 100M+ Claude users.

**Plugin timing decision (Apr 2026):** BUILD AFTER multi-methodology is done (~6-8 weeks from now). Reasons: (1) the plugin's killer feature is cross-methodology comparison, which requires all methodologies implemented; (2) Anthropic directory launch is one-shot editorial attention — don't waste it on a v0.1; (3) no competing plugins in directory, so no urgency; (4) avoids split focus.

**Integrations to actually ship as product code (not as plugin installs):**

1. **PostHog** — analytics. Pablo asked about traffic Apr 16 — we have nothing. Add as client-side snippet + event tracking. Free tier covers 1M events/month. ~2-3h of work. Can ship in parallel with multi-methodology.

2. **Sentry** — production error monitoring. No alerting today — we only see bugs if a user writes us. Free tier 5K errors/month. ~1-2h of work. Add during polish phase (week 7-8).

Both are integrations of external SaaS products into our codebase, not Claude plugins. They're mentioned here because they correspond to "PostHog plugin" and "Sentry plugin" in the directory — same category of tool, different integration method.

---

## Key architecture notes

- **LLM:** Gemini 2.5 Flash via `@google/generative-ai`, wrapped in `server/_core/llm.ts` (`invokeLLM` + `extractFromPdf`)
- **GEMINI_API_KEY:** Project "BiocharPro" in Google Cloud, billing linked to "Mi cuenta de facturación 1" (pospago). Rotate via `flyctl secrets set GEMINI_API_KEY="..."`.
- **Auth:** Custom JWT-based (bcrypt passwords), tRPC `protectedProcedure`
- **API auth:** SHA-256 hashed Bearer tokens in `api_keys` table (`bop_<48 hex>`), managed at `/api` page
- **Biochar model:** Pure math in `client/src/lib/biocharModel.ts` (shared between client + server-side API). Calibrated against CINDECA/CONICET peer-reviewed data. 53 feedstocks.
- **Routing:** Wouter (no React Router). Public pages + AppLayout wrapper for authenticated pages
- **Sidebar:** `AppLayout` + `AppSidebar` components — collapsible, mobile drawer, persists state in localStorage
- **Tier gating:** `useTier()` hook → `hasAccess("tier")`. Server-side via `tierHasAccess` from stripeProducts.ts
- **i18n:** `client/src/i18n/index.ts`, EN + ES (Pablo's primary language is ES)

## Key feature flows

- **Lab analysis PDF upload:** Home.tsx → `trpc.biomass.extractLabAnalysis` → Gemini extracts structured JSON → pre-fills custom feedstock form → optionally saves to `lab_analyses` table for platform learning (opt-in). Also usable as biomass input in the AI Project Builder (Expert tier).
- **AI Project Builder:** `/ai-builder` (Expert tier). Input biomass + capacity + country → backend (`aiBuilderRouter.create`) queues 15-doc generation via `server/_core/aiProjectBuilder.ts`. Each doc has a prompt template with a grounding block (grid EFs, regulatory authorities, pyrolyzer catalog, CAPEX benchmarks). Parallel generation (concurrency 5), progressive UI update via polling. `aiGeneratedProjects` DB table tracks state + token usage. `/ai-builder/:id/print` renders a print-friendly PDF bundle. `/ai-builder/:id` → "Open in PDD Builder" creates a regular Project + writes flattened answers to `localStorage["pdd_<projectId>"]` so the existing PDD Builder picks them up.
- **PDD Builder:** `/pdd/:projectId`, Engineer tier only, 11 workstreams × N questions, localStorage-persisted, `client/src/lib/pddTemplate.ts`
- **Batch Comparison:** `/batch`, Developer+ tier, compares up to 48 feedstocks at once at same T/time, CSV export
- **REST API:** `/api` dashboard for key management, `server/apiRouter.ts` for `/api/v1/simulate`, `/batch`, `/feedstocks`
- **Solutions landing pages:** `/solutions/:vertical` (developer, consultant, trader, agribusiness, integrator, researcher)

## Deployment

```bash
# Build
npx tsc --noEmit && npx vite build

# Deploy
~/.fly/bin/flyctl deploy --strategy rolling

# Logs
~/.fly/bin/flyctl logs -a biochar-optimizer-pro --no-tail

# SSH into production machine
~/.fly/bin/flyctl ssh console -a biochar-optimizer-pro

# Set secrets
~/.fly/bin/flyctl secrets set KEY="value" -a biochar-optimizer-pro
```

Machine auto-stops on no traffic. First request after idle takes ~5s to warm up. Curl the root before running time-sensitive SSH commands.
