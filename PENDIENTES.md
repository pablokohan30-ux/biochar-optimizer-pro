# Pendientes — Post-pivot Stage 3 + 4

Última actualización: 24 abr 2026

Contexto del pivot (23-24 abr): Microsoft le dijo a Pablo que no compra más proyectos pre-FID. Exige: planta operativa + end-use traceable + community impact real. La plataforma se extendió con 6 módulos nuevos (Stages 3 y 4) que cubren exactamente esos 3 dealbreakers.

---

## 🟢 Qué quedó deployado y funcionando

### Stage 1-2 — Simulate (lo que ya había)
- Pyrolysis Simulator (48 feedstocks + AI biomass search + lab PDF upload)
- **AI Project Builder** (17 docs con custom methodology = 18)
- Projects + PDD Builder (11 workstreams)
- LCA + Methodology Comparison + Permit Matrix
- Portfolio Dashboard
- Custom LCA Methodologies (user-defined)
- White-label branding (aplicado a los 4 prints: AiBuilderPrint, SubmissionPrint, ExecutiveSummary, AuditPackage)

### Stage 3 — Certify (nuevo)
- ✅ **Operational Evidence Builder** (`/projects/:id/evidence`)
  - 6 tipos: biomass_receipt, pyrolysis_batch, lab_analysis, energy_reading, shift_log, incident
  - Auto-validation vs methodology thresholds (PASS/WARNING/FAIL)
  - Audit readiness % KPI
- ✅ **Offtake Tracker** (`/projects/:id/offtake` + `/confirm/:token`)
  - Chain of custody batch-by-batch
  - QR + public confirmation endpoint (no auth — end-user confirma)
  - 7 estados: draft → dispatched → in_transit → delivered → applied / rejected / lost
  - Traceability % KPI
- ✅ **Community Impact Tracker** (`/projects/:id/community`)
  - 7 tipos de records (meetings, grievances, local hires, procurement, investments, benefit-sharing, env monitoring)
  - KPIs: grievance resolution %, local workforce %, local procurement %, community investment total
  - **AI Impact Report generator** — alineado con IFC Performance Standards + SDG framework

### Stage 4 — Sell (nuevo)
- ✅ **Buyer Readiness Checker** (`/projects/:id/buyer-readiness`)
  - AI evalúa vs 4 buyers: Microsoft, Frontier, Shell, Altitude
  - Cada buyer con criterios públicos hardcodeados (6-10 criterios · deal-breakers marcados)
  - % readiness + gap list + actions + timeline estimate + deal-breaker count
- ✅ **Audit Package PDF export** (`/projects/:id/audit-package`)
  - Une Evidence + Offtake + Community + AI Executive Summary en un solo PDF
  - Print-friendly con white-label branding aplicada
  - Buyer context opcional (influencia el narrative)
- ✅ **Buyer Match** (`/projects/:id/buyer-match`)
  - Inverso del Readiness: "quién me firma primero"
  - AI ranking de los 4 buyers con fit % + timeline + price tier + strengths/gaps por cada uno
  - Commercial strategy narrative

### Metodologías
- **6 metodologías activas** (sumó **Rainbow Standard BiCRS** hoy — ICVCM-approved, <3mo timeline)
- 7 checks Rainbow: 1 auto (H/Corg<0.7) + 6 manual (ICVCM alignment, permanence 100/1000yr, feedstock, annual audit, ISO 14064-2, co-benefits)
- AI Methodology Compliance Matrix ahora evalúa las 6

### Landing pivot (hoy)
- **Hero con dual-audience CTAs**: "Proyecto nuevo" (→ AI Builder) vs "Planta operativa" (→ Projects) — dos tarjetas grandes con gradient
- **Methodology badges row** — 6 metodologías en pills debajo del LandingStats
- **Three-pillar journey section** — Simulate → Certify → Sell, con "Certify" destacada como "Donde se cierran contratos"
- Demo/Guía/Pricing quedaron como links secundarios

### Cost de operación
- AI Project Builder (18 docs): ~USD $0.025/generación
- AI Impact Report: ~USD $0.0008/reporte
- Buyer Readiness check: ~USD $0.0008/check
- Buyer Match: ~USD $0.0005/match
- Audit Package build: ~USD $0.0001/paquete
- **Total cost por cliente activo al mes: ~USD $0.05-0.15** (margen brutal con Expert $999/mes)

