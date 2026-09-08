import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const canonicalUrl = 'https://visualise-oklch.shreyam1008.com.np/';
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const docsRoot = join(repoRoot, 'docs');
const outputRoot = join(repoRoot, 'site-dist');

const requestedUrl = new URL(process.argv[2] || canonicalUrl);
if (requestedUrl.protocol !== 'https:') {
  throw new Error('Pages base URL must use HTTPS.');
}
requestedUrl.search = '';
requestedUrl.hash = '';
requestedUrl.pathname = `${requestedUrl.pathname.replace(/\/$/, '')}/`;
const pagesUrl = requestedUrl.toString();

await rm(outputRoot, { recursive: true, force: true });
await cp(docsRoot, outputRoot, { recursive: true });

for (const relativePath of ['index.html', 'robots.txt', 'sitemap.xml', 'site.webmanifest', 'llms.txt']) {
  const outputPath = join(outputRoot, relativePath);
  const source = await readFile(outputPath, 'utf8');
  if (!source.includes(canonicalUrl)) {
    throw new Error(`${relativePath} does not contain the canonical URL token.`);
  }
  await writeFile(outputPath, source.replaceAll(canonicalUrl, pagesUrl));
}

console.log(`Prepared ${outputRoot} for ${pagesUrl}`);
