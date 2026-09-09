# Website hosting

Cloudflare Pages project: `visualise-oklch`.

- GitHub source: `shreyam1008/visualise-oklch`, production branch `main`.
- Build command: `node scripts/prepare-pages.mjs`; output: `site-dist`; repository root.
- `SKIP_DEPENDENCY_INSTALL=true`: the static website build needs only Node's standard library.
- Canonical public URL remains https://visualise-oklch.shreyam1008.com.np/ .
- `404.html` preserves real missing-page responses instead of Cloudflare's default SPA fallback.
- Production builds watch `docs/*`, `scripts/prepare-pages.mjs` and `screenshot.png`.
- GitHub Pages workflow remains available as rollback during migration. Extension releases and marketplace publishing are unchanged.

Before changing the custom domain, verify the Pages build, color controls, picker demo, images, canonical metadata, robots and sitemap. Migration status and DNS rollback are tracked in `shreyam1008/buggy` under `docs/projects/`.
