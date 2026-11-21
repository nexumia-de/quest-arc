// Builds the standalone app (#93, a spike) into dist/app/: static files
// for any web server. app.js bundles the engine, the shared adapter and
// screens, the journeys and the ladders' pictures; app.css is the theme
// (light and dark after the system), the shared style and the app's
// own; sw.js is the service worker with the list of all files; _headers
// sets the cache headers on Cloudflare (docs/pwa-release.md). The files
// are relative to the page, so the app runs at a domain's root or under
// any path.
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { build, transform } from 'esbuild';
import { esbuildLadderArt } from '../ui/art.mjs';
import { esbuildJourneys } from '../ui/journeys.mjs';

const out = join('dist', 'app');
rmSync('dist', { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const common = { bundle: true, format: 'iife', target: 'es2022', legalComments: 'none' };

await build({
  ...common,
  entryPoints: ['src/main.ts'],
  outfile: join(out, 'app.js'),
  minify: true,
  plugins: [esbuildJourneys, esbuildLadderArt],
});

// The theme variables Super Productivity sets in plugin views, which the
// screens' style reads; the plugin's preview has them too (packages/ui/src/ui/theme.ts).
const theme = await build({
  entryPoints: [join('..', 'ui', 'src', 'ui', 'theme.ts')],
  bundle: true,
  format: 'esm',
  write: false,
});
const { themeCss } = await import(
  `data:text/javascript;base64,${Buffer.from(theme.outputFiles[0].text).toString('base64')}`
);
// Light and dark follow the system; `data-theme` on the root, the user's
// choice on the Data screen (src/preferences.ts), comes after and wins.
const chosen = (mode) =>
  `${themeCss(mode).replace(':root', `:root[data-theme="${mode}"]`)}` +
  `:root[data-theme="${mode}"]{color-scheme:${mode}}`;
const style = [
  themeCss('light'),
  `@media (prefers-color-scheme: dark){${themeCss('dark')}}`,
  chosen('light'),
  chosen('dark'),
  readFileSync(join('..', 'ui', 'src', 'ui', 'start.css'), 'utf8'),
  readFileSync(join('..', 'ui', 'src', 'ui', 'style.css'), 'utf8'),
  readFileSync(join('src', 'app.css'), 'utf8'),
].join('\n');
const { code: css } = await transform(style, { loader: 'css', minify: true });
writeFileSync(join(out, 'app.css'), css);

// The page, the manifest and its icons (the PNGs come from npm run icons).
for (const file of readdirSync('src')) {
  if (/\.(html|webmanifest|svg|png)$/.test(file)) copyFileSync(join('src', file), join(out, file));
}

// The service worker keeps every file of the build, read from the folder
// so none is missed; the cache is named after the version and the files'
// content, so a changed build replaces it.
const files = readdirSync(out).sort();
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const hash = createHash('sha256');
for (const file of files) hash.update(file).update(readFileSync(join(out, file)));
await build({
  ...common,
  entryPoints: ['src/sw.ts'],
  outfile: join(out, 'sw.js'),
  minify: true,
  define: {
    APP_FILES: JSON.stringify(['./', ...files]),
    APP_CACHE: JSON.stringify(`questarc-${version}-${hash.digest('hex').slice(0, 16)}`),
  },
});

// Read by Cloudflare, not served, so not in the service worker's list.
copyFileSync(join('src', '_headers'), join(out, '_headers'));

let total = 0;
for (const file of [...files, 'sw.js']) {
  const { size } = statSync(join(out, file));
  total += size;
  console.log(`${String(size).padStart(8)}  ${file}`);
}
console.log(`${String(total).padStart(8)}  bytes in ${out}`);
