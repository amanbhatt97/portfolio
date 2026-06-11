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
  try { localStorage.setItem('theme', t); } catch (_) {}
};
setTheme((() => {
  try { const s = localStorage.getItem('theme'); if (s) return s; } catch (_) {}
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
})());
$('#themeBtn')?.addEventListener('click', () =>
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

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
  if (c.resume?.file) $$('[data-resume]').forEach(a => { a.href = c.resume.file; });

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
          <div class="proj-veil"><span class="proj-open">${icon('external')} View app</span></div>
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
    soc.email && { icon: 'mail', label: 'email', text: soc.email, href: `mailto:${soc.email}` },
    co.phone && { icon: 'phone', label: 'phone', text: co.phone, href: `tel:${co.phone.replace(/[^+\d]/g, '')}` },
    soc.linkedin && { icon: 'linkedin', label: 'linkedin', text: strip(soc.linkedin), href: soc.linkedin },
    soc.github && { icon: 'github', label: 'github', text: strip(soc.github), href: soc.github },
    co.location && { icon: 'pin', label: 'location', text: co.location },
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

/* ── Chrome (independent of content; mounted immediately) ──────────── */
function mountChrome() {
  /* Lenis buttery scrolling (desktop, motion-ok only) */
  let lenis = null;
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
  const nav = $('nav');
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
    const btn = this.querySelector('button[type=submit]');
    const msg = $('#fmsg');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Sending…';
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
      msg.textContent = "✓ Message sent! I'll reply within 24 hours.";
      msg.className = 'ok';
      this.reset();
    } catch (_) {
      msg.textContent = '✕ Could not send. Please email me directly.';
      msg.className = 'er';
    }
    btn.disabled = false;
    btn.innerHTML = orig;
  });
}

/* ── Boot ───────────────────────────────────────────────────────────── */
const boot = async () => {
  mountChrome();
  let content = {};
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(`content.json?v=${Date.now()}`, { signal: ctl.signal, cache: 'no-cache' });
    clearTimeout(timer);
    if (r.ok) content = render(await r.json());
  } catch (_) { /* static fallback markup stays */ }
  mountContent(content);
};
document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();
})();
