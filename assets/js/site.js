/* ════════════════════════════════════════════════════════════════════
   Aman Bhatt · Portfolio — site script
   1. Hydrates the page from content.json (edited via the developer
      console at admin.html). Static markup is the no-JS fallback.
   2. Mounts all interactions: smooth scroll, reveals, typing, counters,
      spotlight, marquee, contact form.
   ════════════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer  = matchMedia('(hover: hover) and (pointer: fine)').matches;
/* Preview mode: the developer console embeds this page as ?preview=1 and
   drives it live via postMessage instead of the published content.json. */
const PREVIEW = (() => { try { return new URLSearchParams(location.search).has('preview'); } catch (_) { return false; } })();

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const icon = name => `<svg class="ic" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

/* ── Theme (instant, before anything else) ─────────────────────────── */
const root = document.documentElement;
const setTheme = t => {
  root.setAttribute('data-theme', t);
  const u = $('#themeIcon use');
  if (u) u.setAttribute('href', t === 'dark' ? '#i-moon' : '#i-sun');
  $('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#05060b' : '#f6f7fc');
  try { localStorage.setItem('theme', t); } catch (_) {}
};
setTheme((() => {
  try { const s = localStorage.getItem('theme'); if (s) return s; } catch (_) {}
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
})());
$('#themeBtn')?.addEventListener('click', () =>
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

/* ── Language (EN / DE) ─────────────────────────────────────────────
   Chrome strings live here; everything content-shaped lives in
   content.json under "de" and is merged over the English tree below.
   Each language is a real URL (?lang=de) so it can be linked and
   crawled — switching reloads rather than swapping the DOM in place. */
const LANGS = ['en', 'de'];
const UI = {
  en: {
    'skip': 'Skip to content',
    'nav.about': 'About', 'nav.skills': 'Skills', 'nav.experience': 'Experience',
    'nav.projects': 'Projects', 'nav.contact': 'Contact', 'nav.hire': 'Hire Me',
    'btn.projects': 'Projects', 'btn.resume': 'Resume', 'btn.allGithub': 'All on GitHub',
    'btn.sendInquiry': 'Send Inquiry',
    'proj.view': 'View app',
    'contact.connect': "Let's connect",
    'form.name': 'Name *', 'form.namePh': 'Jane Smith',
    'form.email': 'Email *', 'form.emailPh': 'jane@company.com',
    'form.company': 'Company', 'form.companyPh': 'Acme Corp (optional)',
    'form.type': 'Opportunity type *', 'form.typePh': 'Select type',
    'form.opt.fulltime': 'Full-time Role', 'form.opt.contract': 'Contract / Freelance',
    'form.opt.consulting': 'Consulting', 'form.opt.research': 'Research Collaboration',
    'form.opt.other': 'Other',
    'form.message': 'Message', 'form.messagePh': 'Tell me about the role or project…',
    'form.note': 'Delivered securely to my inbox.',
    'form.submit': 'Send Message', 'form.sending': 'Sending…',
    'form.ok': "✓ Message sent! I'll reply within 24 hours.",
    'form.err': '✕ Could not send. Please email me directly.',
    'foot.top': 'Top', 'foot.dev': 'Developer',
    'aria.theme': 'Toggle theme', 'aria.menu': 'Menu', 'aria.top': 'Back to top',
    'aria.lang': 'Language',
    'row.email': 'email', 'row.phone': 'phone', 'row.linkedin': 'linkedin',
    'row.github': 'github', 'row.location': 'location',
    'cv.title': 'Resume', 'cv.download': 'Download PDF',
    'cv.newTab': 'Open in new tab', 'cv.close': 'Close viewer',
  },
  de: {
    'skip': 'Zum Inhalt springen',
    'nav.about': 'Über mich', 'nav.skills': 'Kenntnisse', 'nav.experience': 'Erfahrung',
    'nav.projects': 'Projekte', 'nav.contact': 'Kontakt', 'nav.hire': 'Anfragen',
    'btn.projects': 'Projekte', 'btn.resume': 'Lebenslauf', 'btn.allGithub': 'Alle auf GitHub',
    'btn.sendInquiry': 'Anfrage senden',
    'proj.view': 'App ansehen',
    'contact.connect': 'Vernetzen wir uns',
    'form.name': 'Name *', 'form.namePh': 'Maria Schmidt',
    'form.email': 'E-Mail *', 'form.emailPh': 'maria@unternehmen.de',
    'form.company': 'Unternehmen', 'form.companyPh': 'Acme GmbH (optional)',
    'form.type': 'Art der Anfrage *', 'form.typePh': 'Bitte auswählen',
    'form.opt.fulltime': 'Festanstellung', 'form.opt.contract': 'Projektarbeit / Freelance',
    'form.opt.consulting': 'Beratung', 'form.opt.research': 'Forschungskooperation',
    'form.opt.other': 'Sonstiges',
    'form.message': 'Nachricht', 'form.messagePh': 'Erzählen Sie mir von der Stelle oder dem Projekt…',
    'form.note': 'Wird sicher an mein Postfach zugestellt.',
    'form.submit': 'Nachricht senden', 'form.sending': 'Wird gesendet…',
    'form.ok': '✓ Nachricht gesendet! Ich antworte innerhalb von 24 Stunden.',
    'form.err': '✕ Senden fehlgeschlagen. Bitte schreiben Sie mir direkt per E-Mail.',
    'foot.top': 'Nach oben', 'foot.dev': 'Entwickler',
    'aria.theme': 'Design umschalten', 'aria.menu': 'Menü', 'aria.top': 'Nach oben',
    'aria.lang': 'Sprache',
    'row.email': 'E-Mail', 'row.phone': 'Telefon', 'row.linkedin': 'LinkedIn',
    'row.github': 'GitHub', 'row.location': 'Standort',
    'cv.title': 'Lebenslauf', 'cv.download': 'PDF herunterladen',
    'cv.newTab': 'In neuem Tab öffnen', 'cv.close': 'Ansicht schließen',
  },
};
const LANG = (() => {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
    const s = localStorage.getItem('lang');
    if (LANGS.includes(s)) return s;
  } catch (_) {}
  return 'en';
})();
const tr = k => UI[LANG]?.[k] ?? UI.en[k] ?? '';

/* Switching language reloads the page, so the section you were reading has
   to be carried across by hand. The URL hash can't do it: the nav rewrites
   it with history.replaceState, so it points at whatever you last clicked
   rather than where you are — often Contact, i.e. the bottom of the page.
   Instead the switch records the section in view and we scroll back to it
   after hydration, with the browser's own restoration turned off for that
   one load (it fires too early, while the page is still the wrong height). */
const LANG_JUMP_KEY = 'pf_lang_jump';
const LANG_JUMP = (() => {
  try {
    const v = sessionStorage.getItem(LANG_JUMP_KEY);
    if (v !== null) { sessionStorage.removeItem(LANG_JUMP_KEY); return JSON.parse(v); }
  } catch (_) {}
  return null;
})();
if (LANG_JUMP && 'scrollRestoration' in history) history.scrollRestoration = 'manual';

const navOffset = () => (parseInt(getComputedStyle(root).getPropertyValue('--nav-h')) || 64) + 16;
/* The last section whose top has passed under the nav — what you're reading. */
const sectionInView = () => {
  const limit = navOffset();
  let id = '';
  $$('section[id]').forEach(sec => { if (sec.getBoundingClientRect().top <= limit) id = sec.id; });
  return id;
};
let lenis = null;   // set by mountChrome; used to restore scroll without fighting it
/* Where you are, as a section plus how far you have read into it. Absolute
   offsets are useless across a language change: German runs longer, so every
   section sits somewhere else. */
const scrollMark = () => {
  const id = sectionInView();
  const el = id && document.getElementById(id);
  return { id, d: el ? Math.round(navOffset() - el.getBoundingClientRect().top) : 0 };
};
function restoreLangScroll() {
  if (!LANG_JUMP) return;
  const el = LANG_JUMP.id && document.getElementById(LANG_JUMP.id);
  if (!el) return;

  const apply = () => {
    /* Clamp into the section so a shorter translation can't spill into the next one. */
    const d = Math.max(0, Math.min(LANG_JUMP.d || 0, Math.max(0, el.offsetHeight - navOffset())));
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    if (!max) return false;                       // layout not settled yet — try again
    const top = Math.max(0, Math.min(el.getBoundingClientRect().top + scrollY - navOffset() + d, max));
    if (lenis) lenis.scrollTo(top, { immediate: true });
    else scrollTo({ top, behavior: 'auto' });
    return true;
  };

  /* Images and web fonts land after hydration and move everything below them,
     so re-assert the position until the page stops growing. */
  apply();
  let tries = 0;
  const settle = () => {
    apply();
    if (++tries < 3) requestAnimationFrame(settle);
  };
  requestAnimationFrame(settle);
  if (document.readyState !== 'complete') addEventListener('load', () => apply(), { once: true });
}

/* Merge the "de" overlay over the English tree. Arrays merge by index and
   the English length wins, so a job added in English but not yet
   translated still shows up — in English rather than not at all. */
function mergeLang(base, over) {
  if (Array.isArray(base)) {
    if (!Array.isArray(over)) return base;
    return base.map((v, i) => (i < over.length ? mergeLang(v, over[i]) : v));
  }
  if (base && typeof base === 'object') {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return base;
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = mergeLang(base[k], over[k]);
    return out;
  }
  return over === undefined ? base : over;
}
const localize = c => {
  if (LANG === 'en' || !c?.de) return c;
  const { de, ...base } = c;
  const merged = mergeLang(base, de);
  merged.de = de;                       // keep the overlay for the console preview
  return merged;
};

/* Static markup: data-i18n swaps text, data-i18n-attr swaps attributes
   ("placeholder:form.namePh" or "aria-label:aria.menu"). */
function applyLang() {
  root.lang = LANG;
  $$('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
  $$('[data-i18n-attr]').forEach(el => {
    el.dataset.i18nAttr.split(',').forEach(pair => {
      const i = pair.indexOf(':');
      if (i > 0) el.setAttribute(pair.slice(0, i).trim(), tr(pair.slice(i + 1).trim()));
    });
  });
  const canon = $('link[rel="canonical"]');
  if (canon) {
    const base = canon.href.split('?')[0];
    canon.href = LANG === 'en' ? base : `${base}?lang=${LANG}`;
  }
  $$('[data-lang]').forEach(b => {
    const on = b.dataset.lang === LANG;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}
function mountLangSwitch() {
  $$('[data-lang]').forEach(b => b.addEventListener('click', () => {
    const next = b.dataset.lang;
    if (!LANGS.includes(next) || next === LANG) return;
    try { localStorage.setItem('lang', next); } catch (_) {}
    try { sessionStorage.setItem(LANG_JUMP_KEY, JSON.stringify(scrollMark())); } catch (_) {}
    const q = new URLSearchParams(location.search);
    next === 'en' ? q.delete('lang') : q.set('lang', next);
    const s = q.toString();
    /* No hash: it would jump before hydration and it is stale anyway. */
    location.href = `${location.pathname}${s ? `?${s}` : ''}`;
  }));
}

/* ── Content hydration ─────────────────────────────────────────────── */
const setText = (sel, v) => { if (v != null) $$(sel).forEach(el => { el.textContent = v; }); };

function render(c) {
  if (c.meta) {
    if (c.meta.title) document.title = c.meta.title;
    if (c.meta.description) $('meta[name="description"]')?.setAttribute('content', c.meta.description);
  }
  if (c.brand?.logo) {
    const parts = c.brand.logo.trim().split(/\s+/);
    const last = parts.length > 1 ? parts.pop() : '';
    const html = `${esc(parts.join(' '))} <span>${esc(last)}</span>`;
    $$('.nav-logo, .foot-brand').forEach(el => { el.innerHTML = html; });
  }

  /* Hero */
  const h = c.hero || {};
  setText('[data-c="hero.availability"]', h.availability);
  if (h.headline1 != null && h.headline2 != null) {
    $('#heroH1').innerHTML = `${esc(h.headline1)}<br><span class="grd-txt">${esc(h.headline2)}</span>`;
  }
  setText('[data-c="hero.bio"]', h.bio);
  if (Array.isArray(h.stats)) {
    $('#heroStats').innerHTML = h.stats.map(s => `
      <div class="hst">
        <div class="hst-n" data-count="${esc(s.value)}">${esc(s.value)}</div>
        <div class="hst-l">${esc(s.label)}</div>
      </div>`).join('');
  }
  if (h.photo) { const img = $('#heroImg'); img.src = h.photo; }
  if (Array.isArray(h.photoBadges)) {
    $('#photoStats').innerHTML = h.photoBadges.map(b => `
      <div class="pst"><div class="pst-v">${esc(b.value)}</div><div class="pst-l">${esc(b.label)}</div></div>`).join('');
  }

  /* Social + resume links */
  const soc = c.social || {};
  const socHref = { linkedin: soc.linkedin, github: soc.github, hackerrank: soc.hackerrank, email: soc.email ? `mailto:${soc.email}` : null };
  Object.entries(socHref).forEach(([k, v]) => { if (v) $$(`[data-soc="${k}"]`).forEach(a => { a.href = v; }); });
  const resumeFile = (LANG !== 'en' && c.resume?.[`file${LANG[0].toUpperCase()}${LANG.slice(1)}`]) || c.resume?.file;
  if (resumeFile) $$('[data-resume]').forEach(a => { a.href = resumeFile; });

  /* About */
  const ab = c.about || {};
  setText('[data-c="about.label"]', ab.label);
  if (ab.headingPlain != null) {
    $('#aboutH2').innerHTML = `${esc(ab.headingPlain)} <span class="grd-txt">${esc(ab.headingAccent || '')}</span>`;
  }
  if (ab.image) $('#aboutImg').src = ab.image;
  if (Array.isArray(ab.badges)) {
    $('#aboutBadges').innerHTML = ab.badges.map(b =>
      `<span class="chip">${icon(b.icon || 'pin')} ${esc(b.text)}</span>`).join('');
  }
  if (Array.isArray(ab.paragraphs)) {
    $('#aboutParas').innerHTML = ab.paragraphs.map(p => `<p>${esc(p)}</p>`).join('');
  }
  if (Array.isArray(ab.chips)) {
    $('#aboutChips').innerHTML = ab.chips.map(t => `<span class="chip">${esc(t)}</span>`).join('');
  }

  /* Skills */
  const sk = c.skills || {};
  setText('[data-c="skills.label"]', sk.label);
  setText('[data-c="skills.heading"]', sk.heading);
  setText('[data-c="skills.sub"]', sk.sub);
  if (Array.isArray(sk.groups)) {
    $('#skGrid').innerHTML = sk.groups.map((g, i) => `
      <div class="sk-card card spot" data-reveal style="--rd:${(i % 2) * .08}s">
        <div class="sk-head">
          <div class="sk-ico ${esc(g.color || 'violet')}">${icon(g.icon || 'bot')}</div>
          <div class="sk-title">${esc(g.title)}</div>
        </div>
        <div class="sk-pills">${(g.pills || []).map(p => `<span class="sk-pill">${esc(p)}</span>`).join('')}</div>
      </div>`).join('');
  }
  if (Array.isArray(sk.logos)) {
    const item = l => `
      <a class="logo-item" href="${esc(l.url || '#')}" target="_blank" rel="noopener">
        <img src="${esc(l.img)}" alt="${esc(l.label)}" loading="lazy" width="32" height="32">
        <span>${esc(l.label)}</span>
      </a>`;
    $('#logoTrack').innerHTML = sk.logos.map(item).join('');
  }

  /* Experience */
  const ex = c.experience || {};
  setText('[data-c="experience.label"]', ex.label);
  setText('[data-c="experience.heading"]', ex.heading);
  setText('[data-c="experience.sub"]', ex.sub);
  if (Array.isArray(ex.items)) {
    $('#timeline').innerHTML = ex.items.map((it, i) => {
      const edu = it.type === 'education';
      const current = i === 0 && !edu;
      const bullets = (it.bullets || []).map(b => `<li>${esc(b)}</li>`).join('');
      const tags = (it.tags || []).map(t => `<span class="chip">${esc(t)}</span>`).join('');
      return `
      <div class="ti ${current ? 'current' : ''} ${edu ? 'edu' : ''}" data-reveal>
        <div class="ti-dot"></div>
        <div class="ti-card card spot">
          <div class="ti-top">
            <div>
              <div class="ti-role">${esc(it.role)}</div>
              <div class="ti-co">${esc(it.org)}</div>
            </div>
            <span class="ti-date">${esc(it.date)}</span>
          </div>
          <div class="ti-loc">${icon(edu ? 'grad' : 'pin')} ${esc(it.location)}</div>
          ${bullets ? `<div class="ti-body"><ul>${bullets}</ul></div>` : ''}
          ${tags ? `<div class="ti-tags">${tags}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  /* Projects */
  const pr = c.projects || {};
  setText('[data-c="projects.label"]', pr.label);
  setText('[data-c="projects.heading"]', pr.heading);
  setText('[data-c="projects.sub"]', pr.sub);
  if (pr.githubUrl) $('#projGithub').href = pr.githubUrl;
  if (Array.isArray(pr.items)) {
    $('#projGrid').innerHTML = pr.items.map((p, i) => `
      <a class="proj-card card" href="${esc(p.link)}" target="_blank" rel="noopener" data-reveal style="--rd:${(i % 3) * .08}s">
        <div class="proj-media">
          <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">
          <div class="proj-veil"><span class="proj-open">${icon('external')} ${esc(tr('proj.view'))}</span></div>
        </div>
        <div class="proj-body">
          <div class="proj-title"><span>${esc(p.title)}</span>${icon('arrow-up-right')}</div>
          <p class="proj-desc">${esc(p.desc)}</p>
        </div>
      </a>`).join('');
  }

  /* CTA */
  const ct = c.cta || {};
  setText('[data-c="cta.badge"]', ct.badge);
  if (ct.title1 != null) {
    $('#ctaTitle').innerHTML = `${esc(ct.title1)}<br><span class="grd-txt">${esc(ct.title2 || '')}</span>`;
  }
  setText('[data-c="cta.sub"]', ct.sub);

  /* Contact */
  const co = c.contact || {};
  setText('[data-c="contact.label"]', co.label);
  setText('[data-c="contact.heading"]', co.heading);
  setText('[data-c="contact.sub"]', co.sub);
  setText('[data-c="contact.intro"]', co.intro);
  const strip = u => String(u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const rows = [
    soc.email && { icon: 'mail', label: tr('row.email'), text: soc.email, href: `mailto:${soc.email}` },
    co.phone && { icon: 'phone', label: tr('row.phone'), text: co.phone, href: `tel:${co.phone.replace(/[^+\d]/g, '')}` },
    soc.linkedin && { icon: 'linkedin', label: tr('row.linkedin'), text: strip(soc.linkedin), href: soc.linkedin },
    soc.github && { icon: 'github', label: tr('row.github'), text: strip(soc.github), href: soc.github },
    co.location && { icon: 'pin', label: tr('row.location'), text: co.location },
  ].filter(Boolean);
  $('#ctRows').innerHTML = rows.map(r => `
    <${r.href ? `a href="${esc(r.href)}" ${r.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}` : 'div'} class="ct-row">
      <div class="ct-ico">${icon(r.icon)}</div>
      <div class="ct-txt"><strong>${esc(r.label)}</strong>${esc(r.text)}</div>
    </${r.href ? 'a' : 'div'}>`).join('');

  /* Footer */
  setText('[data-c="footer.copyright"]', c.footer?.copyright);

  return c;
}

/* ── Interactions (mounted after hydration so dynamic nodes count) ─── */
function mountContent(c) {
  /* Reveal on scroll — JS applies the classes so no-JS users see everything */
  const revealEls = $$('[data-reveal]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('on');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '9999px 0px -36px 0px' });  // huge top margin: fast scrolls can't skip elements permanently
    revealEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) return;  // already visible: never hide it
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* Typing loop */
  const typed = $('#typed');
  const fallbackRoles = ['ML Engineer', 'Data Scientist', 'Energy Forecasting Expert', 'LLM Systems Builder', 'MLOps Engineer'];
  const words = (c.hero?.roles?.length ? c.hero.roles : fallbackRoles).map(String);
  if (typed) {
    if (reduceMotion || words.length === 1) typed.textContent = words[0];
    else {
      let wi = 0, ci = 0, del = false, t;
      const tick = () => {
        const w = words[wi];
        typed.textContent = del ? w.slice(0, --ci) : w.slice(0, ++ci);
        let next = del ? 34 : 58;
        if (!del && ci === w.length) { del = true; next = 2300; }
        else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; next = 380; }
        t = setTimeout(tick, next);
      };
      tick();
      addEventListener('pagehide', () => clearTimeout(t));
    }
  }

  /* Counters — animate the numeric part of each stat ("<3%" → < 0..3 %) */
  const stats = $('#heroStats');
  const runCounters = () => $$('.hst-n', stats).forEach(el => {
    const m = String(el.dataset.count || '').match(/^([^0-9]*)(\d+)(.*)$/);
    if (!m) return;
    const [, pre, num, suf] = m, target = +num, t0 = performance.now(), dur = 1500;
    const step = now => {
      const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = `${pre}${Math.round(e * target)}${suf}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  if (stats && !reduceMotion && 'IntersectionObserver' in window) {
    const co = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { runCounters(); co.disconnect(); }
    }, { threshold: 0.4 });
    co.observe(stats);
  }

  /* Spotlight cursor tracking */
  if (finePointer) {
    $$('.spot').forEach(el => el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true }));
  }

  /* Hero photo tilt (subtle) */
  const pw = $('#photoWrap'), pt = $('#photoTilt');
  if (pw && pt && finePointer && !reduceMotion) {
    pw.addEventListener('mousemove', e => {
      const r = pw.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - .5) * 2;
      const y = ((e.clientY - r.top) / r.height - .5) * 2;
      pt.style.transition = 'transform .1s linear';
      pt.style.transform = `rotateX(${-y * 4.5}deg) rotateY(${x * 4.5}deg)`;
    }, { passive: true });
    pw.addEventListener('mouseleave', () => {
      pt.style.transition = 'transform .7s cubic-bezier(.22,1,.36,1)';
      pt.style.transform = 'rotateX(0) rotateY(0)';
    });
  }

  /* Marquee — duplicate the track once for a seamless loop */
  const track = $('#logoTrack');
  if (track && !reduceMotion && track.children.length) {
    track.innerHTML += track.innerHTML;
    $$('a', track).slice(track.children.length / 2).forEach(a => {
      a.setAttribute('aria-hidden', 'true');
      a.tabIndex = -1;
    });
  }
}

