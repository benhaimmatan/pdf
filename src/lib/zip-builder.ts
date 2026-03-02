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
 * Bundle split PDFs into a ZIP and trigger download.
 */
export async function downloadAsZip(results: SplitResult[]): Promise<void> {
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
  triggerDownload(blob, buildZipFilename());
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
