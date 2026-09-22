/* ════════════════════════════════════════════════════════════════════
   Builds the German résumé PDF (Aman_Bhatt_Lebenslauf_DE.pdf) from the
   `resume` block in content.json, with the `de.resume` overlay applied.
   Edit the text in content.json (or the developer console), then:

       node tools/build-resume-de.mjs

   Chromium is located via PLAYWRIGHT_BROWSERS_PATH, CHROME_BIN, or the
   usual system paths. Pass --html to only emit the intermediate HTML.
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'Aman_Bhatt_Lebenslauf_DE.pdf');

/* ── merge the de overlay over the English résumé (same rules as the site) ── */
function merge(base, over) {
  if (Array.isArray(base)) {
    if (!Array.isArray(over)) return base;
    return base.map((v, i) => (i < over.length ? merge(v, over[i]) : v));
  }
  if (base && typeof base === 'object') {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return base;
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
    return out;
  }
  return over === undefined ? base : over;
}

const content = JSON.parse(readFileSync(join(ROOT, 'content.json'), 'utf8'));
const r = merge(content.resume || {}, content.de?.resume || {});
const L = r.labels || {};
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const strip = u => String(u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

const c = r.contact || {};
const contactLine = [
  c.email, c.phone, c.location,
  c.linkedin && strip(c.linkedin),
  c.github && strip(c.github),
].filter(Boolean);

const section = (title, body) =>
  `<section><h2>${esc(title)}</h2>${body}</section>`;

const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${esc(L.document || 'Lebenslauf')} — ${esc(r.name || '')}</title>
<style>
  @page { size: A4; margin: 11mm 13mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 9.1pt; line-height: 1.36; color: #14161f;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  header { border-bottom: 1.6pt solid #4f46e5; padding-bottom: 6pt; margin-bottom: 10pt; }
  .doc { font-size: 7.6pt; letter-spacing: .16em; text-transform: uppercase; color: #4f46e5; font-weight: 700; }
  h1 { font-size: 19.5pt; margin: 2pt 0 1pt; letter-spacing: -.01em; }
  .role { font-size: 10.6pt; color: #454b60; font-weight: 500; }
  .contact { margin-top: 6pt; font-size: 8.5pt; color: #454b60; }
  .contact span:not(:last-child)::after { content: "  ·  "; color: #a9adbe; }
  section { margin-bottom: 9pt; }
  h2 {
    font-size: 8.4pt; letter-spacing: .13em; text-transform: uppercase;
    color: #4f46e5; margin: 0 0 6pt; padding-bottom: 3pt;
    border-bottom: .6pt solid #dfe1ec;
  }
  .sum { margin: 0; color: #2b2f3e; }
  .job { margin-bottom: 7.5pt; page-break-inside: avoid; }
  .job:last-child { margin-bottom: 0; }
  .job-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
  .job-role { font-weight: 700; font-size: 10pt; }
  .job-date { font-size: 8.4pt; color: #5c6178; white-space: nowrap; }
  .job-org { font-size: 9.2pt; color: #4f46e5; font-weight: 600; }
  .job-loc { font-size: 8.4pt; color: #6b7089; }
  ul { margin: 4pt 0 0; padding-left: 12pt; }
  li { margin-bottom: 2pt; }
  li::marker { color: #4f46e5; }
  .skill { display: flex; gap: 7pt; margin-bottom: 3.5pt; }
  .skill b { flex: 0 0 34%; font-size: 9pt; }
  .skill span { color: #2b2f3e; }
</style>
</head>
<body>
<header>
  <div class="doc">${esc(L.document || 'Lebenslauf')}</div>
  <h1>${esc(r.name || '')}</h1>
  <div class="role">${esc(r.title || '')}</div>
  <div class="contact">${contactLine.map(v => `<span>${esc(v)}</span>`).join('')}</div>
</header>

${r.summary ? section(L.summary || 'Profil', `<p class="sum">${esc(r.summary)}</p>`) : ''}

${(r.experience || []).length ? section(L.experience || 'Berufserfahrung',
  (r.experience || []).map(j => `
  <div class="job">
    <div class="job-top">
      <div class="job-role">${esc(j.role)}</div>
      <div class="job-date">${esc(j.date)}</div>
    </div>
    <div class="job-org">${esc(j.org)}${j.location ? ` <span class="job-loc">· ${esc(j.location)}</span>` : ''}</div>
    ${(j.bullets || []).length ? `<ul>${j.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
  </div>`).join('')) : ''}

${(r.education || []).length ? section(L.education || 'Ausbildung',
  (r.education || []).map(e => `
  <div class="job">
    <div class="job-top">
      <div class="job-role">${esc(e.degree)}</div>
      <div class="job-date">${esc(e.date)}</div>
    </div>
    <div class="job-org">${esc(e.org)}</div>
    ${e.detail ? `<ul><li>${esc(e.detail)}</li></ul>` : ''}
  </div>`).join('')) : ''}

${(r.skills || []).length ? section(L.skills || 'Kenntnisse',
  (r.skills || []).map(s => `
  <div class="skill"><b>${esc(s.category)}</b><span>${(s.items || []).map(esc).join(' · ')}</span></div>`).join('')) : ''}
</body>
</html>`;

const htmlPath = join(tmpdir(), `lebenslauf-${process.pid}.html`);
writeFileSync(htmlPath, html, 'utf8');

if (process.argv.includes('--html')) {
  const dest = join(ROOT, 'tools', 'lebenslauf.preview.html');
  writeFileSync(dest, html, 'utf8');
  console.log(`HTML written to ${dest}`);
  process.exit(0);
}

/* ── locate Chromium ── */
function findChromium() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const pw = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (pw && existsSync(pw)) {
    for (const d of readdirSync(pw)) {
      if (!d.startsWith('chromium')) continue;
      for (const rel of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = join(pw, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
                   '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) {
    if (existsSync(p)) return p;
  }
  return null;
}

const chrome = findChromium();
if (!chrome) {
  console.error('Chromium not found. Set CHROME_BIN, or run with --html and print the page to PDF yourself.');
  process.exit(1);
}

const profile = join(tmpdir(), `cr-profile-${process.pid}`);
execFileSync(chrome, [
  '--headless', '--disable-gpu', '--no-sandbox',
  `--user-data-dir=${profile}`,
  '--no-pdf-header-footer',
  `--print-to-pdf=${OUT}`,
  `file://${htmlPath}`,
], { stdio: 'inherit' });
rmSync(profile, { recursive: true, force: true });
rmSync(htmlPath, { force: true });
console.log(`Wrote ${OUT}`);
