/* ════════════════════════════════════════════════════════════════════
   Résumé PDF generator — turns the structured `resume` block from
   content.json into a clean, ATS-friendly, selectable-text PDF.
   Pure function buildResumePdf(jsPDF, data) so it runs in the browser
   (developer console) and in Node (tests). Two templates + accent color.
   ════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  const HEX = {
    violet: '#7c3aed', blue: '#2563eb', teal: '#0d9488',
    slate: '#334155', rose: '#e11d48', green: '#047857', black: '#111827',
  };
  const ACCENTS = Object.keys(HEX);

  const strip = u => String(u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  function hexToRgb(h) {
    h = String(h || '#7c3aed').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const accentRgb = name => hexToRgb(HEX[name] || name || '#7c3aed');

  function buildResumePdf(jsPDF, r) {
    if (!jsPDF) throw new Error('jsPDF not available');
    r = r || {};
    const classic = (r.template || 'modern') === 'classic';
    const FONT = classic ? 'times' : 'helvetica';
    const acc = classic ? [17, 24, 39] : accentRgb(r.accent);
    const dark = [31, 41, 55], gray = [107, 114, 128], line = [212, 216, 224];

    const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: false });
    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const M = 48, CW = PW - M * 2;
    let y = 52;

    const setF = (style, size, color) => {
      doc.setFont(FONT, style); doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
    };
    const ensure = h => { if (y + h > PH - 46) { doc.addPage(); y = 52; } };
    const wrapAt = (text, size, style, w) => {
      doc.setFont(FONT, style); doc.setFontSize(size);
      return doc.splitTextToSize(String(text == null ? '' : text), w || CW);
    };

    /* ── Header ── */
    setF('bold', classic ? 23 : 21, dark);
    const name = r.name || 'Your Name';
    if (classic) doc.text(name, PW / 2, y, { align: 'center' });
    else doc.text(name, M, y);
    y += 6;

    if (r.title) {
      setF(classic ? 'italic' : 'normal', 11.5, acc);
      if (classic) { doc.text(r.title, PW / 2, y + 9, { align: 'center' }); }
      else { doc.text(r.title, M, y + 10); }
      y += 21;
    } else { y += 12; }

    const c = r.contact || {};
    const parts = [c.email, c.phone, c.location, strip(c.linkedin), strip(c.github), strip(c.website)].filter(Boolean);
    if (parts.length) {
      setF('normal', 9, gray);
      const lines = doc.splitTextToSize(parts.join('   |   '), CW);
      if (classic) doc.text(lines, PW / 2, y, { align: 'center' });
      else doc.text(lines, M, y);
      y += lines.length * 12;
    }
    y += 6;
    doc.setDrawColor(acc[0], acc[1], acc[2]);
    doc.setLineWidth(classic ? 0.8 : 1.4);
    doc.line(M, y, PW - M, y);
    y += 17;

    const heading = t => {
      ensure(30);
      setF('bold', 10.5, classic ? dark : acc);
      doc.text(String(t).toUpperCase(), M, y);
      y += 5;
      doc.setDrawColor(line[0], line[1], line[2]); doc.setLineWidth(0.5);
      doc.line(M, y, PW - M, y);
      y += 13;
    };
    const paragraph = t => {
      const lines = wrapAt(t, 9.5, 'normal', CW);
      ensure(lines.length * 12);
      setF('normal', 9.5, dark);
      doc.text(lines, M, y);
      y += lines.length * 12 + 4;
    };

    /* ── Summary ── */
    if (r.summary) { heading('Summary'); paragraph(r.summary); y += 2; }

    /* ── Experience ── */
    const exp = Array.isArray(r.experience) ? r.experience : [];
    if (exp.length) {
      heading('Experience');
      exp.forEach(e => {
        ensure(34);
        setF('bold', 11, dark);
        doc.text(String(e.role || ''), M, y);
        if (e.date) { setF('normal', 9, gray); doc.text(String(e.date), PW - M, y, { align: 'right' }); }
        y += 13;
        const orgLine = [e.org, e.location].filter(Boolean).join('   ·   ');
        if (orgLine) {
          setF(classic ? 'italic' : 'bold', 9.8, classic ? dark : acc);
          const ol = doc.splitTextToSize(orgLine, CW);
          doc.text(ol, M, y); y += ol.length * 12;
        }
        (e.bullets || []).filter(Boolean).forEach(b => {
          const lines = wrapAt(b, 9.5, 'normal', CW - 14);
          ensure(lines.length * 12);
          setF('normal', 9.5, dark);
          doc.text('•', M + 2, y);
          doc.text(lines, M + 14, y);
          y += lines.length * 12 + 1;
        });
        y += 8;
      });
    }

    /* ── Skills ── */
    const sk = Array.isArray(r.skills) ? r.skills : [];
    if (sk.length) {
      heading('Skills');
      sk.forEach(g => {
        const cat = (g.category || '') + (g.category ? ':  ' : '');
        const items = (g.items || []).join(', ');
        setF('bold', 9.5, dark);
        const catW = doc.getTextWidth(cat);
        setF('normal', 9.5, dark);
        const itemLines = doc.splitTextToSize(items, CW - catW);
        ensure(Math.max(1, itemLines.length) * 12);
        setF('bold', 9.5, dark); doc.text(cat, M, y);
        setF('normal', 9.5, dark); doc.text(itemLines, M + catW, y);
        y += Math.max(1, itemLines.length) * 12 + 3;
      });
      y += 2;
    }

    /* ── Education ── */
    const edu = Array.isArray(r.education) ? r.education : [];
    if (edu.length) {
      heading('Education');
      edu.forEach(e => {
        ensure(24);
        setF('bold', 10.5, dark); doc.text(String(e.degree || ''), M, y);
        if (e.date) { setF('normal', 9, gray); doc.text(String(e.date), PW - M, y, { align: 'right' }); }
        y += 12;
        const det = [e.org, e.detail].filter(Boolean).join('   ·   ');
        if (det) {
          setF(classic ? 'italic' : 'normal', 9.5, classic ? dark : acc);
          const dl = doc.splitTextToSize(det, CW);
          doc.text(dl, M, y); y += dl.length * 12;
        }
        y += 7;
      });
    }

    /* ── Certifications ── */
    const certs = Array.isArray(r.certifications) ? r.certifications.filter(Boolean) : [];
    if (certs.length) { heading('Certifications'); paragraph(certs.join('   •   ')); }

    return doc;
  }

  const api = {
    ACCENTS,
    buildResumePdf,
    build(r) { return buildResumePdf((root.jspdf || {}).jsPDF, r); },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ResumeTemplate = api;
})(typeof window !== 'undefined' ? window : globalThis);
