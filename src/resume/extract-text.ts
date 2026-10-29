import { strFromU8, unzipSync } from "fflate";
import "./polyfill";

function assetBase(): string {
  const getURL = (chrome?.runtime as { getURL?: (path: string) => string } | undefined)?.getURL;
  return getURL ? getURL("") : "./";
}

type PdfTextItem = { str: string; transform: number[]; width: number; hasEOL?: boolean };
type PdfRow = { y: number; items: Array<{ x: number; end: number; str: string }> };

function rowsToLines(rows: PdfRow[], fallbackItems: PdfTextItem[]): string[] {
  if (!rows.length) {
    // 页面没有坐标信息时，退回按换行标记拼接
    let line = "";
    const lines: string[] = [];
    for (const item of fallbackItems) {
      if (!item.str) continue;
      if (line && !/\s$/.test(line) && !/^\s/.test(item.str) && /[A-Za-z0-9]$/.test(line) && /^[A-Za-z0-9]/.test(item.str)) {
        line += " ";
      }
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  rows.sort((a, b) => b.y - a.y);
  return rows.map((row) => {
    row.items.sort((a, b) => a.x - b.x);
    let line = "";
    let previousEnd = Number.NaN;
    for (const item of row.items) {
      if (Number.isFinite(previousEnd) && item.x - previousEnd > 1.2) line += " ";
      line += item.str;
      previousEnd = item.end;
    }
    return line.trim();
  }).filter(Boolean);
}

async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${assetBase()}pdf-worker.js`;

  const data = new Uint8Array(await file.arrayBuffer());
  const base = assetBase();
  const pdf = await pdfjs.getDocument({
    data,
    cMapUrl: `${base}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}standard_fonts/`,
    disableAutoFetch: true
  }).promise;

  const pages: string[] = [];
  try {
    for (let index = 1; index <= pdf.numPages && index <= 30; index += 1) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      const fallbackItems: PdfTextItem[] = [];
      const rows: PdfRow[] = [];

      for (const rawItem of content.items) {
        if (!("str" in rawItem)) continue;
        const item = rawItem as unknown as PdfTextItem;
        if (!item.str || !item.str.trim()) continue;
        fallbackItems.push(item);

        const x = item.transform?.[4];
        const y = item.transform?.[5];
        if (typeof x !== "number" || typeof y !== "number") continue;

        const row = rows.find((candidate) => Math.abs(candidate.y - y) <= 2.5);
        if (row) row.items.push({ x, end: x + (item.width || 0), str: item.str });
        else rows.push({ y, items: [{ x, end: x + (item.width || 0), str: item.str }] });
      }

      pages.push(rowsToLines(rows, fallbackItems).join("\n"));
      await page.cleanup();
    }
  } finally {
    await pdf.cleanup();
  }
  return pages.join("\n");
}

function docxToText(file: File): Promise<string> {
  return file.arrayBuffer().then((buffer) => {
    const files = unzipSync(new Uint8Array(buffer));
    const documentPath = Object.keys(files).find((name) => name === "word/document.xml")
      ?? Object.keys(files).find((name) => name.startsWith("word/") && name.endsWith(".xml"));
    if (!documentPath) throw new Error("无法读取 Word 文档内容，请改用 PDF 或另存为 .docx");

    const xml = strFromU8(files[documentPath]);
    return xml
      .replace(/<w:tab\b[^>]*\/>/g, "\t")
      .replace(/<w:br\b[^>]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&apos;/g, "'");
  });
}

export async function fileToText(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) return pdfToText(file);
  if (lowerName.endsWith(".docx")) return docxToText(file);
  if (lowerName.endsWith(".doc")) throw new Error("暂不支持旧版 .doc，请在 Word 中另存为 .docx 或导出 PDF");
  if (/\.(txt|md|markdown|text)$/.test(lowerName)) return file.text();

  const type = file.type.toLowerCase();
  if (type.startsWith("text/")) return file.text();
  throw new Error("仅支持 PDF、DOCX、TXT / MD 格式的简历");
}
