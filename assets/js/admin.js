/* ════════════════════════════════════════════════════════════════════
   Developer Console — edits content.json and the resume PDF in the
   GitHub repo through the GitHub REST API, straight from the browser.
   Auth = a fine-grained personal access token with Contents read/write
   on this repository. Nothing here can be changed without it.
   ════════════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const OWNER = 'amanbhatt97';
const REPO  = 'portfolio';
const CONTENT_PATH = 'content.json';
const API = 'https://api.github.com';

const TOKEN_KEY  = 'pfa_token';
const BRANCH_KEY = 'pfa_branch';
const draftKey = () => `pfa_draft:${state.branch}`;

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const icon = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"></use></svg>`;

const state = {
  token: null, branch: 'main', user: null,
  doc: null, remoteStr: null, sha: null,
  dirty: false, busy: false, images: [],
};

/* ── Live preview bridge ───────────────────────────────────────────────
   The #previewFrame iframe loads index.html?preview=1 and re-renders from
   the in-memory draft on every edit, so you see the real site update live. */
const PREVIEW_ANCHOR = {           // console section → on-page section id
  hero: 'home', social: 'contact', about: 'about', skills: 'skills',
  experience: 'experience', projects: 'projects', cta: 'hire',
  contact: 'contact', site: 'home', resume: 'home',
};
let previewReady = false, previewTimer = 0;
const previewFrame = () => $('#previewFrame');
function previewPost(msg) {
  const f = previewFrame();
  if (f && f.contentWindow) { try { f.contentWindow.postMessage(msg, '*'); } catch (_) {} }
}
function pushPreview(now) {
  if (!previewReady || !state.doc) return;
  clearTimeout(previewTimer);
  const send = () => previewPost({ type: 'pf-preview', content: state.doc });
  if (now) send(); else previewTimer = setTimeout(send, 140);
}
function previewScrollTo(sectionId) {
  const anchor = PREVIEW_ANCHOR[sectionId];
  if (previewReady && anchor) previewPost({ type: 'pf-scroll', section: anchor });
}
function previewSetTheme(t) { if (previewReady) previewPost({ type: 'pf-theme', theme: t }); }
addEventListener('message', e => {
  if ((e.data || {}).type === 'pf-ready') { previewReady = true; pushPreview(true); }
});

/* ── Theme ─────────────────────────────────────────────────────────── */
const root = document.documentElement;
const setTheme = t => {
  root.setAttribute('data-theme', t);
  $('#themeIcon use')?.setAttribute('href', t === 'dark' ? '#i-moon' : '#i-sun');
  try { localStorage.setItem('theme', t); } catch (_) {}
  previewSetTheme(t);
};
setTheme((() => {
  try { const s = localStorage.getItem('theme'); if (s) return s; } catch (_) {}
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
})());
$('#themeBtn')?.addEventListener('click', () =>
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

/* ── Toasts ────────────────────────────────────────────────────────── */
function toast(html, type = 'ok', ms) {
  const t = el('div', `toast ${type}`, `${icon(type === 'ok' ? 'check' : 'x')}<div>${html}</div>`);
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 380); }, ms || (type === 'ok' ? 5200 : 9000));
}

/* ── Base64 (UTF-8 safe) ───────────────────────────────────────────── */
const b64encode = str => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
};
const b64decode = b64 => {
  const bin = atob(String(b64).replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
};
const bufToB64 = buf => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

/* ── GitHub API ────────────────────────────────────────────────────── */
async function gh(path, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${state.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers || {}),
    },
  });
  if (!r.ok) {
    let msg = '';
    try { msg = (await r.json()).message; } catch (_) {}
    const err = new Error(msg || `GitHub API error (${r.status})`);
    err.status = r.status;
    throw err;
  }
  return r.status === 204 ? null : r.json();
}
const repoPath = p => `/repos/${OWNER}/${REPO}/contents/${p.split('/').map(encodeURIComponent).join('/')}`;

async function getFileSha(path) {
  const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  const list = await gh(`${repoPath(dir)}?ref=${encodeURIComponent(state.branch)}`);
  return (Array.isArray(list) ? list : [list]).find(x => x.path === path)?.sha;
}

