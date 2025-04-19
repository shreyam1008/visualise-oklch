# Visualise OKLCH

Low-overhead inline OKLCH swatches for VS Code and Open VSX-compatible editors such as VSCodium, Cursor, and Windsurf.

This repository is a maintained fork of [SwiftlyDaniel/oklch-color-visualiser](https://github.com/SwiftlyDaniel/oklch-color-visualiser). Credit for the original extension idea and initial implementation belongs to SwiftlyDaniel.

Live site: [shreyam1008.github.io/visualise-oklch](https://shreyam1008.github.io/visualise-oklch/)

Open VSX: [shreyam1008.visualise-oklch](https://open-vsx.org/extension/shreyam1008/visualise-oklch)

## Why this fork exists

The original project was small and useful, but it had stopped moving. This fork rebuilds the core around a lighter decoration strategy, modern TypeScript validation, and a proper test/release pipeline.

## Highlights

- Shared decoration types per unique swatch instead of per-match allocation.
- Auto strategy for large files: full scans for smaller documents, padded visible-range scans for bigger ones.
- Zero runtime color dependency in the extension bundle.
- Typechecked with `typescript@rc` and the native preview `tsgo` path side-by-side.
- Tested with fixture-driven unit coverage for parsing, scanning, and integration cases.
- Ready for both VS Code Marketplace and [Open VSX](https://open-vsx.org/).

## Compatibility

- VS Code
- VSCodium
- Cursor
- Windsurf
- Open VSX consumers that support standard VS Code extensions

## Development

```bash
bun install
bun run verify
```

Useful commands:

- `bun run build`
- `bun run build:prod`
- `bun run test`
- `bun run coverage`
- `bun run typecheck`
- `bun run typecheck:compat`
- `bun run package`
- `bun run package:openvsx`

`bun run package` generates the VSIX artifact used by both VS Code Marketplace validation and Open VSX publishing.

## Testing

The repo has a real `tests/` folder and is meant to be teachable to maintainers.

- `bun run test` runs parser, scanner, strategy, integration, package, and docs checks.
- `bun run coverage` prints source coverage for the extension logic.
- `bun run verify` is the full gate: lint, `tsgo`, `tsc`, tests, and production bundle.

If you want to inspect or extend test cases, start in [tests/color.test.ts](/vsk/PM/visualise-oklch/tests/color.test.ts), [tests/integration.test.ts](/vsk/PM/visualise-oklch/tests/integration.test.ts), and [tests/docs.test.ts](/vsk/PM/visualise-oklch/tests/docs.test.ts).

## Settings

- `visualiseOklch.enabled`
- `visualiseOklch.fullScanMaxChars`
- `visualiseOklch.linePadding`
- `visualiseOklch.maxVisibleMatches`
- `visualiseOklch.updateDelayMs`

## Versioning and releases

This repo uses Changesets for version PRs and release bookkeeping.

1. Add a changeset with `bun run changeset`.
2. Merge the version PR created by the `Version Packages` workflow.
3. Push a version tag like `v2.0.1`, or create a GitHub release from that tag.
4. The `Publish Extension` workflow can run from either a pushed tag or a published GitHub release.
5. The workflow packages the VSIX, uploads it to the workflow run, and publishes to stores when `VSCE_PAT` and `OVSX_PAT` are configured.

For Open VSX publishing, the registry is [open-vsx.org](https://open-vsx.org/). You need an Open VSX namespace matching your chosen publisher plus an `OVSX_PAT` secret in GitHub Actions.

For VS Code Marketplace publishing, add a `VSCE_PAT` secret. Without that token, the repo can still package the VSIX and publish to Open VSX.

## Site

The project site lives in `docs/` and deploys to GitHub Pages with no build step. It is plain HTML/CSS/JS and includes:

- interactive OKLCH sliders and equivalent CSS outputs
- perceptual OKLCH vs HSL comparison ramps
- Open Graph and structured data metadata
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, and `.nojekyll`

## License

Apache 2.0. See [LICENSE](./LICENSE).
