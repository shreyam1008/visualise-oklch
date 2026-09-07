# Visualise OKLCH

Public product metadata and release state are recorded in [`product.json`](product.json) and [`docs/distribution-log.md`](docs/distribution-log.md).

Low-overhead inline OKLCH swatches for VS Code and Open VSX-compatible editors such as VSCodium, Cursor, and Windsurf.

Built and maintained by [Shreyam Adhikari](https://shreyam1008.com.np) ([`shreyam1008`](https://github.com/shreyam1008)).

Canonical site (live; verified 6 September 2026 UTC): [visualise-oklch.shreyam1008.com.np](https://visualise-oklch.shreyam1008.com.np/)

Open VSX: [shreyam1008.visualise-oklch](https://open-vsx.org/extension/shreyam1008/visualise-oklch)

VS Code Marketplace: [Install Visualise OKLCH](https://marketplace.visualstudio.com/items?itemName=shreyam1008.visualise-oklch)

All install links and publication status: [distribution tracker](https://shreyam1008.com.np/projects/#distribution-visualise-oklch).

## Why this exists

Visualise OKLCH focuses on one job: render OKLCH inline previews with almost no editor overhead while staying small, modern, and easy to maintain. The current codebase is built around pooled decorations, bounded scanning, fast Bun-based verification, and a simple release pipeline.

## Highlights

- Shared decoration types per unique swatch instead of per-match allocation.
- Auto strategy for large files: full scans for smaller documents, padded visible-range scans for bigger ones.
- Zero runtime color dependency in the extension bundle.
- Native editor color picker support with OKLCH-first write-back plus hex, rgb, and hsl presentation options.
- On-demand OKLCH editor with lightness/chroma plane, independent L/C/H/alpha controls, and a marked sRGB gamut boundary.
- Typechecked with `typescript@rc` and the native preview `tsgo` path side-by-side.
- Tested with fixture-driven unit coverage for parsing, scanning, and integration cases.
- Ready for both VS Code Marketplace and [Open VSX](https://open-vsx.org/).

## Compatibility

- VS Code
- VSCodium
- Cursor
- Windsurf
- Open VSX consumers that support standard VS Code extensions

## Editing colors

For direct OKLCH editing, place the cursor inside a color and run **Visualise OKLCH: Edit Color in OKLCH** from the command palette or editor right-click menu.

- Adjust L, C, H, and alpha independently with sliders, number fields, or the lightness/chroma plane.
- Stripes mark colors outside sRGB. **Fit to sRGB** reduces chroma at the current lightness and hue; it is optional. Chroma is not limited to 0.4: type larger values in the number field when needed.
- **Apply color** writes one undoable edit. Previewing or closing the panel does not modify your file. Save the file normally afterward.
- The picker opens only on demand. Rendering stays in the webview, is coalesced to animation frames, and does not send document edits while dragging.
- If the document changes while the picker is open, reopen the picker before applying, so it cannot overwrite another edit.

Hover or click the editor color decorator on an OKLCH literal to open the native color picker.

- The first write-back option stays in normalized `oklch(...)`.
- Traditional `hex`, `rgb(...)`, and `hsl(...)` presentations are also offered.
- Choosing a presentation writes the selected color directly back into your document.
- When native editor color decorators are enabled, Visualise OKLCH defers to that built-in path so you only see one swatch.

The built-in popup uses sRGB/HSV controls; its hue and saturation are not OKLCH H and C. VS Code's public color-provider API supplies RGBA values and text presentations, not custom popup axes. Unchanged colors and alpha-only edits preserve the original OKLCH channels; other native-picker edits convert from sRGB. Use the OKLCH editor to retain independent channels and out-of-sRGB chroma.

Literal parsing follows the CSS ranges: L uses 0–1 or 0–100%; C uses numbers or percentages where 100% means 0.4; H uses degrees or angle units. Comma-separated OKLCH is invalid. Literal `none` components are preserved when another channel changes. Context-dependent expressions such as `var()`, `calc()`, and relative colors are not evaluated. Previews use conservative constant-lightness, constant-hue chroma reduction into sRGB; they are not a browser- or monitor-specific wide-gamut simulation.

References: [CSS Color 4 OKLCH definition](https://www.w3.org/TR/css-color-4/#specifying-oklab-oklch), [VS Code color API](https://code.visualstudio.com/api/references/vscode-api#DocumentColorProvider).

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

If you want to inspect or extend test cases, start in [`tests/color.test.ts`](https://github.com/shreyam1008/visualise-oklch/blob/main/tests/color.test.ts), [`tests/integration.test.ts`](https://github.com/shreyam1008/visualise-oklch/blob/main/tests/integration.test.ts), and [`tests/docs.test.ts`](https://github.com/shreyam1008/visualise-oklch/blob/main/tests/docs.test.ts).

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
3. Push a matching version tag and publish a GitHub release from that tag.
4. The `Publish Extension` workflow runs on a published GitHub release. A tag push alone does not publish. A manual run only builds an artifact.
5. The workflow packages the VSIX, attaches it to the release, and publishes to stores only when their respective `VSCE_PAT` and `OVSX_PAT` secrets are configured. A GitHub push alone never updates a store listing.

For Open VSX publishing, the registry is [open-vsx.org](https://open-vsx.org/). You need an Open VSX namespace matching your chosen publisher plus an `OVSX_PAT` secret in GitHub Actions.

For VS Code Marketplace publishing, add a `VSCE_PAT` secret. Without that token, the repo can still package the VSIX and publish to Open VSX.

For the exact listing/icon/site refresh workflow, see [PUBLISHING.md](https://github.com/shreyam1008/visualise-oklch/blob/main/PUBLISHING.md).

Domain migration and public distribution status are tracked in [docs/domain-release.md](docs/domain-release.md) and [docs/distribution-log.md](docs/distribution-log.md).

## Credit

Visualise OKLCH builds on the original idea introduced in [SwiftlyDaniel/oklch-color-visualiser](https://github.com/SwiftlyDaniel/oklch-color-visualiser). That original project is credited here and in the site footer, while this repository continues the implementation, release flow, docs, and maintenance under `shreyam1008`.

## License

Apache 2.0. See [LICENSE](./LICENSE).
