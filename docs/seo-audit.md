# Search and machine-readable discovery audit — 8 September 2026

## Fallback, CIELCH and editor-image follow-up

Added static explanations and live original/fallback previews with alpha, chroma-change readout and CSS fallback declarations. CIELCH is a read-only D50 representation of the tool's mapped sRGB color, not interchangeable OKLCH coordinates or an additional editable input. Added red/neutral/alpha conversion checks: 66 tests pass. The site build copies the repository's genuine older inline-swatch screenshot, explicitly captioned pre-2.0.5, with intrinsic dimensions and lazy loading; a current 2.1.0 panel capture remains unavailable. Browser check confirmed C 0.4 maps to about 0.1928 for L 70%, H 150°, preserving alpha 50%; 390px layout had no horizontal overflow and no console errors. Existing tutorial paragraphs are preserved.

Canonical site: https://visualise-oklch.shreyam1008.com.np/

## Scope and evidence

- Existing visible headings and tutorial paragraphs preserved. Only additive UI context and metadata changed in this update.
- Description covers the actual OKLCH extension, color theory, interactive practical tutorial and conversion tool without unrelated keywords.
- Existing canonical, robots allow rule, sitemap, Search Console verification token, social metadata and static explanatory HTML retained. A verification token alone does not establish indexing or owner access.
- JSON-LD distinguishes WebSite, the free SoftwareApplication extension, the browser WebApplication converter, and a WebPage/LearningResource with real section links. No reviews, ratings, publisher badges, Course/FAQ rich-result claims or invented credentials.
- Optional llms.txt provides public navigation, repository/store links, conversion limitations and clear local-processing behavior. This is a tool-readable guide, not a Google ranking mechanism.
- Known follow-ups: existing social preview is SVG; cross-platform preview support is not verified. Search Console indexing, query performance, AI-feature eligibility/settings and actual AI citations have not been checked in this update. No traffic, ranking, rich-result or performance-score improvement is claimed.

## UX and performance

The lightness experiment carries the current authored OKLCH swatch/value and a return link to the hue/chroma picker. Existing explanatory copy remains unchanged. One bounded decorative glow follows chroma-mapped sRGB color and lightness, at most once per 120ms, with a 700ms CSS easing transition. It does not change text or panel contrast tokens and is not a color-accuracy reference. It has an off switch, skips hidden-page updates and disables transitions for reduced motion. There is no continuous animation loop or additional runtime dependency.

Local verification: 64 tests, lint and both type checks passed; browser showed L 80% synchronized between picker, experiment and glow. Ambient toggle preserved the selected color. Desktop screenshot reviewed; 390px layout had no horizontal overflow or console errors.

## Primary references consulted

- [Google Search guidance for generative AI](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): technical and content fundamentals remain relevant; no special AI schema or llms.txt is required, and indexing is not guaranteed.
- [CSS Color 4](https://www.w3.org/TR/css-color-4/): OKLCH lightness/chroma/hue definitions and gamut distinctions. Decorative color interpolation is not represented as a scientific measurement.
