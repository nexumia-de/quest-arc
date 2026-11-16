// Serves the built app (dist/app) on localhost for the walk, and opens
// the browser for the e2e scripts. Uses the Playwright of the environment;
// QUESTARC_CHROMIUM names another Chromium binary where Playwright's own
// is not installed (docs/development.md, cloud environment).
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Starts the server on a free port; returns its URL and how to stop it.
 * `base` serves the app under a path instead of the root. Like Cloudflare,
 * it does not serve _headers.
 */
export const serve = async (dir = resolve('dist', 'app'), { base = '/' } = {}) => {
  const server = createServer(async (request, response) => {
    const full = normalize(new URL(request.url, 'http://localhost').pathname);
    if (!full.startsWith(base) || full.endsWith('/_headers')) {
      response.writeHead(404).end();
      return;
    }
    const path = `/${full.slice(base.length)}`;
    const file = join(dir, path.endsWith('/') ? `${path}index.html` : path);
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'text/plain' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    url: `http://localhost:${server.address().port}${base}`,
    close: () => new Promise((done) => server.close(done)),
  };
};

const binary = () =>
  process.env.QUESTARC_CHROMIUM ? { executablePath: process.env.QUESTARC_CHROMIUM } : {};

/** A browser; `proxy` sends it through HTTPS_PROXY (for the live web app). */
export const launch = ({ proxy = false } = {}) =>
  chromium.launch({
    ...binary(),
    ...(proxy && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
  });

/**
 * A browser context with a profile in `profile`, not incognito: only
 * there does the browser offer to install an app.
 */
export const launchProfile = (profile, options = {}) =>
  chromium.launchPersistentContext(profile, { ...binary(), ...options });

export const expect = (ok, what) => {
  if (!ok) throw new Error(`Failed: ${what}`);
  console.log(`ok: ${what}`);
};
