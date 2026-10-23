#!/usr/bin/env node
// =========================================================
// Builds a deployment of the CAJDEN website OUTSIDE the project:
//
//   node tools/deploy.mjs                 (default output: C:\xampp\cajden-deploy)
//   node tools/deploy.mjs --out <folder>
//   node tools/deploy.mjs --allow-dirty   (build with uncommitted changes, for testing)
//
// The output folder is wiped and recreated on every run:
//   site.zip         the live web root (public_html): built site + PHP backend
//   site/            the same, unzipped
//   debug.php        deployment checker with a fresh secret key
//   GUIDE.md         step-by-step upload instructions for this release
//   env.example.txt  settings the live .env needs
// Secrets (.env files) and uploaded photos are never included.
// =========================================================
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const frontend = join(root, 'frontend');
const backend = join(root, 'backend');
const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const outDir = resolve(outArg !== -1 ? args[outArg + 1] : (process.platform === 'win32' ? 'C:\\xampp\\cajden-deploy' : join(root, '..', 'cajden-deploy')));

const run = cmd => execSync(cmd, { cwd: root, stdio: 'pipe' }).toString().trim();
const step = msg => console.log(`\n▸ ${msg}`);
const fail = msg => { console.error(`\n✖ ${msg}`); process.exit(1); };

// ---------- pre-flight ----------
step('Checking the project');
if (resolve(outDir).toLowerCase().startsWith(resolve(root).toLowerCase())) {
  fail(`The output folder must be outside the project (got ${outDir}), so it can never be committed.`);
}
const commit = run('git rev-parse --short HEAD');
const dirty = run('git status --porcelain');
if (dirty && !args.includes('--allow-dirty')) {
  fail(`There are uncommitted changes. Commit them first (or pass --allow-dirty):\n${dirty}`);
}
const prodEnv = join(frontend, '.env');
if (!existsSync(prodEnv)) fail('frontend/.env is missing. It must point VITE_API_BASE at the live API.');
const apiBase = /^VITE_API_BASE=(.*)$/m.exec(readFileSync(prodEnv, 'utf8'))?.[1]?.trim();
if (!apiBase || /localhost|127\.0\.0\.1/.test(apiBase)) {
  fail(`frontend/.env has VITE_API_BASE=${apiBase || '(empty)'}; a deployment must use the live URL (https://infocajden.org/api).`);
}
if (!existsSync(join(backend, 'vendor', 'autoload.php'))) fail('backend/vendor is missing. Run "composer install" in backend/.');
console.log(`  commit ${commit}${dirty ? ' (+ uncommitted changes)' : ''}, API ${apiBase}`);
console.log(`  output ${outDir}`);

// ---------- build the site ----------
step('Building the React site (production mode)');
// Production mode reads frontend/.env and ignores .env.development.local.
execSync('npx vite build --mode production', { cwd: frontend, stdio: 'inherit' });

// ---------- assemble ----------
const stamp = new Date().toISOString().slice(0, 10);
const name = `cajden-${stamp}-${commit}${dirty ? '-dirty' : ''}`;
const site = join(outDir, 'site');
step(`Assembling ${site}`);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(site, { recursive: true });

cpSync(join(frontend, 'dist'), site, { recursive: true });

const SECRET = /(^|[\\/])\.env(\..*)?$/;
for (const dir of ['api', 'includes', 'config', 'vendor', 'migrations', 'scripts']) {
  cpSync(join(backend, dir), join(site, dir), { recursive: true, filter: src => !SECRET.test(src) });
}
// Upload folders: structure and the no-scripts .htaccess only, never the photos themselves.
mkdirSync(join(site, 'uploads'), { recursive: true });
cpSync(join(backend, 'uploads', '.htaccess'), join(site, 'uploads', '.htaccess'));
for (const entry of readdirSync(join(backend, 'uploads'))) {
  if (statSync(join(backend, 'uploads', entry)).isDirectory()) {
    mkdirSync(join(site, 'uploads', entry), { recursive: true });
    writeFileSync(join(site, 'uploads', entry, '.gitkeep'), '');
  }
}
writeFileSync(join(site, 'release.json'), JSON.stringify({ name, commit, built: new Date().toISOString(), api: apiBase }, null, 2));

// Safety net: refuse to ship anything that looks like a secret.
const walk = dir => readdirSync(dir).flatMap(f => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const leaked = walk(site).filter(f => SECRET.test(f));
if (leaked.length) fail(`Secret files ended up in the release: ${leaked.map(f => relative(site, f)).join(', ')}`);

// ---------- checker, guide, settings reference ----------
step('Adding debug.php and GUIDE.md');
const debugKey = randomBytes(12).toString('hex');
const fill = text => text.replaceAll('__DEBUG_KEY__', debugKey).replaceAll('__RELEASE__', name);
writeFileSync(join(outDir, 'debug.php'), fill(readFileSync(join(root, 'tools', 'deploy', 'debug.php'), 'utf8')));
writeFileSync(join(outDir, 'GUIDE.md'), fill(readFileSync(join(root, 'tools', 'deploy', 'GUIDE.md'), 'utf8')));
cpSync(join(backend, '.env.example'), join(outDir, 'env.example.txt'));

// ---------- zip ----------
step('Creating site.zip');
const zip = join(outDir, 'site.zip');
// bsdtar ships with Windows 10+ and macOS; -a picks zip from the extension. On Windows,
// call it by full path, because Git's GNU tar (which can't write zips) may come first in PATH.
if (process.platform === 'win32') {
  execSync(`"${join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')}" -a -c -f "${zip}" -C "${site}" .`, { stdio: 'inherit' });
} else {
  execSync(`cd "${site}" && zip -qr "${zip}" .`, { stdio: 'inherit', shell: '/bin/sh' });
}

const files = walk(site).length;
const mb = (statSync(zip).size / 1048576).toFixed(1);
console.log(`\n✔ Deployment ready in ${outDir}`);
console.log(`  site.zip   ${files} files, ${mb} MB   (release ${name})`);
console.log(`  debug.php  https://infocajden.org/debug.php?key=${debugKey}&mail=1`);
console.log('  GUIDE.md   step-by-step upload instructions');
