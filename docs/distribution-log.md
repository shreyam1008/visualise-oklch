# Visualise OKLCH distribution log

## Current distribution — 12 September 2026 UTC

Version 2.1.1 is live on GitHub, the website, Open VSX, and the VS Code Marketplace, and installed locally. Fresh anonymous store requests confirm 2.1.1; previously cached unqualified listing URLs may briefly show 2.1.0.

| Channel | Version | Status |
| --- | --- | --- |
| Package | 2.1.1 | Released |
| GitHub Release | 2.1.1 | Live |
| Product website | 2.1.1 | Live |
| Open VSX | 2.1.1 | Live; anonymous latest API verified |
| VS Code Marketplace | 2.1.1 | Live; anonymous VersionValue 2.1.1 verified |

Release workflow: https://github.com/shreyam1008/visualise-oklch/actions/runs/34700295801 . Both registry uploads use the GitHub release asset (1,073,957 bytes; SHA-256 `f95a6dd9a63bdaf34c845e9740822fee41cf046d48a1d3fd0934b384b2bd8a3f`). Marketplace was uploaded through the authenticated publisher dashboard; automated Marketplace authentication remains unconfigured.

The public Open VSX README and Marketplace page both include Open OKLCH picker, the two screenshots, and the package-size explanation. The website serves both image assets with HTTP 200. CI verifies local source before publication; `bun run verify` additionally verifies live channel alignment using release-qualified requests to avoid stale CDN snapshots.

## Historical entries

## Current distribution — 12 September 2026 UTC

All public release channels serve **2.1.0**. This snapshot supersedes the pending-upload and 2.0.5 statements in the dated history below.

