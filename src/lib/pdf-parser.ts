import type { ParsedPayslip } from "./types";
import {
  parseMonthYear,
  monthLabel,
  normalizeHebrew,
  cleanName,
} from "./hebrew-utils";

/**
 * Extract all raw text strings from a PDF page using getOperatorList.
 *
 * Some Hebrew payroll PDFs store text reversed with special font encodings
 * that getTextContent() can't fully decode (missing digits). The operator
 * list gives us the raw text strings which are complete but may be reversed.
 */
async function extractRawTexts(
  page: import("pdfjs-dist").PDFPageProxy
): Promise<string[]> {
  const opList = await page.getOperatorList();
  const pdfjsLib = await import("pdfjs-dist");
  const { OPS } = pdfjsLib;

  const texts: string[] = [];

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];

    if (fn === OPS.showText || fn === OPS.showSpacedText) {
      const glyphs = args[0];
      let text = "";
      if (Array.isArray(glyphs)) {
        for (const g of glyphs) {
          if (typeof g === "string") text += g;
          else if (typeof g === "object" && g !== null && g.unicode) text += g.unicode;
        }
      }
      const trimmed = text.trim();
      if (trimmed.length > 0) {
        texts.push(trimmed);
      }
    }
  }

  return texts;
}

/**
 * BiDi-aware reversal for Hebrew text stored in visual order.
 * Reverses the entire string, then restores LTR runs (digit/punctuation clusters).
 */
function reverseHebrew(text: string): string {
  const reversed = text.split("").reverse().join("");
  // Restore digit+punctuation clusters that got incorrectly reversed
  return reversed.replace(/[\d/.\-:]+/g, (match) =>
    match.split("").reverse().join("")
  );
}

/**
 * Detect if the document stores text in reversed (visual) order.
 * Checks for known reversed Hebrew patterns across all extracted texts.
 */
