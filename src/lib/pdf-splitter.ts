import type { ParsedPayslip } from "./types";
import { buildFilename } from "./hebrew-utils";

export interface SplitResult {
  filename: string;
  data: Uint8Array;
}

/**
 * Create individual PDFs from selected pages across multiple source files.
 */
export async function splitPdf(
  sourceBuffers: Map<string, ArrayBuffer>,
  payslips: ParsedPayslip[],
  onProgress?: (current: number, total: number) => void
): Promise<SplitResult[]> {
  const { PDFDocument } = await import("pdf-lib");

  // Load each source PDF once
  const sourcePdfs = new Map<string, import("pdf-lib").PDFDocument>();
  for (const [fileId, buffer] of sourceBuffers) {
    sourcePdfs.set(fileId, await PDFDocument.load(buffer));
  }

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

    for (const slip of group) {
      const sourcePdf = sourcePdfs.get(slip.sourceFileId);
      if (!sourcePdf) continue;
      const [copiedPage] = await newPdf.copyPages(sourcePdf, [slip.sourcePageIndex]);
      newPdf.addPage(copiedPage);
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
