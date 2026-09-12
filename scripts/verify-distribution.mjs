import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

export function assertVersion(source, actual, expected) {
  if (!actual || actual !== expected) {
    throw new Error(`${source}: expected ${expected}, observed ${actual ?? 'missing version'}`);
  }
}

export function checkSite(html, expected, product) {
  const versions = [...html.matchAll(/"softwareVersion"\s*:\s*"([^"]+)"/g)].map(match => match[1]);
  if (versions.length === 0) throw new Error('site: missing softwareVersion');
  for (const version of versions) assertVersion('site softwareVersion', version, expected);
  const tags = [...html.matchAll(/\/releases\/tag\/v([^"\s<>]+)/g)].map(match => match[1]);
  if (tags.length === 0) throw new Error('site: missing release link');
  for (const tag of tags) assertVersion('site release link', tag, expected);
  const labels = [...html.matchAll(/\bv(\d+\.\d+\.\d+) release\b/g)].map(match => match[1]);
  if (labels.length === 0) throw new Error('site: missing visible release version');
  for (const label of labels) assertVersion('site visible release', label, expected);
  for (const channel of ['Open VSX', 'Visual Studio Marketplace']) {
    const store = product.distributions.find(item => item.channel === channel);
    if (!store || !html.includes(`href="${store.url}"`)) throw new Error(`site: missing ${channel} link`);
  }
}

export function marketplaceVersion(html) {
  // Read the listing's current-version field, never its README or version history.
  const values = [...html.matchAll(/"VersionValue"\s*:\s*"([^"]+)"/g)].map(match => match[1]);
  if (values.length !== 1) throw new Error('Marketplace: missing or ambiguous VersionValue');
  return values[0];
}

export async function verifyDistribution({ live = true, fetcher = fetch, records } = {}) {
  const pkg = JSON.parse(read('package.json'));
  const product = records ?? JSON.parse(read('product.json'));
  const expected = pkg.version;
  checkSite(read('docs/index.html'), expected, product);
  // Recorded public versions remain historical facts while a new release is prepared.
  if (!live) return;
  for (const channel of ['Product website', 'Git tag', 'Open VSX', 'Visual Studio Marketplace']) {
    const record = product.distributions.find(item => item.channel === channel);
    assertVersion(`product.json ${channel}`, record?.version, expected);
    if (record.status !== 'live') throw new Error(`${channel}: distribution record is not live`);
  }
  const tag = product.distributions.find(item => item.channel === 'Git tag');
  assertVersion('product.json release URL', tag.url.split('/releases/tag/v')[1], expected);
  const log = read('docs/distribution-log.md').split('## Historical entries')[0];
  for (const channel of ['Package', 'GitHub Release', 'Product website', 'Open VSX', 'VS Code Marketplace']) {
    const row = log.split('\n').find(line => line.startsWith(`| ${channel} |`));
    assertVersion(`distribution log ${channel}`, row?.split('|')[2]?.trim(), expected);
  }
  async function get(url, json = false) {
    const response = await fetcher(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'visualise-oklch-distribution-verifier' } });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return json ? response.json() : response.text();
  }
  const results = await Promise.allSettled([
    (async () => {
      const release = await get(`https://api.github.com/repos/${new URL(product.repository).pathname.slice(1)}/releases/latest`, true);
      assertVersion('GitHub latest release', release.tag_name, `v${expected}`);
      if (release.draft || release.prerelease || !release.assets?.some(asset => asset.name === `${pkg.name}-${expected}.vsix` && asset.size > 0)) {
        throw new Error('GitHub release: missing public stable VSIX asset');
      }
    })(),
    (async () => {
      const store = await get(`https://open-vsx.org/api/${pkg.publisher}/${pkg.name}/latest`, true);
      assertVersion('Open VSX latest', store.version, expected);
      if (store.name !== pkg.name || store.namespace !== pkg.publisher) throw new Error('Open VSX: unexpected extension identity');
    })(),
    (async () => {
      const listing = product.distributions.find(item => item.channel === 'Visual Studio Marketplace');
      assertVersion('Marketplace public listing', marketplaceVersion(await get(listing.url)), expected);
    })(),
    (async () => checkSite(await get(product.canonicalUrl), expected, product))(),
  ]);
  const failures = results.filter(result => result.status === 'rejected');
  if (failures.length > 0) throw new AggregateError(failures.map(result => result.reason), failures.map(result => result.reason.message).join('\n'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await verifyDistribution({ live: !process.argv.includes('--local') });
    console.log(`Distribution verification passed (${process.argv.includes('--local') ? 'local records' : 'local records and all public channels'}).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
