import express, { Request, Response } from 'express';
import puppeteer, { Browser } from 'puppeteer';

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = Number(process.env.PDF_SERVER_PORT) || 3001;
const VITE_ORIGIN = process.env.VITE_DEV_ORIGIN || 'http://localhost:3000';

let browserPromise: Promise<Browser> | null = null;
const getBrowser = () => {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    browserPromise.catch(() => { browserPromise = null; });
  }
  return browserPromise;
};

// Nur echte Print-Essentials. KEINE .editable-Overrides — die würden:
//   - Tabellen-Rahmen (.border .border-gray-300 .editable) killen
//   - Schreib-Linien (.schreib-linie .editable, Hintergrund-Gradient) killen
const PRINT_STYLES = `
@page { size: A4; margin: 0; }
html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
#dossier-root {
  width: 21cm !important;
  margin: 0 !important;
  padding: 0 !important;
  background: white !important;
  box-shadow: none !important;
}
#dossier-root > *:not(.page-break) {
  box-shadow: none !important;
  outline: none !important;
  margin: 0 !important;
  page-break-after: always;
  break-after: page;
}
#dossier-root > *:last-child {
  page-break-after: auto;
  break-after: auto;
}
#dossier-root > .page-break { display: none !important; }
.avoid-break { page-break-inside: avoid; break-inside: avoid; }
.active-block-highlight, .active-page-highlight {
  box-shadow: none !important;
  outline: none !important;
  background-color: transparent !important;
}
/* Hover/focus-States der .editable im PDF neutralisieren (Puppeteer triggert sie eh nicht,
   aber zur Sicherheit). WICHTIG: nicht .editable selbst überschreiben! */
.editable:hover, .editable:focus {
  background-color: transparent !important;
  outline: none !important;
}
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}
`;

app.post('/api/pdf', async (req: Request, res: Response) => {
  const { html, projectName, hideSolutions } = req.body as { html?: string; projectName?: string; hideSolutions?: boolean };
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'html (string) is required' });
  }

  const safeName = (projectName || 'Dossier')
    .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '')
    .replace(/\s+/g, '_')
    .trim() || 'Dossier';

  const started = Date.now();
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // Boot the real app so Vite's compiled Tailwind CSS (incl. @theme vars) is loaded.
    await page.goto(VITE_ORIGIN, { waitUntil: 'load', timeout: 60000 });
    // React mountet erst NACH load-Event: warten, bis Editor-Shell inkl. #dossier-root existiert.
    await page.waitForSelector('#dossier-root', { timeout: 30000 });

    // WICHTIG: body.innerHTML NICHT überschreiben — das würde den React-Baum inkl.
    // inline <style dangerouslySetInnerHTML> zerstören (dort leben .is-highlight-answer,
    // .is-strikethrough-answer, .gap-line, table td {height}, usw.).
    // Stattdessen: #dossier-root auf body-Ebene verschieben, Geschwister ausblenden,
    // Inhalt tauschen.
    await page.evaluate((dossierHtml: string, printStyles: string, hide: boolean) => {
      const root = document.getElementById('dossier-root');
      if (!root) throw new Error('#dossier-root not found in app shell');
      document.body.appendChild(root);
      Array.from(document.body.children).forEach(child => {
        if (child !== root) {
          (child as HTMLElement).style.display = 'none';
        }
      });
      root.innerHTML = dossierHtml;
      if (hide) {
        root.classList.add('hide-solutions');
      } else {
        root.classList.remove('hide-solutions');
      }
      const style = document.createElement('style');
      style.setAttribute('data-print-shell', 'true');
      style.textContent = printStyles;
      document.head.appendChild(style);
    }, html, PRINT_STYLES, !!hideSolutions);

    // Fonts + images settle
    await page.evaluate(() => (document as any).fonts?.ready);
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>(resolve => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
        )
      );
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(pdfBuffer));
    console.log(`[pdf] ${safeName}: ${((Date.now() - started) / 1000).toFixed(1)}s, ${pdfBuffer.length} bytes`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[pdf] failed:', message);
    res.status(500).json({ error: message });
  } finally {
    if (page) {
      try { await page.close(); } catch { /* ignore */ }
    }
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`PDF server listening on http://localhost:${PORT}`);
  console.log(`Proxying Vite origin: ${VITE_ORIGIN}`);
});

const shutdown = async () => {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      await b.close();
    } catch { /* ignore */ }
  }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