/* ── Auth ──────────────────────────────────────────────────────────── */
async function login(token, branch) {
  state.token = token;
  state.branch = branch || 'main';
  state.user = await gh('/user');
  const repo = await gh(`/repos/${OWNER}/${REPO}`);
  if (!repo.permissions?.push)
    throw new Error('This token cannot write to the repository. It needs "Contents: Read and write" permission on ' + `${OWNER}/${REPO}.`);
  await loadContent();
  loadImages();
  showApp();
}

async function loadContent() {
  const f = await gh(`${repoPath(CONTENT_PATH)}?ref=${encodeURIComponent(state.branch)}`);
  state.sha = f.sha;
  state.remoteStr = JSON.stringify(JSON.parse(b64decode(f.content)));
  state.doc = JSON.parse(b64decode(f.content));

  let draft = null;
  try { draft = localStorage.getItem(draftKey()); } catch (_) {}
  if (draft && draft !== JSON.stringify(state.doc)) {
    try {
      state.doc = JSON.parse(draft);
      $('#draftBanner').hidden = false;
      setDirty(true);
    } catch (_) { clearDraft(); }
  }
}

async function loadImages() {
  try {
    const list = await gh(`${repoPath('images')}?ref=${encodeURIComponent(state.branch)}`);
    state.images = list
      .filter(x => x.type === 'file' && /\.(png|jpe?g|webp|svg|avif|gif)$/i.test(x.name))
      .map(x => x.path);
    let dl = $('#imgList');
    if (!dl) { dl = el('datalist'); dl.id = 'imgList'; document.body.appendChild(dl); }
    dl.innerHTML = state.images.map(p => `<option value="${esc(p)}">`).join('');
  } catch (_) { /* suggestions are optional */ }
}

function logout() {
  try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch (_) {}
  location.reload();
}

/* ── Dirty state & drafts ──────────────────────────────────────────── */
let draftTimer;
function setDirty(d) {
  state.dirty = d;
  const s = $('#dirtyStatus');
  s.classList.toggle('dirty', d);
  $('.txt', s).textContent = d ? 'Unsaved changes' : 'All changes saved';
  $('#saveBtn').disabled = !d || state.busy;
}
function markDirty() {
  setDirty(true);
  pushPreview();
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try { localStorage.setItem(draftKey(), JSON.stringify(state.doc)); } catch (_) {}
  }, 400);
}
function clearDraft() {
  clearTimeout(draftTimer);
  try { localStorage.removeItem(draftKey()); } catch (_) {}
}
addEventListener('beforeunload', e => {
  if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
});

/* ── Path helpers ──────────────────────────────────────────────────── */
const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const setPath = (o, p, v) => {
  const ks = p.split('.'), last = ks.pop();
  let cur = o;
  for (const k of ks) {
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k];
  }
  cur[last] = v;
};
const pathBind = p => ({
  get: () => getPath(state.doc, p),
  set: v => setPath(state.doc, p, v),
});

/* ── Schema ────────────────────────────────────────────────────────── */
const ICON_OPTS  = ['pin', 'wifi', 'zap', 'code', 'mail', 'link'];
const GROUP_ICONS = ['bot', 'cpu', 'layers', 'database', 'zap', 'code'];
const COLORS = ['violet', 'cyan', 'green', 'amber', 'pink'];

