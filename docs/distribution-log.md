# Visualise OKLCH distribution log

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
