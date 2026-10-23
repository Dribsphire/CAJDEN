#!/usr/bin/env node
// =========================================================
// Builds a ready-to-upload release of the CAJDEN website.
//
//   node deploy/build.mjs
//
// Output: deploy/releases/cajden-<date>-<commit>.zip (and the same folder unzipped)
// The zip's contents go straight into the live web root (public_html):
//   index.html, assets/, .htaccess        <- built React site
//   api/, includes/, config/, vendor/,    <- PHP backend
//   migrations/, scripts/, uploads/ (folders + .htaccess only, never photos)
// Secrets (.env, .env.local) and uploaded files are never included.
// =========================================================
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const frontend = join(root, 'frontend');
const backend = join(root, 'backend');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'pipe' }).toString().trim();
const step = msg => console.log(`\n▸ ${msg}`);
const fail = msg => { console.error(`\n✖ ${msg}`); process.exit(1); };

// ---------- pre-flight ----------
step('Checking the repository');
const commit = run('git rev-parse --short HEAD');
const dirty = run('git status --porcelain');
if (dirty && !process.argv.includes('--allow-dirty')) {
  fail(`There are uncommitted changes. Commit them first (or pass --allow-dirty):\n${dirty}`);
}

const prodEnv = join(frontend, '.env');
if (!existsSync(prodEnv)) fail('frontend/.env is missing. It must point VITE_API_BASE at the live API.');
const envText = readFileSync(prodEnv, 'utf8');
const apiBase = /^VITE_API_BASE=(.*)$/m.exec(envText)?.[1]?.trim();
if (!apiBase || /localhost|127\.0\.0\.1/.test(apiBase)) {
  fail(`frontend/.env has VITE_API_BASE=${apiBase || '(empty)'}; a release must use the live URL (e.g. https://infocajden.org/api).`);
}
console.log(`  commit ${commit}, API ${apiBase}`);
if (!existsSync(join(backend, 'vendor', 'autoload.php'))) fail('backend/vendor is missing. Run "composer install" in backend/.');

// ---------- build the site ----------
step('Building the React site (production mode)');
// Production mode reads frontend/.env and ignores .env.development.local.
execSync('npx vite build --mode production', { cwd: frontend, stdio: 'inherit' });

// ---------- assemble ----------
const stamp = new Date().toISOString().slice(0, 10);
const name = `cajden-${stamp}-${commit}`;
const releases = join(root, 'deploy', 'releases');
const out = join(releases, name);
step(`Assembling ${relative(root, out)}`);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

cpSync(join(frontend, 'dist'), out, { recursive: true });

const SECRET = /(^|[\\/])\.env(\..*)?$/;
for (const dir of ['api', 'includes', 'config', 'vendor', 'migrations', 'scripts']) {
  cpSync(join(backend, dir), join(out, dir), { recursive: true, filter: src => !SECRET.test(src) });
}
// Upload folders: structure and the no-scripts .htaccess only, never the photos themselves.
mkdirSync(join(out, 'uploads'), { recursive: true });
cpSync(join(backend, 'uploads', '.htaccess'), join(out, 'uploads', '.htaccess'));
for (const entry of readdirSync(join(backend, 'uploads'))) {
  if (statSync(join(backend, 'uploads', entry)).isDirectory()) {
    mkdirSync(join(out, 'uploads', entry), { recursive: true });
    writeFileSync(join(out, 'uploads', entry, '.gitkeep'), '');
  }
}
cpSync(join(backend, '.env.example'), join(out, 'env.example.txt')); // reference for the live .env

// Safety net: refuse to ship anything that looks like a secret.
const walk = dir => readdirSync(dir).flatMap(f => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const leaked = walk(out).filter(f => SECRET.test(f));
if (leaked.length) fail(`Secret files ended up in the release: ${leaked.map(f => relative(out, f)).join(', ')}`);

writeFileSync(join(out, 'release.json'), JSON.stringify({ name, commit, built: new Date().toISOString(), api: apiBase }, null, 2));

// ---------- zip ----------
step('Creating the zip');
const zip = join(releases, `${name}.zip`);
rmSync(zip, { force: true });
// bsdtar ships with Windows 10+ and macOS; -a picks zip from the extension. On Windows,
// call it by full path, because Git's GNU tar (which can't write zips) may come first in PATH.
if (process.platform === 'win32') {
  execSync(`"${join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')}" -a -c -f "${zip}" -C "${out}" .`, { stdio: 'inherit' });
} else {
  execSync(`cd "${out}" && zip -qr "${zip}" .`, { stdio: 'inherit', shell: '/bin/sh' });
}

const files = walk(out).length;
const mb = (statSync(zip).size / 1048576).toFixed(1);
console.log(`\n✔ Release ready: ${relative(root, zip)}  (${files} files, ${mb} MB)`);
console.log('  Next: follow deploy/DEPLOY.md to upload it.');