/* ── Résumé viewer ───────────────────────────────────────────────────
   Every “Resume” / “Lebenslauf” button opens the PDF in a dialog rather
   than throwing the visitor into a bare PDF tab, with download and
   open-in-a-tab still one click away. Where an inline PDF can't be
   trusted — phones, and any browser with its PDF viewer switched off —
   the link is left alone to open normally instead of trapping the
   visitor behind an empty frame. */
function mountCvViewer() {
  const modal = $('#cvModal');
  if (!modal) return;
  const frame = $('#cvFrame'), dl = $('#cvDownload'), newTab = $('#cvOpen'),
        closeBtn = $('#cvClose'), dialog = $('.cv-dialog', modal);
  let lastFocus = null;

  const canEmbed = () => {
    if (matchMedia('(max-width: 860px)').matches) return false;
    if ('pdfViewerEnabled' in navigator) return navigator.pdfViewerEnabled;
    return true;
  };

  const open = href => {
    lastFocus = document.activeElement;
    dl.href = href; newTab.href = href; frame.src = href;
    modal.hidden = false;
    root.classList.add('cv-open');
    lenis?.stop?.();
    closeBtn.focus();
  };
  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    frame.removeAttribute('src');          // stop the PDF rendering in the background
    root.classList.remove('cv-open');
    lenis?.start?.();
    lastFocus?.focus?.();
  };

  document.addEventListener('click', e => {
    const link = e.target.closest('[data-resume]');
    if (link) {
      const href = link.getAttribute('href');
      if (!href || !canEmbed()) return;     // let the browser open it normally
      e.preventDefault();
      open(href);
      return;
    }
    if (e.target.closest('[data-cv-close]') || e.target.closest('#cvClose')) close();
  });

  addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    /* Keep tabbing inside the dialog while it is open. */
    const f = $$('a[href], button, iframe', dialog).filter(el => !el.hasAttribute('disabled'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* ── Starfield (constellation canvas behind everything) ────────────── */
function mountStars() {
  const canvas = $('#stars');
  if (!canvas || reduceMotion || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let stars = [], w = 0, h = 0, raf = 0;

  const newStar = () => ({
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - .5) * .16, vy: (Math.random() - .5) * .16,
    r: Math.random() * 1.3 + .35, tw: Math.random() * Math.PI * 2,
  });
  /* Resize keeps existing stars (rescaled) so mobile URL-bar/keyboard
     resizes don't visibly re-shuffle the constellation. */
  const build = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const ow = w, oh = h;
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(90, Math.round((w * h) / 16000));
    if (ow && oh) stars.forEach(s => { s.x *= w / ow; s.y *= h / oh; });
    while (stars.length > n) stars.pop();
    while (stars.length < n) stars.push(newStar());
  };

  const LINK = 120;
  const draw = () => {
    const dark = root.getAttribute('data-theme') !== 'light';
    const starC = dark ? '170,190,255' : '70,80,140';
    const linkC = dark ? '130,155,255' : '70,80,140';
    const starA = dark ? .8 : .5, linkA = dark ? .16 : .1;
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.x += s.vx; s.y += s.vy; s.tw += .012;
      if (s.x < -8) s.x = w + 8; else if (s.x > w + 8) s.x = -8;
      if (s.y < -8) s.y = h + 8; else if (s.y > h + 8) s.y = -8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${starC},${(0.35 + 0.65 * Math.abs(Math.sin(s.tw))) * starA})`;
      ctx.fill();
    }
    for (let i = 0; i < stars.length; i++) for (let j = i + 1; j < stars.length; j++) {
      const a = stars[i], b = stars[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > LINK * LINK) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(${linkC},${(1 - Math.sqrt(d2) / LINK) * linkA})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    raf = requestAnimationFrame(draw);
  };

  const start = () => { if (!raf) raf = requestAnimationFrame(draw); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  build(); start();
  let rt;
  addEventListener('resize', () => {
    if (innerWidth === w && Math.abs(innerHeight - h) < 160) return;  // mobile URL-bar transitions
    clearTimeout(rt); rt = setTimeout(() => { build(); }, 200);
  });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
}

/* ── Cursor aura (fine pointers only) ──────────────────────────────── */
function mountCursorGlow() {
  const el = $('#cursorGlow');
  if (!el || !finePointer || reduceMotion) return;
  let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, raf = 0;
  const step = () => {
    x += (tx - x) * .09; y += (ty - y) * .09;
    el.style.transform = `translate(${x}px,${y}px)`;
    if (Math.abs(tx - x) + Math.abs(ty - y) > .5) raf = requestAnimationFrame(step);
    else raf = 0;
  };
  addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    el.classList.add('on');
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
}

/* ── Chrome (independent of content; mounted immediately) ──────────── */
function mountChrome() {
  applyLang();
  mountLangSwitch();
  mountCvViewer();
  /* Decorative only — must never take down the critical wiring below. */
  try { mountStars(); } catch (_) {}
  try { mountCursorGlow(); } catch (_) {}
  /* Lenis buttery scrolling (desktop, motion-ok only) */
  if (window.Lenis && finePointer && !reduceMotion) {
    lenis = new Lenis({ lerp: 0.105, wheelMultiplier: 1, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    document.documentElement.style.scrollBehavior = 'auto';
  }
  const scrollToEl = target => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -(parseInt(getComputedStyle(root).getPropertyValue('--nav-h')) + 16), duration: 1.15 });
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    closeMob();
    scrollToEl(id);
    history.replaceState(null, '', id);
  });

  /* Mobile menu */
  const hbg = $('#hbg'), mob = $('#mobDrop');
  function closeMob() {
    mob.classList.remove('op');
    hbg.classList.remove('op');
    hbg.setAttribute('aria-expanded', 'false');
  }
  hbg.addEventListener('click', () => {
    const open = !mob.classList.contains('op');
    mob.classList.toggle('op', open);
    hbg.classList.toggle('op', open);
    hbg.setAttribute('aria-expanded', String(open));
  });
  addEventListener('click', e => {
    if (!hbg.contains(e.target) && !mob.contains(e.target)) closeMob();
  });

  /* Nav: blur after scroll, hide on scroll down / show on up */
  const nav = $('.site-nav');
  const toTop = $('#toTop');
  const pbar = $('#pbar');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 24);
    if (Math.abs(y - lastY) > 6) {
      nav.classList.toggle('hidden', y > lastY && y > 420 && !mob.classList.contains('op'));
      lastY = y;
    }
    toTop.classList.toggle('show', y > 700);
    const max = document.documentElement.scrollHeight - innerHeight;
    pbar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => lenis ? lenis.scrollTo(0, { duration: 1.1 }) : scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  /* Active nav link */
  const navAs = $$('.nav-links a');
  if ('IntersectionObserver' in window) {
    $$('section[id]').forEach(s => new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting)
          navAs.forEach(a => a.classList.toggle('act', a.getAttribute('href') === `#${e.target.id}`));
      });
    }, { threshold: 0.32 }).observe(s));
  }

  /* Contact form → Web3Forms */
  const W3F_KEY = '735cd532-1ef3-45b8-8b51-6a1288ccdd9d';
  $('#cForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (PREVIEW) return;               // never actually send from the console preview
    const btn = this.querySelector('button[type=submit]');
    const msg = $('#fmsg');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = tr('form.sending');
    msg.className = '';
    try {
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: W3F_KEY,
          name: $('#fn').value.trim(),
          email: $('#fe').value.trim(),
          company: $('#fc').value.trim() || '—',
          role: $('#ft').value,
          message: $('#fm').value.trim() || '—',
          subject: `Portfolio inquiry · ${$('#fn').value.trim()} — ${$('#ft').value}`,
          from_name: 'Portfolio Contact Form',
        }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || 'Failed');
      msg.textContent = tr('form.ok');
      msg.className = 'ok';
      this.reset();
    } catch (_) {
      msg.textContent = tr('form.err');
      msg.className = 'er';
    }
    btn.disabled = false;
    btn.innerHTML = orig;
  });
}

