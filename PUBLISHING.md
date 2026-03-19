# Publishing And Listing Updates

This repo publishes the extension, the GitHub Pages site, and the Open VSX listing from the same source of truth.

## What controls what

- `icon.png`: extension/store icon used by the packaged extension and Open VSX.
- `README.md`: main listing content shown on Open VSX and GitHub.
- `package.json`: version, publisher, description, homepage, and packaged metadata.
- `docs/`: GitHub Pages site content.

## Standard update flow

1. Update the public assets and copy:
   - refresh `icon.png` if the store icon changes
   - update `README.md` for listing text
   - update `docs/` if the website changes
   - bump `package.json` version
   - add a short entry to `CHANGELOG.md`
2. Run verification:

```bash
bun run verify
bun run coverage
```

3. Build a local package:

```bash
bunx @vscode/vsce package --no-dependencies --out visualise-oklch-$(node -p "require('./package.json').version").vsix
```

4. Publish to Open VSX:

```bash
OVSX_PAT=your_token_here bunx ovsx publish --no-dependencies
```

5. Push `main`, then push a version tag if you want the release workflow to package artifacts for GitHub:

```bash
git push origin main
git tag vX.Y.Z
git push origin vX.Y.Z
```

## Notes

- Open VSX listing refreshes only when a new extension version is published.
- If the icon on Open VSX still looks old, check that `package.json` points to `icon.png`, then publish a new version.
- GitHub Pages deploys automatically from `main`.
