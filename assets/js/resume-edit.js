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

  /* Sample the background colour just to the right of a text run (stays inside
     the same band, so gray section headers stay gray, white stays white). */
  function sampleBg(page, item) {
    const ctx = page.canvas.getContext('2d', { willReadFrequently: true });
    const cx = Math.round((item.x + item.width + 4) * page.scale);
    const cy = Math.round((page.ph - (item.y + item.size * 0.35)) * page.scale);
    const X = Math.min(Math.max(cx, 0), page.canvas.width - 1);
    const Y = Math.min(Math.max(cy, 0), page.canvas.height - 1);
    try { const d = ctx.getImageData(X, Y, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255]; }
    catch (_) { return [1, 1, 1]; }
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
      let size = item.size;
      // shrink to fit the original width so nothing overflows the template
      while (size > 4 && f.widthOfTextAtSize(txt, size) > item.width + 0.5) size -= 0.25;
      const dark = rgb(0.12, 0.12, 0.13);
      pdfPage.drawText(txt, { x: item.x, y: item.y, size, font: f, color: e.color || dark });
    });
    return pl.save();
  }

  window.ResumeEdit = { extract, build, sampleBg, RENDER_SCALE };
})();