function detectReversedDocument(texts: string[]): boolean {
  for (const text of texts) {
    // "שולת" = reversed "תלוש" (payslip)
    // "דובכל" = reversed "לכבוד" (addressed to)
    // "ספדוה" = reversed "הודפס" (printed)
    if (
      text.includes("שולת") ||
      text.includes("דובכל") ||
      text.includes("ספדוה")
    ) {
      return true;
    }
    // Text starting with digits then Hebrew = visual order
    if (/^\d+[/.]\d+\s+[\u0590-\u05FF]/.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Normalize a raw text string: reverse if document is reversed, clean up.
 */
function normalizeRawText(text: string, isDocReversed: boolean): string {
  let result = text;
  if (isDocReversed && /[\u0590-\u05FF]/.test(result)) {
    result = reverseHebrew(result);
  }
  return normalizeHebrew(result);
}

/**
 * Extract month from raw text strings.
 */
function extractMonth(
  texts: string[],
  isDocReversed: boolean
): { month: string; year: string } | null {
  for (const raw of texts) {
    const text = normalizeRawText(raw, isDocReversed);

    // Look for "תלוש שכר לחודש MM/YYYY"
    const payslipMatch = text.match(
      /תלוש\s*שכר\s*(?:ל(?:חודש|חוד)?)\s*([\d/\-.]+)/
    );
    if (payslipMatch) {
      const result = parseMonthYear(payslipMatch[1]);
      if (result) return result;
    }

    // "חודש: MM/YYYY"
    const monthMatch = text.match(/חודש\s*:?\s*([\d/\-.]+)/);
    if (monthMatch) {
      const result = parseMonthYear(monthMatch[1]);
      if (result) return result;
    }

    // "תקופה: MM/YYYY"
    const periodMatch = text.match(/תקופה\s*:?\s*([\d/\-.]+)/);
    if (periodMatch) {
      const result = parseMonthYear(periodMatch[1]);
      if (result) return result;
    }
  }

  // Fallback: search all texts for any month pattern
  for (const raw of texts) {
    const text = normalizeRawText(raw, isDocReversed);
    const result = parseMonthYear(text);
    if (result) return result;
  }

  return null;
}

/**
 * Extract name from raw text strings.
 */
function extractName(texts: string[], isDocReversed: boolean): string | null {
  // Strategy 1: Find "לכבוד" text — the NEXT text item is the name
  for (let i = 0; i < texts.length; i++) {
    const text = normalizeRawText(texts[i], isDocReversed);

    if (text.includes("לכבוד")) {
      // Check same string after "לכבוד"
      const after = text.split("לכבוד")[1]?.trim();
      if (after && after.length > 1) {
        const name = cleanName(after);
        if (name.length > 1) return name;
      }

      // Check next text items
      for (let j = i + 1; j < Math.min(i + 5, texts.length); j++) {
        const next = normalizeRawText(texts[j], isDocReversed);
        const name = cleanName(next);
        // A name should be mostly Hebrew, 2+ chars, no colons
        if (
          name.length > 2 &&
          !name.includes(":") &&
          /[\u0590-\u05FF]/.test(name)
        ) {
          return name;
        }
      }
    }
  }

  // Strategy 2: "שם העובד:" field
  for (const raw of texts) {
    const text = normalizeRawText(raw, isDocReversed);
    const match = text.match(/שם\s*(?:ה)?עובד\s*:?\s*(.*)/);
    if (match) {
      const name = cleanName(match[1]);
      if (name.length > 1) return name;
    }
  }

  return null;
}

/**
 * Parse a single PDF page.
 */
export async function parsePage(
  page: import("pdfjs-dist").PDFPageProxy,
  pageIndex: number
): Promise<ParsedPayslip> {
  const texts = await extractRawTexts(page);
  const isDocReversed = detectReversedDocument(texts);

  const monthData = extractMonth(texts, isDocReversed);
  const name = extractName(texts, isDocReversed);

  // Debug page 0
  if (pageIndex === 0) {
    console.log(
      `[PDF Parser] Page 0: reversed=${isDocReversed}, name="${name}", month="${monthData?.month}/${monthData?.year}"`
    );
    // Log first 5 raw and normalized texts for debugging
    for (let i = 0; i < Math.min(5, texts.length); i++) {
      console.log(`[PDF Parser] raw[${i}]: "${texts[i]}" → "${normalizeRawText(texts[i], isDocReversed)}"`);
    }
  }

  let confidence: ParsedPayslip["confidence"] = "none";
  if (name && monthData) confidence = "high";
  else if (name || monthData) confidence = "partial";

  return {
    pageIndex,
    name,
    month: monthData?.month ?? null,
    year: monthData?.year ?? null,
    monthLabel: monthData
      ? monthLabel(monthData.month, monthData.year)
      : null,
    confidence,
    rawText: texts.map((t) => normalizeRawText(t, isDocReversed)).join("\n"),
  };
}

/**
 * Scan entire PDF.
 */
export async function scanPdf(
  file: ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<ParsedPayslip[]> {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: file }).promise;
  const totalPages = pdf.numPages;
  const results: ParsedPayslip[] = [];

  const CHUNK_SIZE = 50;

  for (let start = 0; start < totalPages; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, totalPages);
    const chunkPromises: Promise<ParsedPayslip>[] = [];

    for (let i = start; i < end; i++) {
      chunkPromises.push(
        pdf.getPage(i + 1).then((p) => parsePage(p, i))
      );
    }

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    onProgress?.(end, totalPages);

    if (end < totalPages) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return mergeContinuationPages(results);
}

function mergeContinuationPages(
  payslips: ParsedPayslip[]
): ParsedPayslip[] {
  const merged: ParsedPayslip[] = [];

  for (const slip of payslips) {
    const prev = merged[merged.length - 1];

    if (prev && slip.confidence === "none" && prev.confidence !== "none") {
      merged.push({
        ...slip,
        name: prev.name,
        month: prev.month,
        year: prev.year,
        monthLabel: prev.monthLabel,
        confidence: "partial",
      });
    } else {
      merged.push(slip);
    }
  }

  return merged;
}
