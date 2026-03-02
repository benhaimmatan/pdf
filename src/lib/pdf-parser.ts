import type { ParsedPayslip } from "./types";
import {
  parseMonthYear,
  monthLabel,
  normalizeHebrew,
  cleanName,
} from "./hebrew-utils";

interface TextItem {
  str: string;
  transform: number[];
}

/**
 * Group text items by Y position to reconstruct lines.
 * pdf.js returns individual spans; we group by Y (tolerance ~3 units).
 */
function groupIntoLines(items: TextItem[]): string[] {
  if (items.length === 0) return [];

  // Sort by Y descending (top of page first), then X ascending
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) > 3) return yDiff;
    return a.transform[4] - b.transform[4];
  });

  const lines: { y: number; items: TextItem[] }[] = [];

  for (const item of sorted) {
    const y = item.transform[5];
    const existing = lines.find((l) => Math.abs(l.y - y) < 3);
    if (existing) {
      existing.items.push(item);
    } else {
      lines.push({ y, items: [item] });
    }
  }

  // Sort items within each line by X position (left-to-right for joining)
  return lines.map((line) => {
    line.items.sort((a, b) => a.transform[4] - b.transform[4]);
    return line.items.map((i) => i.str).join(" ");
  });
}

/**
 * Extract month/year from page lines.
 * Looks for "תלוש שכר לחודש" pattern.
 */
function extractMonth(
  lines: string[]
): { month: string; year: string } | null {
  for (const line of lines) {
    const normalized = normalizeHebrew(line);

    // Primary pattern: "תלוש שכר לחודש ינואר 2024"
    const payslipMatch = normalized.match(/תלוש\s*שכר\s*(?:ל(?:חודש)?)\s*(.*)/);
    if (payslipMatch) {
      const result = parseMonthYear(payslipMatch[1]);
      if (result) return result;
    }

    // Secondary: "חודש: ינואר 2024" or "חודש 01/2024"
    const monthMatch = normalized.match(/חודש\s*:?\s*(.*)/);
    if (monthMatch) {
      const result = parseMonthYear(monthMatch[1]);
      if (result) return result;
    }

    // Tertiary: "תקופה: 01/2024"
    const periodMatch = normalized.match(/תקופה\s*:?\s*(.*)/);
    if (periodMatch) {
      const result = parseMonthYear(periodMatch[1]);
      if (result) return result;
    }
  }

  // Fallback: scan all lines for any month-year pattern
  for (const line of lines) {
    const result = parseMonthYear(normalizeHebrew(line));
    if (result) return result;
  }

  return null;
}

/**
 * Extract employee name from page lines.
 * Looks for "לכבוד" marker, then the next non-empty line.
 */
function extractName(lines: string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const normalized = normalizeHebrew(lines[i]);

    // Primary: "לכבוד" — name is on this line or the next
    if (normalized.includes("לכבוד")) {
      // Check if name is on the same line after "לכבוד"
      const afterMarker = normalized.split("לכבוד")[1]?.trim();
      if (afterMarker && afterMarker.length > 1) {
        const name = cleanName(afterMarker);
        if (name.length > 1) return name;
      }
      // Otherwise check next lines
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const candidate = cleanName(normalizeHebrew(lines[j]));
        if (candidate.length > 1) return candidate;
      }
    }

    // Secondary: "שם העובד:" or "שם עובד:"
    const nameFieldMatch = normalized.match(/שם\s*(?:ה)?עובד\s*:?\s*(.*)/);
    if (nameFieldMatch) {
      const name = cleanName(nameFieldMatch[1]);
      if (name.length > 1) return name;
    }

    // Tertiary: "עובד:" alone
    const workerMatch = normalized.match(/^עובד\s*:?\s*(.*)/);
    if (workerMatch) {
      const name = cleanName(workerMatch[1]);
      if (name.length > 1) return name;
    }
  }

  return null;
}

/**
 * Parse a single PDF page and extract payslip info.
 */
export async function parsePage(
  page: import("pdfjs-dist").PDFPageProxy,
  pageIndex: number
): Promise<ParsedPayslip> {
  const textContent = await page.getTextContent();

  const items: TextItem[] = textContent.items
    .filter(
      (item) =>
        "str" in item && typeof item.str === "string" && item.str.trim().length > 0
    )
    .map((item) => ({
      str: (item as { str: string }).str,
      transform: (item as { transform: number[] }).transform,
    }));

  const lines = groupIntoLines(items);
  const fullText = lines.join("\n");

  const monthData = extractMonth(lines);
  const name = extractName(lines);

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
    rawText: fullText,
  };
}

/**
 * Scan entire PDF and parse all pages.
 * Processes in chunks of 50 to keep UI responsive.
 */
export async function scanPdf(
  file: ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<ParsedPayslip[]> {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: file }).promise;
  const totalPages = pdf.numPages;
  const results: ParsedPayslip[] = [];

  const CHUNK_SIZE = 50;

  for (let start = 0; start < totalPages; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, totalPages);
    const chunkPromises: Promise<ParsedPayslip>[] = [];

    for (let i = start; i < end; i++) {
      chunkPromises.push(
        pdf.getPage(i + 1).then((page) => parsePage(page, i))
      );
    }

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    onProgress?.(end, totalPages);

    // Yield to UI between chunks
    if (end < totalPages) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return mergeContinuationPages(results);
}

/**
 * Merge continuation pages: if consecutive pages share name+month,
 * or if a low-confidence page follows a high-confidence one.
 */
function mergeContinuationPages(
  payslips: ParsedPayslip[]
): ParsedPayslip[] {
  const merged: ParsedPayslip[] = [];

  for (const slip of payslips) {
    const prev = merged[merged.length - 1];

    if (prev && slip.confidence === "none" && prev.confidence !== "none") {
      // Continuation page — inherit name/month from previous
      merged.push({
        ...slip,
        name: prev.name,
        month: prev.month,
        year: prev.year,
        monthLabel: prev.monthLabel,
        confidence: "partial",
      });
    } else if (
      prev &&
      slip.name === prev.name &&
      slip.monthLabel === prev.monthLabel &&
      slip.confidence !== "none"
    ) {
      // Same person, same month — keep as separate entry but mark
      merged.push(slip);
    } else {
      merged.push(slip);
    }
  }

  return merged;
}
