import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";

export interface PdfHeaderOptions {
  agencyAcronym: string;
  agencyName: string;
  logoSrc?: string | null; // base64 data URI or absolute URL
  startYear: number;
  endYear: number;
}

export interface GeneratePdfOptions {
  /**
   * Enables the two-pass TOC flow: the initial `html` (rendered with invisible
   * @@toc:id@@ markers) is printed once, the markers are located per physical
   * page, and this callback returns the final HTML rendered with real numbers.
   */
  finalizeHtml?: (tocPages: Record<string, number>) => string;
}

// Case-insensitive: headings use CSS text-transform:uppercase, and the PDF
// text layer stores the transformed (uppercased) marker text.
const TOC_MARKER_RE = /@@toc:([a-z0-9-]+)@@/gi;

/** Map each @@toc:id@@ marker to the 1-based physical page it appears on. */
async function scanTocMarkers(pdfBytes: Uint8Array): Promise<Record<string, number>> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = getDocument({ data: pdfBytes });
  const pages: Record<string, number> = {};
  try {
    const doc = await loadingTask.promise;
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((it) => ("str" in it ? it.str : "")).join("");
      for (const match of text.matchAll(TOC_MARKER_RE)) {
        const id = match[1].toLowerCase();
        if (!(id in pages)) pages[id] = i; // first occurrence wins
      }
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function generatePdf(
  html: string,
  header: PdfHeaderOptions,
  opts: GeneratePdfOptions = {}
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  // Single logo block — logo image + acronym label, or just acronym text if no logo.
  // The previous version had `logoHtml` (which already included the acronym when no logo)
  // AND a separate explicit acronym span, causing "NCWTR NCWTR" on every page.
  const logoBlock = header.logoSrc?.startsWith("data:image/")
    ? `<img src="${esc(header.logoSrc)}" style="height:18px;width:auto;object-fit:contain;flex-shrink:0;" />
       <span style="font-weight:bold;">${esc(header.agencyAcronym)}</span>`
    : `<span style="font-weight:bold;">${esc(header.agencyAcronym)}</span>`;

  const headerTemplate = `
    <div style="
      width:100%;
      font-family:P052,'Palatino Linotype','Book Antiqua',Georgia,serif;
      font-size:8pt;
      padding:0 25.4mm;
      display:flex;
      align-items:center;
      justify-content:space-between;
      border-bottom:1px solid #000;
      padding-bottom:3px;
      box-sizing:border-box;
    ">
      <div style="display:flex;align-items:center;gap:6px;">${logoBlock}</div>
      <span style="font-size:8pt;">Information Systems Strategic Plan ${header.startYear}–${header.endYear}</span>
    </div>`;

  const footerTemplate = `
    <div style="
      width:100%;
      font-family:P052,'Palatino Linotype','Book Antiqua',Georgia,serif;
      font-size:8pt;
      font-style:italic;
      padding:0 25.4mm;
      text-align:right;
      box-sizing:border-box;
    ">Page <span class="pageNumber"></span></div>`;

  const pdfOptions = {
    format: "A4" as const,
    landscape: true,
    printBackground: true,
    margin: { top: "25.4mm", right: "25.4mm", bottom: "25.4mm", left: "25.4mm" },
  };

  try {
    const page = await browser.newPage();

    // The document is attacker-influenced (public export endpoint): never execute
    // its scripts, and only allow same-origin image fetches (legacy /uploads paths).
    // data: URIs don't hit the network and are unaffected by interception.
    await page.setJavaScriptEnabled(false);
    const allowedOrigin = new URL(process.env.NEXTAUTH_URL || "http://localhost:3000").origin;
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      const allowed =
        url.startsWith("data:image/") ||
        url === "about:blank" ||
        url.startsWith(`${allowedOrigin}/`);
      if (allowed) void req.continue();
      else void req.abort();
    });

    const waitForImages = () =>
      page.evaluate(() =>
        Promise.all(
          [...document.querySelectorAll("img")].map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => {
                  img.addEventListener("load", () => res());
                  img.addEventListener("error", () => res());
                })
          )
        )
      );

    let finalHtml = html;
    if (opts.finalizeHtml) {
      // Pass 1: print the marker build (same margins/format, header/footer
      // don't affect layout) and locate each section's physical page.
      await page.setContent(html, { waitUntil: "load", timeout: 30000 });
      await waitForImages();
      const passOneBytes = await page.pdf({ ...pdfOptions, displayHeaderFooter: false });
      const tocPages = await scanTocMarkers(passOneBytes);
      finalHtml = opts.finalizeHtml(tocPages);
    }

    await page.setContent(finalHtml, { waitUntil: "load", timeout: 30000 });
    await waitForImages();

    // Full PDF with running header + footer on every page (cover will be replaced)
    const fullPdfBytes = await page.pdf({
      ...pdfOptions,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
    });

    // Cover-only PDF with no Puppeteer header or footer
    const coverPdfBytes = await page.pdf({
      ...pdfOptions,
      displayHeaderFooter: false,
      pageRanges: "1",
    });

    // Merge: clean cover (page 1 of coverPdf) + content pages (pages 2-N of fullPdf)
    const finalDoc = await PDFDocument.create();

    const coverDoc = await PDFDocument.load(coverPdfBytes);
    const fullDoc = await PDFDocument.load(fullPdfBytes);

    const [coverPage] = await finalDoc.copyPages(coverDoc, [0]);
    finalDoc.addPage(coverPage);

    const totalPages = fullDoc.getPageCount();
    if (totalPages > 1) {
      const contentIndices = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
      const contentPages = await finalDoc.copyPages(fullDoc, contentIndices);
      for (const p of contentPages) finalDoc.addPage(p);
    }

    const mergedBytes = await finalDoc.save();
    return Buffer.from(mergedBytes);
  } finally {
    await browser.close();
  }
}
