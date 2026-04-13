# Biochar Optimizer Pro — TODO

## Completado anteriormente
- [x] Actualizar el proyecto a `web-db-user` para habilitar el backend y el uso de LLM.
- [x] Crear el endpoint del backend (`server/routers.ts`) para consultar propiedades de biomasa usando el LLM.
- [x] Modificar el frontend (`Home.tsx`) para integrar el buscador inteligente de biomasa.
- [x] Corregir bug de anchor_H (ratio molar vs % H en masa) en feedstocks precargados
- [x] Corrección robusta en 3 capas para búsquedas IA (prompt + servidor + modelo)

## Fase 1: Rebranding y marca
- [x] Cambiar nombre de la app a "Biochar Optimizer Pro"
- [x] Quitar referencia al "THJ1500-1" del header
- [x] Quitar "v2.0 (React)" del header
- [x] Actualizar subtítulo del header a algo genérico y comercial

## Fase 2: Landing page de conversión
- [x] Crear página / con hero section, propuesta de valor y tiers de precios
- [x] Definir 5 tiers: Free / Analyst $299 / Developer $499 / Engineer $799 / Expert $999
- [x] Agregar tabla comparativa de módulos incluidos por tier
- [x] Agregar CTA "Empezar gratis" y "Ver planes"
- [x] Redirigir la ruta raíz "/" a la landing page
- [x] Mover el simulador a "/app"
- [x] Crear página /pricing con tabla completa de tiers

## Fase 3: Sistema de suscripciones con Stripe
- [x] Integrar Stripe (webdev_add_feature stripe)
- [x] Agregar campos de suscripción en tabla users (stripeCustomerId, subscriptionTier, etc.)
- [x] Crear tabla aiSearchUsage para rate limiting
- [x] Migración de base de datos (pnpm db:push)
- [x] Archivo stripeProducts.ts con definición de los 4 tiers
- [x] Endpoint tRPC: subscription.getMyTier
- [x] Endpoint tRPC: subscription.createCheckout (crea/busca producto en Stripe automáticamente)
- [x] Endpoint tRPC: subscription.createPortal (gestión de suscripción)
- [x] Webhook de Stripe (/api/stripe/webhook) para activar/desactivar suscripciones
- [x] Rate limiting en búsqueda IA: 3 búsquedas/día para plan free

## Fase 4: Bloqueo de funciones premium
- [x] Hook useTier() para verificar tier del usuario
- [x] Componente UpgradeModal con features por tier y botón de suscripción
- [x] Bloquear botón "OPTIMIZAR" para usuarios Free (modal de upgrade → Analyst)
- [x] Bloquear botón "Exportar PDF" para usuarios Free (modal de upgrade → Analyst)
- [x] Badge de tier activo en el header (clickeable → /pricing)

## Fase 5: Módulo LCA (Analyst+) — próximo sprint
- [ ] Adaptar el LCA existente del proyecto como módulo de la plataforma
- [ ] Formulario de datos de entrada para LCA (transporte, electricidad, biomasa)
- [ ] Cálculo de CO2e neto según metodología Puro.earth/Isometric
- [ ] Exportar informe LCA en PDF

## Backlog futuro
- [ ] Módulo de diseño de proyecto (dimensionamiento, CAPEX/OPEX, TIR/VPN)
- [ ] Módulo de ingeniería de planta (layout, P&ID)
- [ ] Módulo regulatorio (mapa de permisos por país)
- [ ] Módulo de mercado de carbono (comparador de plataformas)
- [ ] Módulo de aplicaciones del biochar (mapa interactivo)
- [ ] Página /account para gestionar suscripción activa
- [ ] Mostrar fuente bibliográfica en tooltip del selector de biomasas IA
- [ ] Validar que CHONS sumen ~100% en biomasas buscadas con IA

## Translation to English (current sprint)
- [x] Translate Landing.tsx to English
- [x] Translate Pricing.tsx to English
- [x] Translate Home.tsx (simulator) to English
- [x] Translate UpgradeModal.tsx to English
- [x] Translate server-side error messages to English

## Contact & Domain (current sprint)
- [x] Replace email placeholder with in-page contact form in Pricing.tsx and Landing.tsx
- [x] Check biocharpro.io domain availability

## Module Cards UX (current sprint)
- [x] Convert module cards to expandable accordions in Landing.tsx

## How it works section (current sprint)
- [x] Add 3-step visual flow (Simulate → Design → Certify) to Landing.tsx

## Testimonials section (current sprint)
- [x] Add customer testimonials section to Landing.tsx

## Testimonials avatars (current sprint)
- [ ] Generate 6 AI profile avatars for testimonials
- [ ] Upload avatars to CDN and update Landing.tsx with photos, flags, and disclaimer

## FAQ section (current sprint)
- [x] Add FAQ accordion to Landing.tsx before footer

## Corporate email & 3-month minimum (current sprint)
- [x] Add corporate email validation (block Gmail/Hotmail/Yahoo etc.) to contact form
- [x] Update CTA section to require corporate email
- [x] Update Stripe products to 3-month minimum billing (quarterly)
- [x] Update pricing page to show quarterly pricing and 3-month minimum notice

## Quarterly savings badge (current sprint)
- [x] Add quarterly savings badge to each paid tier card in Pricing.tsx

## Fixes (current sprint)
- [x] Move Most Popular badge from Developer to Engineer ($799) in Pricing.tsx
- [x] Fix module accordion expanded content not visible in Landing.tsx

## Layout restore (current sprint)
- [ ] Restore original 3-column grid layout for module cards in Landing.tsx
- [ ] Confirm Most Popular badge is on Engineer ($799) in Pricing.tsx

## Feature table reorder (current sprint)
- [x] Move Expert-only advanced features (plant design, P&ID, regulatory, certifications, investor doc) to bottom of FEATURES array in Pricing.tsx

## Module card height fix (current sprint)
- [x] Make all module cards equal height in the 3-column grid in Landing.tsx

## Most Popular badge fix (current sprint)
- [x] Fix Most Popular badge to Engineer ($799) — was reverting to Developer ($499)

## Feature table Expert-only fix (current sprint)
- [x] Fix last 5 features in FEATURES array to show checks only for Expert tier (not Engineer) — already correct in code, published checkpoint needed

## Tier feature restructure (current sprint)
- [x] Analyst $299: LCA, compliance, PDF, scenario comparator
- [x] Developer $499: Carbon market, Applications map, Agronomic calculator, Priority support
- [x] Engineer $799: Reactor sizing, CAPEX/OPEX, IRR/NPV, 10-year projection, Reactor supplier map
- [x] Expert $999: P&ID, Equipment specs, BOM, Regulatory framework, Certification guides, Technical doc for investors
- [x] Apply changes to Landing.tsx TIERS array
- [x] Apply changes to Landing.tsx MODULES array (tier badges)
- [x] Apply changes to Pricing.tsx FEATURES array

## Module card accordion fix
- [x] Fix ModuleCard so each card opens/closes independently (only one open at a time, no shared state)

## Pricing descriptions update
- [x] Add description field to TIERS array in Pricing.tsx for all 5 tiers
- [x] Display descriptions in tier cards below price/savings badge
