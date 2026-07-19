/* ════════════════════════════════════════════════════════════════════
   In-place résumé text editor — edits the TEXT of an existing PDF while
   keeping its template intact. Uses pdf.js to read each text run's exact
   position + the rendered pixels (to sample the background), and pdf-lib
   to cover the old run and redraw the new text at the same spot.
   Works on any uploaded PDF; nothing about the layout is regenerated.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const RENDER_SCALE = 2;   // canvas resolution for preview + background sampling

  function libs() {
    const pdfjs = window.pdfjsLib;
    const PDFLib = window.PDFLib;
    if (!pdfjs || !PDFLib) throw new Error('PDF libraries not loaded yet — reload the page.');
    if (pdfjs.GlobalWorkerOptions.workerSrc == null) pdfjs.GlobalWorkerOptions.workerSrc = 'assets/js/vendor/pdf.worker.min.js';
    return { pdfjs, PDFLib };
  }

  /* Read a PDF → rendered page canvases + every editable text run with its
     PDF-space geometry (origin bottom-left, matching pdf-lib). */
  async function extract(arrayBuffer) {
    const { pdfjs } = libs();
    const doc = await pdfjs.getDocument({ data: arrayBuffer.slice(0) }).promise;
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      // paint an opaque white page first — pdf.js renders on a transparent
      // canvas, so blank areas would otherwise sample as (0,0,0) = black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const tc = await page.getTextContent();
      let idx = 0;
      const items = tc.items
        .filter(it => it.str && it.str.trim().length)
        .map(it => {
          const t = it.transform;
          return {
            id: `${p}:${idx++}`, page: p - 1,
            str: it.str, x: t[4], y: t[5],
            size: Math.hypot(t[0], t[1]) || it.height || 10,
            width: it.width,
          };
        });
      pages.push({ num: p, canvas, scale: RENDER_SCALE, pw: base.width, ph: base.height, items });
    }
    return { numPages: doc.numPages, pages };
  }

  /* Find the background colour around a text run so the cover box blends in
     (white body stays white, gray section bands stay gray). Tries several
     points near the run and returns the first light one; text pixels (dark)
     and transparent pixels are skipped, defaulting to white. */
  function sampleBg(page, item) {
    const ctx = page.canvas.getContext('2d', { willReadFrequently: true });
    const s = page.scale, W = page.canvas.width, H = page.canvas.height;
    const pts = [
      [item.x + item.width + 4, item.y + item.size * 0.35],  // just right of the run
      [item.x + item.width + 9, item.y + item.size * 0.35],
      [item.x - 4,              item.y + item.size * 0.35],  // just left
      [item.x + item.width / 2, item.y + item.size * 1.55],  // in the gap above
    ];
    for (const [px, py] of pts) {
      const X = Math.min(Math.max(Math.round(px * s), 0), W - 1);
      const Y = Math.min(Math.max(Math.round((page.ph - py) * s), 0), H - 1);
      try {
        const d = ctx.getImageData(X, Y, 1, 1).data;
        if (d[3] < 8) return [1, 1, 1];                       // transparent → white
        const lum = (d[0] * 0.299 + d[1] * 0.587 + d[2] * 0.114) / 255;
        if (lum > 0.5) return [d[0] / 255, d[1] / 255, d[2] / 255];  // a light background
      } catch (_) { /* try next point */ }
    }
    return [1, 1, 1];   // couldn't find a clean light sample → assume white
  }

  /* Rebuild the PDF with the edited runs re-typeset in place. */
  async function build(originalBytes, extracted, edits, opts) {
    const { PDFLib } = libs();
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pl = await PDFDocument.load(originalBytes.slice(0));
    const serif = (opts && opts.font) === 'serif';
    const font = await pl.embedFont(serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
    const fontB = await pl.embedFont(serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
    const pages = pl.getPages();

    edits.forEach(e => {
      const ex = extracted.pages[e.page];
      const item = ex.items.find(i => i.id === e.id);
      const pdfPage = pages[e.page];
      if (!item || !pdfPage) return;

      const bg = sampleBg(ex, item);
      // cover the original glyph run
      pdfPage.drawRectangle({
        x: item.x - 1, y: item.y - item.size * 0.30,
        width: item.width + 2, height: item.size * 1.32,
        color: rgb(bg[0], bg[1], bg[2]),
      });
      const txt = e.newStr == null ? '' : String(e.newStr);
      if (!txt.trim()) return;
      const f = e.bold ? fontB : font;

      // Keep the ORIGINAL size — only shrink if the text would run into the
      // next run on the same line (e.g. a right-aligned date) or off the page.
      const pageW = pdfPage.getWidth();
      const rightRuns = ex.items.filter(i =>
        i.id !== item.id && i.x > item.x + 1 && Math.abs(i.y - item.y) < item.size * 0.6);
      const rightBound = rightRuns.length ? Math.min(...rightRuns.map(i => i.x)) - 3 : pageW - 34;
      const avail = Math.max(item.width, rightBound - item.x);
      let size = item.size;
      while (size > item.size * 0.7 && f.widthOfTextAtSize(txt, size) > avail) size -= 0.3;

      const dark = rgb(0.12, 0.12, 0.13);
      pdfPage.drawText(txt, { x: item.x, y: item.y, size, font: f, color: e.color || dark, lineHeight: item.size });
    });
    return pl.save();
  }

  window.ResumeEdit = { extract, build, sampleBg, RENDER_SCALE };
})();
