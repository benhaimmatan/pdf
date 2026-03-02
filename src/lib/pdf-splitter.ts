import type { ParsedPayslip } from "./types";
import { buildFilename } from "./hebrew-utils";

export interface SplitResult {
  filename: string;
  data: Uint8Array;
}

/**
 * Create individual PDFs from selected pages.
 */
export async function splitPdf(
  sourceBuffer: ArrayBuffer,
  payslips: ParsedPayslip[],
  onProgress?: (current: number, total: number) => void
): Promise<SplitResult[]> {
  const { PDFDocument } = await import("pdf-lib");

  const sourcePdf = await PDFDocument.load(sourceBuffer);
  const results: SplitResult[] = [];

  // Group payslips by name+month to combine multi-page payslips
  const groups = new Map<string, ParsedPayslip[]>();
  for (const slip of payslips) {
    const key = `${slip.name ?? "unknown"}_${slip.monthLabel ?? "unknown"}`;
    const group = groups.get(key) || [];
    group.push(slip);
    groups.set(key, group);
  }

  let done = 0;
  const total = groups.size;

  for (const [, group] of groups) {
    const newPdf = await PDFDocument.create();
    const pageIndices = group.map((s) => s.pageIndex);
    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    const pdfBytes = await newPdf.save();
    const first = group[0];
    const filename = buildFilename(
      first.name ?? "ללא_שם",
      first.month ?? "ללא_חודש",
      first.year ?? "ללא_שנה"
    );

    results.push({ filename, data: pdfBytes });
    done++;
    onProgress?.(done, total);
  }

  return results;
}