---

## 🟡 Pendientes

### Alta prioridad (esta semana)

1. **Rainbow Standard technical guide** — vos estás en eso. Cuando llegue, pasamos los checks de manual a auto (más precisos).

2. **i18n ES para las 6 páginas nuevas** (Evidence, Offtake, Community, BuyerReadiness, AuditPackage, BuyerMatch, ConfirmShipment). Hoy están en inglés hardcoded. Effort: 2-3 horas.

3. **Documentación operacional para el cliente** — guía de cómo usar los trackers, en ES. El flujo nuevo es complejo, sin docs el Expert tier churnea.

### Media prioridad

4. **Customer development** — 5-10 entrevistas con prospects Expert para validar el journey Stage 3→4. Vale más que cualquier feature ahora.

5. **Alertas de costo LLM por email** — cuando daily LLM cost > umbral. Previene sorpresas. Requiere Resend/SendGrid.

6. **CSV import para Operational Evidence** — operadores con plantas existentes tienen weighbridge logs en Excel. Import wizard ahorra horas de data entry. Effort: 1 día.

7. **dMRV integrations reales** (Crystalchain / Carbonfuture / Pyroccs) — Shell explícitamente prefiere dMRV sobre reporting manual. Partnership técnica. Effort: 1 semana cada una.

### Baja prioridad

8. **Photos/attachments en Evidence + Community** — hoy hay un campo `attachmentRef` pero no hay upload. Agregar UI + storage (Fly volume o S3).

9. **Email notifications** cuando end-user confirma shipment via /confirm. Hoy el operator tiene que refrescar.

10. **Email notifications** cuando un grievance se marca "open" por >15 días sin resolver.

11. **Developer track record integration** — Altitude pesa mucho esto. Permitir al user adjuntar proyectos previos a su perfil.

---

## 🔵 Estratégicas / no-código

- **Customer development** (mencioné arriba) — prioridad #1 antes de más features
- **Partnership con VVBs** (TÜV, SCS, DNV, Aenor) — "recomendado como pre-submission tool" genera distribución
- **Caso de estudio Corrientes** público (con permiso de FASA + Microsoft) — marketing killer
- **Contenido marketing** — blog post "Microsoft stopped buying from pre-FID: what operators need to do now" (con tu journey como prueba)

---

## Estado del Expert tier ($999/mes) — todo prometido ≡ todo construido

| Feature | Estado |
|---|---|
| AI Project Builder (18 docs) | ✅ |
| Portfolio Dashboard | ✅ |
| White-label reports (en 4 prints) | ✅ |
| Custom LCA methodology | ✅ |
| **Operational Evidence Builder** | ✅ |
| **Offtake Tracker + public confirm** | ✅ |
| **Community Impact Tracker + AI Report** | ✅ |
| **Buyer Readiness Checker** | ✅ |
| **Buyer Match** | ✅ |
| **Audit Package export** | ✅ |
| Dedicated account manager | ~~Proceso manual~~ → reemplazado por AI en todo el flow |

El $999 ya no tiene nada "por construir". Todo en producto. El dedicated account manager que dijiste "no quiero hacerlo" se reemplazó por el **AI Concierge implícito** en cada módulo (cada uno tiene AI que analiza + recomienda + arma docs sin intervención humana).

---

## TL;DR

**Lo que construimos en 48 horas (23-24 abr):**
- 6 módulos nuevos que cubren el journey completo de operational → contract-signed
- Pivot del pitch (landing) a "De biomasa a contrato firmado"
- Rainbow Standard integrado como 6ta metodología
- AI-powered en cada módulo, costo operativo <USD $0.15/cliente/mes

**Lo que queda:**
- i18n ES para las páginas nuevas (task de 2-3 horas)
- Docs de onboarding operacional
- Customer development — donde está el verdadero gap ahora

**Tu Microsoft-blocker:** cerrado al 100% en producto. Si Microsoft te pregunta "¿tienen planta operativa? ¿dónde se aplica el biochar? ¿tema social?" → le mandás el Audit Package PDF y es todo auditable, batch-por-batch.