/* ── Live preview (driven by the developer console over postMessage) ─── */
function applyPreview(c) {
  const content = localize(c || {});
  try { render(content); } catch (_) {}
  /* No scroll-reveal in the preview — show every section immediately. */
  $$('[data-reveal]').forEach(el => el.classList.remove('reveal'));
  /* Static typed line (first role) — the looping animation would flicker on every keystroke. */
  const typed = $('#typed');
  if (typed) {
    const roles = Array.isArray(content.hero?.roles) ? content.hero.roles.map(String) : [];
    typed.textContent = roles[0] || typed.textContent || '';
  }
}

async function initPreview() {
  root.classList.add('is-preview');
  /* Baseline from the published content so the frame isn't blank before the first message. */
  try {
    const r = await fetch(`content.json?v=${Date.now()}`, { cache: 'no-cache' });
    if (r.ok) applyPreview(await r.json());
  } catch (_) {}
  addEventListener('message', e => {
    const d = e.data || {};
    if (d.type === 'pf-preview') applyPreview(d.content);
    else if (d.type === 'pf-theme' && d.theme) setTheme(d.theme);
    else if (d.type === 'pf-scroll' && d.section) {
      const el = document.getElementById(d.section);
      if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  });
  try { parent.postMessage({ type: 'pf-ready' }, '*'); } catch (_) {}
}

/* ── Boot ───────────────────────────────────────────────────────────── */
const boot = async () => {
  mountChrome();
  if (PREVIEW) { initPreview(); return; }
  let content = {};
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(`content.json?v=${Date.now()}`, { signal: ctl.signal, cache: 'no-cache' });
    clearTimeout(timer);
    if (r.ok) content = render(localize(await r.json()));
  } catch (_) { /* static fallback markup stays */ }
  mountContent(content);
  restoreLangScroll();
};
document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();
})();
