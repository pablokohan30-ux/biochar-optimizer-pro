# Setup CI/CD — Auto-deploy a Fly.io

Una sola configuración. Después: cada `git push` deploya solo a biocharpro.io.

## Lo único que tenés que hacer (5 min, una sola vez)

### 1. Generar un token de Fly

```bash
~/.fly/bin/flyctl tokens create deploy --expiry 8760h --name "github-actions"
```
(8760h = 1 año; renová cuando expire)

Vas a obtener algo como `FlyV1 fm2_lJPECAA...`. **Copialo entero** (incluye `FlyV1 `).

### 2. Agregarlo como secret en GitHub

Abrí: https://github.com/pablokohan30-ux/biochar-optimizer-pro/settings/secrets/actions/new

- **Name:** `FLY_API_TOKEN`
- **Secret:** [pegá el token completo]
- Click **Add secret**

### 3. Listo

A partir de ahora, cada `git push origin main` dispara el workflow `.github/workflows/deploy.yml`
que corre `flyctl deploy --remote-only` y sube los cambios a biocharpro.io.

## Cómo verificar que anduvo

- Logs en vivo: https://github.com/pablokohan30-ux/biochar-optimizer-pro/actions
- Sitio: https://biocharpro.io
- O CLI: `~/.fly/bin/flyctl logs -a biochar-optimizer-pro --no-tail`

## Saltar el deploy en un commit

Si querés que un commit NO dispare el deploy (ej. solo docs), poné `[skip ci]` en el mensaje:

```bash
git commit -m "docs: update README [skip ci]"
```

## Deploy manual (sin push)

Desde la pestaña **Actions** del repo → "Deploy to Fly.io" → **Run workflow**.

## Si algo falla

- El workflow falla pero no toca prod (Fly mantiene la versión anterior corriendo).
- Mirás los logs en GitHub Actions → arreglás → push de nuevo.
- Para rollback de emergencia: `~/.fly/bin/flyctl releases -a biochar-optimizer-pro` (lista) +
  `~/.fly/bin/flyctl releases rollback <version>` (vuelve atrás).
