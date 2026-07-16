import puppeteer from "puppeteer";
import {
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFString,
  type PDFRef,
} from "pdf-lib";
import type { TocEntry } from "./render-issp-html";

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
  frontHtml: (tocPages: Record<string, number>, withDefinitionMarker?: boolean) => string;
  /** Optional Annex 1 HTML. Printed with the running header and appended after Parts I–IV. */
  annex1Html?: string | null;
  /** Printed TOC rows reused to build clickable links and the PDF bookmark outline. */
  tocEntries?: TocEntry[];
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

const TOC_LINK_PREFIX = "https://issp.local/toc/";

interface OutlineNode extends TocEntry {
  children: OutlineNode[];
}

/** Convert the flat TOC levels into a PDF outline hierarchy. */
function buildOutlineTree(entries: TocEntry[]): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const stack: { depth: number; node: OutlineNode }[] = [];
  const depthOf = (level: TocEntry["level"]) => level === "part" ? 0 : level === "section" ? 1 : 2;

  for (const entry of entries) {
    const node: OutlineNode = { ...entry, children: [] };
    const depth = depthOf(entry.level);
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1]?.node;
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push({ depth, node });
  }
  return roots;
}

/** Replace Chromium's synthetic TOC URLs with internal GoTo actions. */
function convertTocLinksToInternalDestinations(
  pdf: PDFDocument,
  entries: TocEntry[],
  tocPages: Record<string, number>,
  contentStartIndex: number,
  definitionsPageIndex: number | null
): void {
  const validIds = new Set(entries.map((entry) => entry.id));
  for (const page of pdf.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const annot = annots.lookupMaybe(i, PDFDict);
      const action = annot?.lookupMaybe(PDFName.of("A"), PDFDict);
      const uriObject = action?.lookupMaybe(PDFName.of("URI"), PDFString, PDFHexString);
      const uri = uriObject?.decodeText();
      if (!uri?.startsWith(TOC_LINK_PREFIX)) continue;

      const id = uri.slice(TOC_LINK_PREFIX.length);
      if (!validIds.has(id)) continue;
      const targetIndex = id === "defs"
        ? definitionsPageIndex
        : tocPages[id] ? contentStartIndex + tocPages[id] - 1 : null;
      const targetPage = targetIndex === null ? undefined : pdf.getPages()[targetIndex];
      if (!targetPage || !action) continue;

      action.set(PDFName.of("S"), PDFName.of("GoTo"));
      action.set(PDFName.of("D"), pdf.context.obj([targetPage.ref, PDFName.of("FitH"), targetPage.getHeight()]));
      action.delete(PDFName.of("URI"));
    }
  }
}

