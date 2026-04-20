# Progress Log

Append-only log of changes. Newest entries at the top. Each entry should be
short, milestone-level — not commit-level.

Format:
```
## YYYY-MM-DD · <short milestone title>
<1-3 lines of what was done, who did it (Pablo / scheduled-agent / manual-session), and links to relevant commits or live URLs>
```

---

## 2026-04-20 · Demo polish + verify page enrichment
- Enriched `/demo` Info panel (added Developer/Operator, Project type, Technology, Feedstock origin, Commissioning date) and added new "Annual estimates" card (CO₂ removals, biochar output, feedstock processed, CORC revenue potential at $150/tCO₂e).
- Rebranded demo project from "Corrientes Pine Sawdust" (Argentina) to "Huila Coffee Husk Pyrolysis Plant" (Neiva, Colombia) — feedstock=coffee_husk, coords=(2.93, -75.28). Colombia-focused story aligned with Carbon Forum.
- Verify page redesigned: added Project Identity card, Annual estimates card, Trust Signals section (shows all auto-checks with pass/fail + detail from the target methodology — e.g. "✓ T=650°C ≥ 350°C"), and a transparency disclaimer. Server endpoint `verifyByBopId` now computes annual estimates + auto-check summary server-side using the shared biochar model.

## 2026-04-19 · Autonomous backlog execution (overnight session)
Executed while Pablo was sleeping, carta blanca mode:
- Fixed misleading CTAs ("Ver demo técnico" → /pricing now goes to /#demo, and trader/researcher/integrator secondary CTAs now go to /api instead of /pricing).
- Added 2-phase tier progression on the trader vertical (Developer for screening → Engineer for deep DD) with visual side-by-side cards + arrow connector.
- Added Miguel Ángel Martínez pull quote on landing above Market Opportunity section, with our take explaining the positioning.
- Created `ROADMAP.md` (task backlog with priorities + autonomy levels) and this file.
- **R-001 done:** BOP Project IDs (`BOP-YYYY-NNNN` format) auto-assigned on project creation, lazy-backfilled for existing projects. Visible badge on ProjectDetail header. Print-only watermark + generation footer on Home.tsx PDF export.
- **R-004 done:** EBC (European Biochar Certificate) third active methodology. 12 checks total (4 auto, 8 manual). Available from Analyst tier. Selector now shows 3 active methodologies: Puro.earth, Isometric, EBC.
- **R-005 done:** IBI (International Biochar Initiative) fourth active methodology. 12 checks total (4 auto: 3-class carbon assignment 1/2/3, H:Corg < 0.7, T ≥ 350°C, BET ≥ 50 m²/g; 8 manual: heavy metals, PAH, CCE, bulk density, particle size, germination test, IBI-recognized lab cert, labeling declaration). Quality cert (no credits). Available from Developer tier. Selector now shows 4 active methodologies: Puro.earth, Isometric, EBC, IBI.
- **R-002 done:** Public verify page at `/verify/:bopId`. Public tRPC `verifyByBopId` returns sanitized summary (name, country, status, methodology, dates) + optional pyrolysis snapshot in "full" mode. Owner controls visibility per project (`private`/`summary`/`full`) + lifecycle status (`draft`/`submitted`/`approved`/`rejected`) from ProjectDetail sidebar. BOP ID badge in header is now clickable — opens verify page in new tab. EN+ES i18n. Lab data + exact coords NEVER leaked. Tested live: BOP-2026-0001 returns valid JSON, BOP-2026-9999 returns null.
- **R-007 done (KILLER FEATURE):** Cross-methodology Comparison Dashboard. New `MethodologyComparison.tsx` component shows the same project scored against all 4 active methodologies side-by-side (Puro.earth, Isometric, EBC, IBI), sorted best-fit first. Auto-recommendation banner picks the right methodology with adaptive reasoning (ready / close / best-effort). "Best fit" badge highlights the winner. Manual check states shared with MethodologyAssessment via localStorage key — confirm once, applies across all 4. Tier-gated to Engineer ($799). Mounted in ProjectDetail directly below the BiocharPro Score panel.
- **R-013 done:** Executive Summary 2-page PDF at `/projects/:id/summary`. Board-ready printable layout: page 1 = identity + recommended methodology + 4 KPIs + annual CO₂e estimate; page 2 = process snapshot + cross-methodology readiness table + verify URL + disclaimer. Auto-print on `?autoprint=1`. New "Summary" button (printer icon) in ProjectDetail header.
- **R-017 done:** Partners page at `/company/partners`. Public page positioning BiocharPro as the digital infrastructure layer between developers and the rest of the ecosystem. 4 categories: Certification standards (Puro/Isometric/EBC/IBI/Verra/Gold), MRV & rating (Carbon Standards Intl/Isometric Certify/Sylvera/BeZero), Pyrolyzer makers (PYREG/Beston/Ankur/Biowatt/Mingyang), Analytical labs (Eurofins/Control Lab/ALS/IBI directory). Each entry tagged active/ecosystem-aware/coming-soon. Footer link added on all marketing pages. EN + ES i18n.
- **R-014 done:** Public demo project at `/demo`. Hardcoded "Corrientes Pine Sawdust" plant (1.5 t/h, 650°C). All sections live: satellite map of Corrientes, KPIs computed from biocharModel, MethodologyAssessment + MethodologyComparison with `forceUnlocked` prop bypassing tier gates. Verify badge BOP-2026-DEMO clickable. Conversion CTA at bottom + Landing "Ver en acción" CTA repointed from `/#demo` anchor to `/demo` route. Visitors can explore the full product without login.
- **Polish:** BOP-2026-DEMO hardcoded in `verifyByBopId` so the demo→verify→demo loop works without DB writes. New `getRegionalDataPublic` endpoint + `publicEndpoint` prop on `RegionalAnalysis` component lets the demo page show real Corrientes climate + SoilGrids data without auth.

## 2026-04-18 · Feature sprint day 2
- Multi-methodology framework: Puro.earth + Isometric both live with BiocharPro Score 0-100, side-by-side tabs, tier-gated.
- Lab analysis PDF upload: Gemini 2.5 Flash extracts C/H/N/S/O, ash, moisture, pyrolysis conditions from a lab PDF. Gemini billing enabled on Google Cloud project "Biodigestor".
- Regional Analysis: redesigned to horizontal layout (stats left, charts right). Fixed Open-Meteo (was using invalid `monthly=` param) and SoilGrids (was using invalid `depth=0-30cm`, now fetches 3 depths and weight-averages).
- Location autocomplete (Nominatim /search, debounced 300ms, dropdown with country).
- Satellite map (Esri World Imagery, free, no API key, toggle Satellite/Map).
- PDD Spanish fix (i18n key prefix `pdd.` was being double-namespaced).
- Delete button on Projects list (hover-only, destructive styling).
- Prominent "Nueva Biomasa" card with upload-PDF CTA above the feedstock dropdown.

## 2026-04-18 · Feature sprint day 1
- Market Pulse (biochartoday.com RSS, 1h cache, Spanish locale notice).
- Sidebar navigation (collapsible desktop + mobile drawer).
- 6 vertical landing pages (project developer, consultant, trader, agribusiness, integrator, researcher) + "Who uses it" grid on landing.
- Solutions + About pages, footer links, i18n EN+ES.
- REST API (Developer tier): /api/v1/simulate, /batch, /feedstocks, /extract-lab-analysis. API key management at /api page (SHA-256 hashed Bearer tokens).
- Stripe monthly/quarterly billing toggle (20% discount on quarterly).
- Temperature range extended 400-850°C. Quality goal formulas rewritten so MAX_CARBON, AGRONOMY, BALANCED actually differ.
- 53 feedstocks translated to Spanish.
- BatchComparison page (Developer+).
- PDD Builder (Engineer+, 11 workstreams, localStorage persistence).

## 2026-04-16 · Carbon Forum launch
- biocharpro.io live on Fly.io.
- First users from the Colombia Carbon Forum (1 active — pablo.k@3verde.com).
- Carbon Forum Pass ($100 base, $50 with social share) for 30-day Analyst access.
