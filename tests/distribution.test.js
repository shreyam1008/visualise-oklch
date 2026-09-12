import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { assertVersion, checkSite, marketplaceVersion, verifyDistribution } from '../scripts/verify-distribution.mjs';

const product = JSON.parse(readFileSync(new URL('../product.json', import.meta.url), 'utf8'));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const site = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const version = pkg.version;
const records = { ...product, distributions: product.distributions.map(item => ({ ...item, status: 'live' })) };

function fixtureFetch(overrides = {}) {
  return url => {
    let body;
    if (url.includes('api.github.com')) body = { tag_name: `v${version}`, assets: [{ name: `${pkg.name}-${version}.vsix`, size: 1 }], ...overrides.github };
    else if (url.includes('open-vsx.org')) body = { version, name: pkg.name, namespace: pkg.publisher, ...overrides.ovsx };
    else if (url.includes('marketplace.visualstudio.com')) body = overrides.marketplace ?? `{"VersionValue":"${version}"}`;
    else body = overrides.site ?? site;
    return new Response(typeof body === 'string' ? body : JSON.stringify(body));
  };
}

test('local records and agreeing public channels pass', async () => {
  await verifyDistribution({ fetcher: fixtureFetch(), records });
});

for (const [source, overrides] of Object.entries({
  GitHub: { github: { tag_name: 'v0.0.0' } },
  VSIX: { github: { assets: [] } },
  OpenVSX: { ovsx: { version: '0.0.0' } },
  Marketplace: { marketplace: '{"VersionValue":"0.0.0"}' },
  site: { site: site.replaceAll(`"softwareVersion": "${version}"`, '"softwareVersion": "0.0.0"') },
})) {
  test(`${source} drift fails verification`, async () => {
    await expect(verifyDistribution({ fetcher: fixtureFetch(overrides), records })).rejects.toThrow();
  });
}

test('missing evidence and HTTP errors fail closed', async () => {
  expect(() => assertVersion('package', undefined, version)).toThrow();
  expect(() => marketplaceVersion('<html>Install 2.1.0</html>')).toThrow();
  await expect(verifyDistribution({ fetcher: () => new Response('unavailable', { status: 503 }), records })).rejects.toThrow('HTTP 503');
});

test('Marketplace version history cannot mask current version drift', () => {
  expect(marketplaceVersion('{"VersionValue":"0.0.0","Versions":[{"version":"2.1.0"}]}')).toBe('0.0.0');
});

test('site visible version, release URL and store links must agree', () => {
  expect(() => checkSite(site.replaceAll(`/releases/tag/v${version}`, '/releases/tag/v0.0.0'), version, product)).toThrow();
  expect(() => checkSite(site.replace(`v${version} release`, 'v0.0.0 release'), version, product)).toThrow();
  expect(() => checkSite(site.replaceAll('href="https://marketplace.visualstudio.com', 'href="https://invalid.example'), version, product)).toThrow();
});
