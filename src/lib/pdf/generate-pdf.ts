import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";

export interface PdfHeaderOptions {
  agencyAcronym: string;
  agencyName: string;
  logoSrc?: string | null; // base64 data URI or absolute URL
  startYear: number;
  endYear: number;
}

export interface IsspPdfParts {
  /**
   * Parts I–IV as a standalone document. Printed with the running agency
   * header and "Page N" footer; numbering starts at 1 on Part I, per the
   * DICT template. When `finalizeContentHtml` is set, this build should
   * carry the invisible @@toc:id@@ markers for the pass-1 page scan.
   */
  contentHtml: string;
  /** Re-render of the content without markers, given the scanned TOC pages. */
  finalizeContentHtml?: (tocPages: Record<string, number>) => string;
  /**
   * Cover + TOC + definition of terms, given the scanned TOC pages.
   * Printed without header or footer.
   */
  frontHtml: (tocPages: Record<string, number>) => string;
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
  parts: IsspPdfParts,
  header: PdfHeaderOptions
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

  // Template header (Parts I–IV only): agency logo upper-left, centered bold
  // "INFORMATION SYSTEMS STRATEGIC PLAN <start> - <end>". Falls back to the
  // bold acronym on the left when no logo is set.
  const logoBlock = header.logoSrc?.startsWith("data:image/")
    ? `<img src="${esc(header.logoSrc)}" style="height:34px;width:auto;object-fit:contain;" />`
    : `<span style="font-size:10pt;font-weight:bold;">${esc(header.agencyAcronym)}</span>`;

  const headerTemplate = `
    <div style="
      width:100%;
      height:58px;
      font-family:P052,'Palatino Linotype','Book Antiqua',Georgia,serif;
      padding:0 25.4mm;
      position:relative;
      display:flex;
      align-items:center;
      justify-content:center;
      box-sizing:border-box;
    ">
      <div style="position:absolute;left:25.4mm;top:50%;transform:translateY(-50%);display:flex;align-items:center;">${logoBlock}</div>
      <span style="font-size:10.5pt;font-weight:bold;letter-spacing:0.02em;">INFORMATION SYSTEMS STRATEGIC PLAN ${header.startYear} - ${header.endYear}</span>
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

    // Pass 1: print the content (marker build) without header/footer and map
    // each section marker to its content-relative page — which IS the printed
    // page number, since content numbering restarts at Part I.
    let tocPages: Record<string, number> = {};
    let contentHtml = parts.contentHtml;
    if (parts.finalizeContentHtml) {
      await page.setContent(contentHtml, { waitUntil: "load", timeout: 30000 });
      await waitForImages();
      const passOneBytes = await page.pdf({ ...pdfOptions, displayHeaderFooter: false });
      tocPages = await scanTocMarkers(passOneBytes);
      contentHtml = parts.finalizeContentHtml(tocPages);
    }

    // Content (Parts I–IV) with the agency header and "Page N" footer.
    await page.setContent(contentHtml, { waitUntil: "load", timeout: 30000 });
    await waitForImages();
    const contentPdfBytes = await page.pdf({
      ...pdfOptions,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
    });

    // Front matter (cover, TOC, definitions) — no header, no footer.
    await page.setContent(parts.frontHtml(tocPages), { waitUntil: "load", timeout: 30000 });
    await waitForImages();
    const frontPdfBytes = await page.pdf({ ...pdfOptions, displayHeaderFooter: false });

    // Merge: front matter pages, then content pages.
    const finalDoc = await PDFDocument.create();
    for (const bytes of [frontPdfBytes, contentPdfBytes]) {
      const doc = await PDFDocument.load(bytes);
      const copied = await finalDoc.copyPages(doc, doc.getPageIndices());
      for (const p of copied) finalDoc.addPage(p);
    }

    const mergedBytes = await finalDoc.save();
    return Buffer.from(mergedBytes);
  } finally {
    await browser.close();
  }
}