| Channel | Version | Status | Evidence |
| --- | --- | --- | --- |
| Package | 2.1.0 | Released | `package.json` is the version source. |
| GitHub Release | 2.1.0 | Live | [v2.1.0](https://github.com/shreyam1008/visualise-oklch/releases/tag/v2.1.0) includes `visualise-oklch-2.1.0.vsix`. |
| Product website | 2.1.0 | Live | [Canonical site](https://visualise-oklch.shreyam1008.com.np/) advertises v2.1.0 and links both stores. |
| Open VSX | 2.1.0 | Live | [Anonymous latest API](https://open-vsx.org/api/shreyam1008/visualise-oklch/latest) reports 2.1.0, verified, and 1,882 downloads at review time. Downloads are a dated observation, not a fixed verification threshold. |
| VS Code Marketplace | 2.1.0 | Live | [Public listing](https://marketplace.visualstudio.com/items?itemName=shreyam1008.visualise-oklch) returns HTTP 200 and current VersionValue 2.1.0. |

The supplied review reports CI and Pages green. No public state was changed by this reconciliation. Microsoft publishing automation authentication is separate from the already-live Marketplace listing.

Review scores (out of 3): user pain 1; discoverability/installability 3; evidence confidence 3; reusable value 3; effort 1; risk 0.

`bun run verify` now includes `verify:distribution`: package version must agree with product records, this current table, local and live site metadata/release links, the latest stable GitHub release with its VSIX, Open VSX latest, and the Marketplace current listing field. Missing evidence, HTTP errors, and version drift fail verification; a reachable listing alone is insufficient.

For development or prepublication packaging, `bun run verify:local` runs the local checks without requiring an unpublished version to exist in public stores. The publish workflow uses this command before upload. After publication and store validation/site deployment, run the full `bun run verify`; CI also runs the full command. Temporary propagation delays remain failures until every public channel agrees.



The following dated snapshots document what was observed then; pending uploads and old store versions below are historical, not current distribution status.


## Hue wheel and interaction performance — 8 September 2026

Website-only update: a keyboard/pointer-accessible OKLCH hue wheel, live sRGB channel bars, and side-by-side desktop map/controls/six-format workbench. The wheel uses explicitly labeled fixed-L/C reference hues; its center shows the authored color. Gamut rasterization runs in a dedicated module worker with one active and one latest pending request, transferable pixel buffers, stale-result rejection, and an explicit unavailable-shading fallback. Offscreen lightness-chart work and closed lesson ramps are skipped. Pointer rectangles are measured at gesture start; live CSS color changes are scoped to the workbench, and preview transitions/decorative motion are removed.

Local verification: 63 tests pass, both TypeScript checks and lint pass, production/site builds pass. Chrome pointer drags and keyboard hue edits kept conversions linked; the map completed without console errors; 390px responsive check had no horizontal overflow. No measured FPS or universal speed-up claim. Existing extension version 2.1.0 and registry authentication status are unchanged. Historical distribution checks below retain their original dates.

Canonical product URL: <https://visualise-oklch.shreyam1008.com.np/>  
Repository: <https://github.com/shreyam1008/visualise-oklch>  
Last checked: 7 September 2026, UTC

| Channel | Version | Status | Evidence / next check |
| --- | --- | --- | --- |
| Git tag | v2.1.0 | **Live** | [v2.1.0](https://github.com/shreyam1008/visualise-oklch/tree/v2.1.0) points to commit `ce869e4`. |
| GitHub Release | v2.1.0 | **Live** | The [v2.1.0 release](https://github.com/shreyam1008/visualise-oklch/releases/tag/v2.1.0) includes the CI-built `visualise-oklch-2.1.0.vsix` (84,565 bytes). CI and release workflow succeeded. |
| Open VSX | Public listing | **Live** | The public [Open VSX listing](https://open-vsx.org/extension/shreyam1008/visualise-oklch) returned HTTP 200 without authentication. Confirm the displayed version after any future publish. |
| VS Code Marketplace | v2.0.5, publisher `shreyam1008` | **Live listing** | Owner uploaded the verified VSIX. The [listing](https://marketplace.visualstudio.com/items?itemName=shreyam1008.visualise-oklch) now shows the product, publisher, Free, and Install action. Browser verified 6 September 2026. |
| Custom product domain | 2.1.0 docs | **Live; verified 7 September 2026 UTC** | HTTPS returned 200 with the new Edit Color in OKLCH workflow; Pages deployment succeeded. |

## 2.1.0 store update

The release VSIX was verified and installed locally in VS Code as `shreyam1008.visualise-oklch@2.1.0`. Its SHA-256 is `6abcf4d57d79fd5408eb588c6f7c9d2b0afe3f73ccd853a02c054573dbefc6d9`.

Marketplace and Open VSX publisher dashboards are accessible, but uploading the new VSIX is pending: Chrome rejected local file selection because the browser extension lacks file-URL access. No registry tokens were configured in GitHub when checked. A successful GitHub workflow therefore does not establish publication to either registry; verify their public version after completing the uploads.

Do not promote a workflow artifact or local VSIX as a Marketplace release. Update this file only after checking the public listing while signed out.
# Website converter follow-up — 7 September 2026

The website now links editable OKLCH, HEX, RGB, HSL, HWB and Oklab fields, including alpha and copy actions. A cached fixed-C/H lightness sweep shows RGB curves, channel deltas and gamut-mapped samples. Color math is shared with the extension; the additional browser helper is 7.4 KB uncompressed, with no runtime dependency. This is website-only functionality, not a new extension version.

Browser verification covered all six editable inputs, alpha, incomplete values retaining the last valid color, keyboard lightness adjustment and rendered curve/table data. Technical SEO includes converter-focused metadata, canonical URL, truthful application schema, static explanatory content and sitemap date. Search indexing/ranking and publisher badges are not claimed.

Anonymous store checks and signed-in dashboards still report **2.0.5** for both registries. GitHub **2.1.0** remains the downloadable release. Missing repository publishing secrets and blocked browser local-file uploads remain unresolved. See PUBLISHING.md for the authentication audit; Git-only portfolio evidence lives in `shreyam1008/buggy/docs/projects/backlinks.md`.
# Open VSX published — 8 September 2026

- **Live:** Open VSX `shreyam1008.visualise-oklch` **2.1.0**. Anonymous `/api/shreyam1008/visualise-oklch/2.1.0` and refreshed `/latest` both returned 2.1.0; signed-in dashboard agrees.
- Evidence: https://github.com/shreyam1008/visualise-oklch/actions/runs/34187671875 . The workflow verified the GitHub release asset's SHA-256 and package identity before publishing those exact bytes.
- Automation: repository `OVSX_PAT` configured; exposed setup token revoked and replaced, older owner token untouched. No token values belong in this log. Published matching GitHub releases trigger Open VSX publishing; manual retry supports existing releases.
- Marketplace **2.0.5** remains pending; authentication is separate, and browser local-file upload still requires owner help. Website and GitHub VSIX 2.1.0 were already live.
# Marketplace and visual follow-up — 8 September 2026

Marketplace accepted the owner's 2.1.0 upload, displayed Verifying 2.1.0, then the anonymous public listing returned Version 2.1.0. Both stores now serve the GitHub-released version. Marketplace release automation still needs separately authorized Microsoft publisher authentication; the Azure account observed differed from the Marketplace account. No new Microsoft identity or token was created.

Website-only update: an interactive L/C gamut slice beside the current swatch, hue-dependent sRGB boundary, moving source/fallback markers, keyboard and pointer editing, Fit to sRGB, before/after lightness swatches, shaded comparison interval and readable RGB channel deltas. Inspired by the explanatory gamut views at https://oklch.com/; implemented with the project's own shared color math and cached Canvas/SVG, no 3D or chart dependency. Numeric out-of-map chroma is preserved and clearly labelled. This does not require a new VSIX version.
