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
# Authentication audit — 7 September 2026

To finish or retry an already-published release, run **Publish Released VSIX to Store** from Actions with `release_tag=v2.1.0` and either `marketplace` or `openvsx`. It requires that registry's configured secret, downloads the existing GitHub release asset, checks its GitHub SHA-256 digest and package identity/version, and publishes those exact bytes. It never rebuilds or replaces the release asset. Duplicate versions are skipped; check the public listing after registry validation. This workflow is committed but not authenticated until the owner authorizes the required secret setup.

Both public registries currently serve 2.0.5; GitHub has released 2.1.0. Repository publishing secrets are not configured. Release jobs now upload the same built VSIX to each authenticated registry and explicitly warn if authentication is absent. A green artifact build is not a successful store publication.

For future unattended publishing, authorize a publisher identity once, then publish matching GitHub releases. Do not publish every main commit. Microsoft now recommends [Entra workload identity publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace); global Azure DevOps PATs retire on 1 December 2026. Tenant/identity setup and publisher membership are owner-controlled prerequisites, not configured here. The existing VSCE_PAT lane is a transitional option, not the long-term recommendation.

Open VSX [merged trusted publishing support](https://github.com/eclipse-openvsx/openvsx/pull/2000) on 21 August 2026. The live signed-in settings inspected on 7 September did not expose a Trusted Publishers tab; merged server code is not proof this account can use the feature. Confirm production availability and narrowly bind repository/workflow/extension before replacing the existing OVSX_PAT lane. Never store tokens in Git or this document.
# Current status — 8 September 2026

Open VSX 2.1.0 is live, confirmed by the anonymous version/latest API and publisher dashboard. `OVSX_PAT` is configured as a GitHub Actions repository secret; the superseded setup token was revoked. The [verified-release publishing run](https://github.com/shreyam1008/visualise-oklch/actions/runs/34187671875) succeeded. Future published matching GitHub releases now have Open VSX authentication, and the manual retry workflow can publish an existing release asset.

Marketplace 2.1.0 is also live after owner upload and Microsoft validation, confirmed from its anonymous public listing on 8 September. Marketplace automation remains pending: no `VSCE_PAT` or federated publisher identity is configured. The earlier authentication audit below is historical; store versions are now aligned, but authentication is configured only for Open VSX.
