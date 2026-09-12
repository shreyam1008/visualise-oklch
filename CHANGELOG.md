# Changelog

All notable changes to this project will be documented in this file.

## 2.1.1

- Discover the custom OKLCH editor directly from a color hover using Open OKLCH picker. The action targets the hovered color and rejects stale links.
- Show two actual editor screenshots, package size, and a 24-color JSON example prominently in the extension listing.
- Remove the legacy screenshot and clarify native hover versus custom OKLCH controls.

## 2.1.0

- Added an on-demand OKLCH editor with independent L/C/H/alpha controls, lightness/chroma plane, sRGB gamut boundary, and optional Fit to sRGB.
- Keep wide-gamut source channels and missing components when unchanged or editing other channels; prevent native-picker opening and alpha-only edits from losing original chroma.
- Correct CSS chroma percentages (100% = 0.4), clamp bare lightness to 0–1, and reject comma-separated colors and empty alpha values.
- Preview at animation-frame cadence with cached plane rendering; Apply creates one undoable edit and checks for intervening document changes.
- Cache repeated literals during document color scans and keep extreme-chroma gamut mapping bounded.
- Exclude generated website files from the VSIX and support literal editing in restricted and virtual workspaces without executing workspace code.
- Clarified release triggers and separate Marketplace/Open VSX publishing requirements.

## 2.0.5

- Fixed duplicate swatches after native picker support by deferring to the editor's built-in color decorators when they are enabled.
- Kept the custom decoration path only as a fallback when native color decorators are turned off.

## 2.0.4

- Added native editor color picker support for OKLCH literals with OKLCH-first, hex, rgb, and hsl write-back presentations.
- Documented the picker workflow in the README and public site.
- Published the updated package so Open VSX reflects the new editing capability.

## 2.0.3

- Refined the public-facing copy so the extension, docs, and listing read as the actively maintained Visualise OKLCH project.
- Added release/update documentation for refreshing the site, store listing, icon, and Open VSX publish flow.
- Prepared a fresh Open VSX package so the updated logo and README listing copy can roll out together.

## 2.0.2

- Replaced the public brand with a new chromatic spiral logo and updated the extension/store icon assets.
- Turned the GitHub Pages site into a more animated, art-directed interactive color experience.
- Tightened README copy and refreshed public-facing docs/tests around the new site and assets.

## 2.0.1

- Rebuilt the GitHub Pages site into an interactive OKLCH explainer with live sliders, equivalence outputs, and stronger SEO assets.
- Added crawler assets and docs coverage for the public site.
- Improved release guidance and workflow triggers for tag-based publishing.

## 2.0.0

- Rebuilt the extension around shared decoration pools and lightweight OKLCH parsing.
- Added configurable large-file scanning, caching, test coverage, and release automation.
- Added GitHub Pages support, Open VSX publishing guidance, and project attribution for the original fork.