const SECTIONS = [
  {
    id: 'hero', icon: 'zap', title: 'Hero',
    desc: 'The first screen visitors see — update this when you change roles or companies.',
    fields: [
      { p: 'hero.availability', t: 'text', l: 'Status badge', h: 'Current role · company, shown in the pill above your name.' },
      { p: 'hero.headline1', t: 'text', l: 'Headline · line 1' },
      { p: 'hero.headline2', t: 'text', l: 'Headline · line 2 (gradient)' },
      { p: 'hero.roles', t: 'chips', l: 'Rotating titles', h: 'Typed one-by-one under your name. Press Enter to add.' },
      { p: 'hero.bio', t: 'textarea', l: 'Short bio' },
      { p: 'hero.stats', t: 'list', l: 'Stats', h: 'Big numbers under the bio (3 look best).',
        item: [{ k: 'value', t: 'text', l: 'Value (e.g. "<3%" or "166")' }, { k: 'label', t: 'text', l: 'Label' }] },
      { p: 'hero.photo', t: 'image', l: 'Photo' },
      { p: 'hero.photoBadges', t: 'list', l: 'Photo badges', h: 'Small stat cards on the photo (3 look best).',
        item: [{ k: 'value', t: 'text', l: 'Value' }, { k: 'label', t: 'text', l: 'Label' }] },
    ],
  },
  {
    id: 'social', icon: 'link', title: 'Social links',
    desc: 'Used everywhere on the site — hero, hire section, contact and footer.',
    fields: [
      { p: 'social.linkedin', t: 'text', l: 'LinkedIn URL' },
      { p: 'social.github', t: 'text', l: 'GitHub URL' },
      { p: 'social.email', t: 'text', l: 'Email address' },
      { p: 'social.hackerrank', t: 'text', l: 'HackerRank URL' },
    ],
  },
  {
    id: 'about', icon: 'user', title: 'About',
    fields: [
      { p: 'about.label', t: 'text', l: 'Eyebrow label' },
      { p: 'about.headingPlain', t: 'text', l: 'Heading · plain part' },
      { p: 'about.headingAccent', t: 'text', l: 'Heading · gradient part' },
      { p: 'about.image', t: 'image', l: 'Photo' },
      { p: 'about.badges', t: 'list', l: 'Photo badges',
        item: [{ k: 'icon', t: 'select', l: 'Icon', opts: ICON_OPTS }, { k: 'text', t: 'text', l: 'Text' }] },
      { p: 'about.paragraphs', t: 'rows', l: 'Paragraphs' },
      { p: 'about.chips', t: 'chips', l: 'Highlight chips' },
    ],
  },
  {
    id: 'skills', icon: 'layers', title: 'Skills',
    fields: [
      { p: 'skills.label', t: 'text', l: 'Eyebrow label' },
      { p: 'skills.heading', t: 'text', l: 'Heading' },
      { p: 'skills.sub', t: 'text', l: 'Subtitle' },
      { p: 'skills.groups', t: 'list', l: 'Skill groups', titleKey: 'title',
        item: [
          { k: 'title', t: 'text', l: 'Group title' },
          { k: 'icon', t: 'select', l: 'Icon', opts: GROUP_ICONS },
          { k: 'color', t: 'select', l: 'Accent color', opts: COLORS },
          { k: 'pills', t: 'chips', l: 'Skills' },
        ] },
      { p: 'skills.logos', t: 'list', l: 'Logo marquee', titleKey: 'label',
        item: [
          { k: 'label', t: 'text', l: 'Name' },
          { k: 'img', t: 'image', l: 'Logo image' },
          { k: 'url', t: 'text', l: 'Link URL' },
        ] },
    ],
  },
  {
    id: 'experience', icon: 'briefcase', title: 'Experience',
    desc: 'Add a new entry when you change companies — the newest work entry is highlighted automatically.',
    fields: [
      { p: 'experience.label', t: 'text', l: 'Eyebrow label' },
      { p: 'experience.heading', t: 'text', l: 'Heading' },
      { p: 'experience.sub', t: 'text', l: 'Subtitle' },
      { p: 'experience.items', t: 'list', l: 'Entries (newest first)', titleKey: 'role',
        item: [
          { k: 'type', t: 'select', l: 'Type', opts: ['work', 'education'] },
          { k: 'role', t: 'text', l: 'Role / degree' },
          { k: 'org', t: 'text', l: 'Company / institution' },
          { k: 'date', t: 'text', l: 'Period (e.g. "Apr 2025 — Present")' },
          { k: 'location', t: 'text', l: 'Location' },
          { k: 'bullets', t: 'rows', l: 'Highlights' },
          { k: 'tags', t: 'chips', l: 'Tags' },
        ] },
    ],
  },
  {
    id: 'projects', icon: 'folder', title: 'Projects',
    fields: [
      { p: 'projects.label', t: 'text', l: 'Eyebrow label' },
      { p: 'projects.heading', t: 'text', l: 'Heading' },
      { p: 'projects.sub', t: 'text', l: 'Subtitle' },
      { p: 'projects.githubUrl', t: 'text', l: '"All on GitHub" button URL' },
      { p: 'projects.items', t: 'list', l: 'Projects', titleKey: 'title',
        item: [
          { k: 'title', t: 'text', l: 'Title' },
          { k: 'desc', t: 'textarea', l: 'Description' },
          { k: 'image', t: 'image', l: 'Cover image' },
          { k: 'link', t: 'text', l: 'Live app / repo URL' },
        ] },
    ],
  },
  {
    id: 'cta', icon: 'send', title: 'Hire banner',
    fields: [
      { p: 'cta.badge', t: 'text', l: 'Badge text' },
      { p: 'cta.title1', t: 'text', l: 'Title · line 1' },
      { p: 'cta.title2', t: 'text', l: 'Title · line 2 (gradient)' },
      { p: 'cta.sub', t: 'textarea', l: 'Subtitle' },
    ],
  },
  {
    id: 'contact', icon: 'mail', title: 'Contact',
    desc: 'Email, LinkedIn and GitHub rows reuse the Social links section automatically.',
    fields: [
      { p: 'contact.label', t: 'text', l: 'Eyebrow label' },
      { p: 'contact.heading', t: 'text', l: 'Heading' },
      { p: 'contact.sub', t: 'text', l: 'Subtitle' },
      { p: 'contact.intro', t: 'textarea', l: 'Intro paragraph' },
      { p: 'contact.phone', t: 'text', l: 'Phone' },
      { p: 'contact.location', t: 'text', l: 'Location' },
    ],
  },
  {
    id: 'site', icon: 'info', title: 'Site & SEO',
    fields: [
      { p: 'brand.logo', t: 'text', l: 'Logo text (nav & footer)' },
      { p: 'meta.title', t: 'text', l: 'Browser tab title' },
      { p: 'meta.description', t: 'textarea', l: 'SEO description' },
      { p: 'footer.copyright', t: 'text', l: 'Footer copyright line' },
    ],
  },
  { id: 'resume', icon: 'file', title: 'Resume', special: 'resume' },
];

