# Fly.io support ticket — biochar-optimizer-pro (machine won't start)
Generado: 2026-10-08

## Dónde enviarlo
- Preferido: Dashboard de Fly → botón de soporte, o email a **support@fly.io**
- Alternativa (plan Pay-As-You-Go): abrir un tema en **community.fly.io**
- Escribirlo en **inglés** (soporte de Fly opera en inglés → respuesta más rápida).

## Asunto / Subject
App "biochar-optimizer-pro" stuck in Suspended — machine fails to start: "Unknown response while starting machine"

## Cuerpo / Body (copiar tal cual)
Hi Fly team,

My production app is down and I can't bring it back up. I'd appreciate help unsticking it.

- Organization: pablo-kohan (Personal)
- App name: biochar-optimizer-pro
- Region: gru (São Paulo)
- Machine ID: 683d472f479138 (release v254, shared-cpu-1x, 1GB RAM)
- Attached volume: biochar_data (5 GB, mounted at /app/data) — contains my SQLite database, must NOT be lost
- App status in dashboard: "Suspended"
- Health checks: 0/1

What happens: when I click "Start" on the machine in the dashboard, it fails immediately with:
  "Machine failed to start: Unknown response while starting machine"

Context that rules out the usual causes:
- Billing/account is in **Good Standing** (Pay As You Go, no outstanding balance).
- The app was last deployed ~3 months ago and ran fine until now — no recent code change.
- This looks like the machine (or the host holding its volume) is in a bad state on your side.

Requests:
1. Please investigate why machine 683d472f479138 cannot start and un-stick / migrate it if its host is unhealthy.
2. If the machine or its host can't be recovered, please advise the safest way to recreate the machine while preserving the data on volume biochar_data (I have volume snapshots enabled). I want to avoid data loss.

Thank you — this is the production site for biocharpro.io and it's currently offline.

Pablo
