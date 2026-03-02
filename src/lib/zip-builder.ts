import type { SplitResult } from "./pdf-splitter";
import { buildZipFilename } from "./hebrew-utils";

/**
 * Bundle split PDFs into a ZIP and trigger download.
 */
export async function downloadAsZip(results: SplitResult[]): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const { saveAs } = await import("file-saver");

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
  saveAs(blob, buildZipFilename());
}

/**
 * Download a single PDF file.
 */
export async function downloadSinglePdf(
  filename: string,
  data: Uint8Array
): Promise<void> {
  const { saveAs } = await import("file-saver");
  const blob = new Blob([new Uint8Array(data) as BlobPart], { type: "application/pdf" });
  saveAs(blob, filename);
}