/* ── Field renderers ───────────────────────────────────────────────── */
function autoGrow(ta) {
  const fit = () => { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight + 2}px`; };
  ta.classList.add('auto');
  ta.addEventListener('input', fit);
  requestAnimationFrame(fit);
}

function fieldNode(f, b, onChange) {
  const changed = () => { markDirty(); onChange?.(); };
  const block = el('div', 'f-block');
  if (f.l) block.appendChild(el('label', '', esc(f.l)));
  let body;

  switch (f.t) {
    case 'textarea': {
      body = el('div', 'fg');
      const ta = document.createElement('textarea');
      ta.value = b.get() ?? '';
      ta.rows = 3;
      ta.addEventListener('input', () => { b.set(ta.value); changed(); });
      body.appendChild(ta);
      autoGrow(ta);
      break;
    }
    case 'select': {
      body = el('div', 'fg');
      const sel = document.createElement('select');
      sel.innerHTML = f.opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
      sel.value = b.get() ?? f.opts[0];
      sel.addEventListener('change', () => { b.set(sel.value); changed(); });
      body.appendChild(sel);
      break;
    }
    case 'image': {
      body = el('div', 'img-field');
      const grow = el('div', 'fg fg-grow');
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.setAttribute('list', 'imgList');
      inp.placeholder = 'images/…';
      inp.value = b.get() ?? '';
      const prev = el('img', 'img-prev');
      prev.alt = '';
      const sync = () => { prev.src = inp.value || ''; prev.style.visibility = inp.value ? 'visible' : 'hidden'; };
      prev.onerror = () => { prev.style.visibility = 'hidden'; };
      inp.addEventListener('input', () => { b.set(inp.value.trim()); sync(); changed(); });
      sync();
      grow.appendChild(inp);
      body.append(grow, prev);
      break;
    }
    case 'chips': {
      body = el('div', 'chips-ed');
      if (!Array.isArray(b.get())) b.set([]);
      const paint = () => {
        body.innerHTML = '';
        b.get().forEach((v, i) => {
          const c = el('span', 'chip-it', `${esc(v)} <button type="button" aria-label="Remove">${icon('x')}</button>`);
          $('button', c).addEventListener('click', () => { b.get().splice(i, 1); paint(); changed(); });
          body.appendChild(c);
        });
        const inp = document.createElement('input');
        inp.placeholder = 'Type and press Enter…';
        const add = () => {
          const v = inp.value.trim().replace(/,+$/, '');
          if (!v) return;
          b.get().push(v);
          paint();
          $('input', body).focus();
          changed();
        };
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          else if (e.key === 'Backspace' && !inp.value && b.get().length) {
            b.get().pop(); paint(); $('input', body).focus(); changed();
          }
        });
        inp.addEventListener('blur', add);
        body.appendChild(inp);
      };
      paint();
      body.addEventListener('click', e => { if (e.target === body) $('input', body)?.focus(); });
      break;
    }
    case 'rows': {
      body = el('div', 'rows-ed');
      if (!Array.isArray(b.get())) b.set([]);
      const paint = () => {
        body.innerHTML = '';
        b.get().forEach((v, i) => {
          const row = el('div', 'row-it');
          const fg = el('div', 'fg fg-grow');
          fg.style.flex = '1';
          const ta = document.createElement('textarea');
          ta.rows = 2;
          ta.value = v;
          ta.addEventListener('input', () => { b.get()[i] = ta.value; changed(); });
          fg.appendChild(ta);
          const del = el('button', 'li-btn danger', icon('trash'));
          del.type = 'button';
          del.title = 'Remove';
          del.addEventListener('click', () => { b.get().splice(i, 1); paint(); changed(); });
          row.append(fg, del);
          body.appendChild(row);
          autoGrow(ta);
        });
        const add = el('button', 'add-btn', `${icon('plus')} Add`);
        add.type = 'button';
        add.addEventListener('click', () => { b.get().push(''); paint(); changed(); $$('textarea', body).pop()?.focus(); });
        body.appendChild(add);
      };
      paint();
      break;
    }
    case 'list': {
      body = el('div', 'list-ed');
      if (!Array.isArray(b.get())) b.set([]);
      const blank = () => Object.fromEntries(f.item.map(sf =>
        [sf.k, sf.t === 'chips' || sf.t === 'rows' ? [] : sf.t === 'select' ? sf.opts[0] : '']));
      const paint = () => {
        body.innerHTML = '';
        const arr = b.get();
        arr.forEach((item, i) => {
          const card = el('div', 'list-item');
          const head = el('div', 'list-item-head');
          const title = el('div', 'list-item-title', esc(item[f.titleKey ?? f.item[0].k] || `Item ${i + 1}`));
          const mk = (ic, lbl, fn, danger) => {
            const btn = el('button', `li-btn${danger ? ' danger' : ''}`, icon(ic));
            btn.type = 'button';
            btn.title = lbl;
            btn.addEventListener('click', fn);
            return btn;
          };
          const up = mk('arrow-up', 'Move up', () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; paint(); changed(); });
          const down = mk('arrow-down', 'Move down', () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; paint(); changed(); });
          if (i === 0) up.disabled = true;
          if (i === arr.length - 1) down.disabled = true;
          const del = mk('trash', 'Delete', () => {
            if (confirm('Delete this entry?')) { arr.splice(i, 1); paint(); changed(); }
          }, true);
          head.append(title, up, down, del);
          const bodyEl = el('div', 'list-item-body');
          f.item.forEach(sf => {
            const sb = { get: () => item[sf.k], set: v => { item[sf.k] = v; } };
            const refreshTitle = sf.k === (f.titleKey ?? f.item[0].k)
              ? () => { title.textContent = item[sf.k] || `Item ${i + 1}`; }
              : null;
            bodyEl.appendChild(fieldNode(sf, sb, refreshTitle));
          });
          card.append(head, bodyEl);
          body.appendChild(card);
        });
        const add = el('button', 'add-btn', `${icon('plus')} Add entry`);
        add.type = 'button';
        add.addEventListener('click', () => { arr.push(blank()); paint(); changed(); });
        body.appendChild(add);
      };
      paint();
      break;
    }
    default: { /* text */
      body = el('div', 'fg');
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = b.get() ?? '';
      inp.addEventListener('input', () => { b.set(inp.value); changed(); });
      body.appendChild(inp);
    }
  }

  block.appendChild(body);
  if (f.h) block.appendChild(el('div', 'f-hint', esc(f.h)));
  return block;
}

/* ── Panels ────────────────────────────────────────────────────────── */
function renderSidebar() {
  const sb = $('#sidebar');
  sb.innerHTML = '';
  SECTIONS.forEach(s => {
    const btn = el('button', 'snav', `${icon(s.icon)} <span>${esc(s.title)}</span>`);
    btn.type = 'button';
    btn.dataset.id = s.id;
    btn.addEventListener('click', () => renderPanel(s.id));
    sb.appendChild(btn);
  });
}

function renderPanel(id) {
  $$('.snav').forEach(b => b.classList.toggle('act', b.dataset.id === id));
  const s = SECTIONS.find(x => x.id === id);
  const secLbl = $('#previewSec');
  if (secLbl) secLbl.textContent = s.title;
  previewScrollTo(id);
  const panel = $('#panel');
  panel.innerHTML = '';
  const head = el('div', 'panel-head',
    `<h2>${icon(s.icon)} ${esc(s.title)}</h2>${s.desc ? `<p>${esc(s.desc)}</p>` : ''}`);
  panel.appendChild(head);
  if (s.special === 'resume') return renderResumePanel(panel);
  s.fields.forEach(f => panel.appendChild(fieldNode(f, pathBind(f.p))));
  $('.panel-wrap').scrollTop = 0;
  scrollTo({ top: 0 });
}

function renderResumePanel(panel) {
  const file = state.doc?.resume?.file || 'Aman_Bhatt_Resume.pdf';
  const card = el('div', 'res-card', `
    <div class="res-row">
      <div class="res-ico">${icon('file')}</div>
      <div class="res-meta">
        <div class="res-name">${esc(file)}</div>
        <div class="res-sub">This is the file behind every “Resume” button on the site.</div>
      </div>
      <a class="btn btn-out btn-sm" href="${esc(file)}" target="_blank" rel="noopener">${icon('external')} View current</a>
    </div>
    <div class="dropzone" id="dz" role="button" tabindex="0">
      ${icon('upload')}
      <p>Upload a new resume</p>
      <span>Click to choose or drag a PDF here · replaces the current file · max 10 MB</span>
      <div class="dz-progress" id="dzProgress"></div>
    </div>
    <input type="file" id="dzInput" accept="application/pdf,.pdf" hidden>
  `);
  panel.appendChild(card);
  panel.appendChild(el('div', 'f-hint',
    'The new PDF is committed straight to GitHub — the live link updates after the site redeploys (usually 1–2 minutes). No “Save & publish” needed for the resume.'));

  const dz = $('#dz', card), input = $('#dzInput', card), prog = $('#dzProgress', card);
  dz.addEventListener('click', () => input.click());
  dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => { const f = e.dataTransfer.files?.[0]; if (f) uploadResume(f, prog); });
  input.addEventListener('change', () => { const f = input.files?.[0]; if (f) uploadResume(f, prog); input.value = ''; });
}

async function uploadResume(file, prog) {
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf')
    return toast('Please choose a PDF file.', 'err');
  if (file.size > 10 * 1024 * 1024)
    return toast('File is larger than 10 MB — please compress it first.', 'err');
  const path = state.doc?.resume?.file || 'Aman_Bhatt_Resume.pdf';
  setBusy(true);
  prog.textContent = 'Uploading…';
  prog.classList.add('show');
  try {
    const content = bufToB64(await file.arrayBuffer());
    const sha = await getFileSha(path);
    await gh(repoPath(path), {
      method: 'PUT',
      body: JSON.stringify({
        message: 'docs: update resume via developer console',
        content, branch: state.branch, ...(sha ? { sha } : {}),
      }),
    });
    toast(`Resume updated! The live file refreshes in ~1–2 minutes. <a href="${esc(path)}" target="_blank" rel="noopener">Open</a>`);
  } catch (e) {
    toast(`Upload failed: ${esc(e.message)}`, 'err');
  }
  prog.classList.remove('show');
  setBusy(false);
}

/* ── Save ──────────────────────────────────────────────────────────── */
function setBusy(b) {
  state.busy = b;
  $('#dirtyStatus').classList.toggle('busy', b);
  const btn = $('#saveBtn');
  btn.disabled = b || !state.dirty;
  btn.innerHTML = b ? `${icon('refresh')} Publishing…` : `${icon('check')} Save &amp; publish`;
}

async function saveContent() {
  if (!state.dirty || state.busy) return;
  setBusy(true);
  const body = sha => JSON.stringify({
    message: 'content: update site content via developer console',
    content: b64encode(JSON.stringify(state.doc, null, 2) + '\n'),
    branch: state.branch,
    sha,
  });
  try {
    let res;
    try {
      res = await gh(repoPath(CONTENT_PATH), { method: 'PUT', body: body(state.sha) });
    } catch (e) {
      if (e.status !== 409 && e.status !== 422) throw e;
      const f = await gh(`${repoPath(CONTENT_PATH)}?ref=${encodeURIComponent(state.branch)}`);
      res = await gh(repoPath(CONTENT_PATH), { method: 'PUT', body: body(f.sha) });
    }
    state.sha = res.content.sha;
    state.remoteStr = JSON.stringify(state.doc);
    clearDraft();
    setDirty(false);
    $('#draftBanner').hidden = true;
    toast(`Published! Changes go live in ~1–2 minutes. <a href="${esc(res.commit.html_url)}" target="_blank" rel="noopener">View commit</a>`);
  } catch (e) {
    toast(`Could not publish: ${esc(e.message)}`, 'err');
  }
  setBusy(false);
}

/* ── App boot ──────────────────────────────────────────────────────── */
function showApp() {
  $('#authView').hidden = true;
  $('#appView').hidden = false;
  const u = state.user;
  $('#avatarImg').src = u.avatar_url || '';
  $('#avatarBox').title = `Signed in as ${u.login} · branch: ${state.branch}`;
  renderSidebar();
  renderPanel('hero');
  if (!state.dirty) setDirty(false);
}

$('#authForm').addEventListener('submit', async e => {
  e.preventDefault();
  const token = $('#tokenInput').value.trim();
  const branch = $('#branchInput').value.trim() || 'main';
  const remember = $('#rememberInput').checked;
  const errBox = $('#authError');
  const btn = $('#loginBtn');
  errBox.classList.remove('show');
  btn.disabled = true;
  btn.innerHTML = `${icon('refresh')} Signing in…`;
  try {
    await login(token, branch);
    try {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
      localStorage.setItem(BRANCH_KEY, branch);
    } catch (_) {}
  } catch (err) {
    errBox.textContent = err.status === 401
      ? 'GitHub rejected this token (401). Check that it was copied fully and has not expired.'
      : err.message;
    errBox.classList.add('show');
  }
  btn.disabled = false;
  btn.innerHTML = `${icon('lock')} Sign in`;
});

$('#saveBtn').addEventListener('click', saveContent);
$('#logoutBtn').addEventListener('click', () => {
  if (!state.dirty || confirm('You have unsaved changes. Sign out anyway?')) logout();
});

/* Preview controls */
$('#previewReload')?.addEventListener('click', () => {
  const f = previewFrame();
  if (!f) return;
  previewReady = false;
  try { f.contentWindow.location.reload(); } catch (_) { f.src = f.src; }
});
$('#previewDevice')?.addEventListener('click', () => {
  const wrap = $('#previewWrap');
  const mobile = wrap.classList.toggle('mobile');
  $('#previewDevice use')?.setAttribute('href', mobile ? '#i-monitor' : '#i-smartphone');
  $('#previewDevice').title = mobile ? 'Switch to desktop width' : 'Switch to mobile width';
});
$('#previewToggle')?.addEventListener('click', () => {
  const off = $('.app-body').classList.toggle('no-preview');
  $('#previewToggle').classList.toggle('act', !off);
});
$('#discardDraftBtn').addEventListener('click', () => {
  if (!confirm('Discard the local draft and reload the published content?')) return;
  state.doc = JSON.parse(state.remoteStr);
  clearDraft();
  setDirty(false);
  $('#draftBanner').hidden = true;
  renderPanel($('.snav.act')?.dataset.id || 'hero');
  toast('Draft discarded — showing the published content.');
});
addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's' && !$('#appView').hidden) {
    e.preventDefault();
    saveContent();
  }
});

/* Auto sign-in with a stored token */
(async () => {
  let token = null;
  try { token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); } catch (_) {}
  if (!token) return;
  let branch = 'main';
  try { branch = localStorage.getItem(BRANCH_KEY) || 'main'; } catch (_) {}
  $('#branchInput').value = branch;
  try { await login(token, branch); }
  catch (_) {
    try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch (_) {}
  }
})();
})();