/** Add a nested sidebar bookmark outline using the same rows as the printed TOC. */
function addPdfOutline(
  pdf: PDFDocument,
  entries: TocEntry[],
  tocPages: Record<string, number>,
  contentStartIndex: number,
  definitionsPageIndex: number | null
): void {
  const context = pdf.context;
  const outlineRoot = PDFDict.withContext(context);
  const outlineRootRef = context.register(outlineRoot);

  const addLevel = (nodes: OutlineNode[], parentRef: PDFRef): { first?: PDFRef; last?: PDFRef; descendants: number } => {
    const refs = nodes.map(() => context.nextRef());
    let descendants = 0;

    nodes.forEach((node, index) => {
      const targetIndex = node.id === "defs"
        ? definitionsPageIndex
        : tocPages[node.id] ? contentStartIndex + tocPages[node.id] - 1 : null;
      const targetPage = targetIndex === null ? undefined : pdf.getPages()[targetIndex];
      if (!targetPage) return;

      const item = PDFDict.withContext(context);
      item.set(PDFName.of("Title"), PDFHexString.fromText(node.label));
      item.set(PDFName.of("Parent"), parentRef);
      item.set(PDFName.of("Dest"), context.obj([targetPage.ref, PDFName.of("FitH"), targetPage.getHeight()]));
      if (refs[index - 1]) item.set(PDFName.of("Prev"), refs[index - 1]);
      if (refs[index + 1]) item.set(PDFName.of("Next"), refs[index + 1]);

      if (node.children.length) {
        const childLevel = addLevel(node.children, refs[index]);
        if (childLevel.first && childLevel.last) {
          item.set(PDFName.of("First"), childLevel.first);
          item.set(PDFName.of("Last"), childLevel.last);
          item.set(PDFName.of("Count"), PDFNumber.of(childLevel.descendants));
          descendants += childLevel.descendants;
        }
      }
      context.assign(refs[index], item);
      descendants += 1;
    });

    return { first: refs[0], last: refs[refs.length - 1], descendants };
  };

  const roots = buildOutlineTree(entries);
  const level = addLevel(roots, outlineRootRef);
  if (!level.first || !level.last) return;
  outlineRoot.set(PDFName.of("Type"), PDFName.of("Outlines"));
  outlineRoot.set(PDFName.of("First"), level.first);
  outlineRoot.set(PDFName.of("Last"), level.last);
  outlineRoot.set(PDFName.of("Count"), PDFNumber.of(level.descendants));
  pdf.catalog.set(PDFName.of("Outlines"), outlineRootRef);
  pdf.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
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
  header: PdfHeaderOptions,
  /** Optional live-progress callback. Fired at the START of each pipeline
   *  stage with a human label and a cumulative 0–100 percentage. */
  onProgress?: (info: { stage: string; pct: number }) => void
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
    onProgress?.({ stage: "Preparing…", pct: 4 });

    // The document is attacker-influenced (public export endpoint): never execute
    // its scripts, and only allow same-origin image fetches (legacy /uploads paths).
    // data: URIs don't hit the network and are unaffected by interception.
    await page.setJavaScriptEnabled(false);
    const allowedOrigin = new URL(process.env.APP_URL || "http://localhost:3000").origin;
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
    onProgress?.({ stage: "Rendering content…", pct: 8 });
    let tocPages: Record<string, number> = {};
    let contentHtml = parts.contentHtml;
    if (parts.finalizeContentHtml) {
      await page.setContent(contentHtml, { waitUntil: "load", timeout: 30000 });
      await waitForImages();
      const passOneBytes = await page.pdf({ ...pdfOptions, displayHeaderFooter: false });
      onProgress?.({ stage: "Scanning page numbers…", pct: 30 });
      tocPages = await scanTocMarkers(passOneBytes);
      contentHtml = parts.finalizeContentHtml(tocPages);
    }

    // Content (Parts I–IV) with the agency header and "Page N" footer.
    onProgress?.({ stage: "Finalizing content…", pct: 42 });
    await page.setContent(contentHtml, { waitUntil: "load", timeout: 30000 });
    await waitForImages();
    const contentPdfBytes = await page.pdf({
      ...pdfOptions,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
    });

    // Front matter (cover, TOC, definitions) — no header, no footer.
    onProgress?.({ stage: "Building front matter…", pct: 64 });
    await page.setContent(parts.frontHtml(tocPages, true), { waitUntil: "load", timeout: 30000 });
    await waitForImages();
    const markedFrontPdfBytes = await page.pdf({ ...pdfOptions, displayHeaderFooter: false });
    const frontMarkerPages = await scanTocMarkers(markedFrontPdfBytes);
    let frontPdfBytes = markedFrontPdfBytes;
    if (frontMarkerPages.defs) {
      await page.setContent(parts.frontHtml(tocPages, false), { waitUntil: "load", timeout: 30000 });
      await waitForImages();
      frontPdfBytes = await page.pdf({ ...pdfOptions, displayHeaderFooter: false });
    }

    // Annex 1 — optional; printed with the same running header as main content.
    let annex1PdfBytes: Uint8Array | null = null;
    if (parts.annex1Html) {
      onProgress?.({ stage: "Adding Annex 1…", pct: 80 });
      await page.setContent(parts.annex1Html, { waitUntil: "load", timeout: 30000 });
      await waitForImages();
      annex1PdfBytes = await page.pdf({
        ...pdfOptions,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
      });
    }

    // Merge: front matter → content → annex 1 (if present).
    onProgress?.({ stage: "Merging PDF…", pct: 90 });
    const finalDoc = await PDFDocument.create();
    const frontPageCount = (await PDFDocument.load(frontPdfBytes)).getPageCount();
    const pdfSections: Uint8Array[] = [frontPdfBytes, contentPdfBytes];
    if (annex1PdfBytes) pdfSections.push(annex1PdfBytes);
    for (const bytes of pdfSections) {
      const doc = await PDFDocument.load(bytes);
      const copied = await finalDoc.copyPages(doc, doc.getPageIndices());
      for (const p of copied) finalDoc.addPage(p);
    }

    if (parts.tocEntries?.length) {
      const definitionsPageIndex = frontMarkerPages.defs ? frontMarkerPages.defs - 1 : null;
      convertTocLinksToInternalDestinations(finalDoc, parts.tocEntries, tocPages, frontPageCount, definitionsPageIndex);
      addPdfOutline(finalDoc, parts.tocEntries, tocPages, frontPageCount, definitionsPageIndex);
    }

    const mergedBytes = await finalDoc.save();
    return Buffer.from(mergedBytes);
  } finally {
    await browser.close();
  }
}
