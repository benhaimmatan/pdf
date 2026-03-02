import type { SplitResult } from "./pdf-splitter";
import { buildZipFilename } from "./hebrew-utils";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Build a single ZIP from the given results and trigger download.
 */
async function buildAndDownloadZip(results: SplitResult[], zipFilename: string): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Handle duplicate filenames by appending a counter
  const nameCount = new Map<string, number>();
  for (const { filename, data } of results) {
    const count = nameCount.get(filename) || 0;
    const uniqueName =
      count > 0
        ? filename.replace(".pdf", `_${count + 1}.pdf`)
        : filename;
    nameCount.set(filename, count + 1);
    zip.file(uniqueName, data);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, zipFilename);
}

/**
 * Bundle split PDFs into ZIP(s) and trigger download.
 * If results belong to a single employee, creates one ZIP.
 * If multiple employees, creates a separate ZIP per employee.
 */
export async function downloadAsZip(results: SplitResult[]): Promise<void> {
  const uniqueNames = [...new Set(results.map((r) => r.employeeName))];

  if (uniqueNames.length <= 1) {
    // Single employee (or all unknown) — one ZIP
    await buildAndDownloadZip(results, buildZipFilename(uniqueNames));
    return;
  }

  // Multiple employees — one ZIP per employee
  for (const name of uniqueNames) {
    const employeeResults = results.filter((r) => r.employeeName === name);
    await buildAndDownloadZip(employeeResults, buildZipFilename([name]));
  }
}

/**
 * Download a single PDF file.
 */
export async function downloadSinglePdf(
  filename: string,
  data: Uint8Array
): Promise<void> {
  const blob = new Blob([new Uint8Array(data)], { type: "application/pdf" });
  triggerDownload(blob, filename);
}
