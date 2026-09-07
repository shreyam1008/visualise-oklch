# Publishing And Listing Updates

This repo publishes the extension, the GitHub Pages site, and the Open VSX listing from the same source of truth.

## What controls what

- `icon.png`: extension/store icon used by the packaged extension and Open VSX.
- `README.md`: main listing content shown on Open VSX and GitHub.
- `package.json`: version, publisher, description, homepage, and packaged metadata.
- `docs/`: GitHub Pages site content; the workflow publishes it at the Pages root.
- `scripts/prepare-pages.mjs`: creates the root artifact and rewrites canonical metadata from `actions/configure-pages` output so legacy and custom-domain deployments stay valid.

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

4. Push `main`, create the matching `vX.Y.Z` tag, and publish a GitHub release from that tag:

```bash
git push origin main
git tag vX.Y.Z
git push origin vX.Y.Z
```

Publishing the GitHub release triggers the registry workflow once. It verifies that the release tag exactly matches `package.json`, packages the VSIX, attaches it to the release, and publishes only to registries whose repository token is configured. A manual workflow run packages an artifact but does not publish to either registry.

The `shreyam1008` Visual Studio Marketplace publisher exists. The signed-in web dashboard can upload the matching versioned VSIX directly; the unattended alternative is a Marketplace PAT stored as the repository `VSCE_PAT` secret. Open VSX automation separately needs `OVSX_PAT`. No repository registry secrets were configured when checked on 7 September 2026. Never commit or paste tokens into source or chat.

## Rollback

- A published extension version is immutable. Fix a bad release with a new patch version; do not reuse its tag or overwrite its VSIX.
- Keep the last known-good VSIX and changelog entry available from its GitHub release.
- For a website-only failure, follow `docs/domain-release.md` and restore the legacy Pages URL. Do not republish an old extension merely to roll back the website.

## Notes

- Open VSX listing refreshes only when a new extension version is published.
- If the icon on Open VSX still looks old, check that `package.json` points to `icon.png`, then publish a new version.
- GitHub Pages deploys automatically when site files on `main` change.
- Store updates are separate from a GitHub push. Installed clients receive newer store versions according to their extension auto-update settings, only after the version is published to the store they use.
- The custom domain is **live; verified 6 September 2026 UTC**. Re-run the checks in `docs/domain-release.md` after any Pages or DNS change.
