"use client";

import { useState, useCallback, useRef } from "react";
import type {
  AppState,
  ScanResult,
  ParsedPayslip,
  PayslipGroup,
  SelectionState,
} from "@/lib/types";

export function usePdfProcessor() {
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });
  const [selection, setSelection] = useState<SelectionState>({
    selected: new Set(),
  });
  const sourceBuffersRef = useRef<Map<string, ArrayBuffer>>(new Map());
  const scanResultRef = useRef<ScanResult | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    try {
      setAppState({ stage: "scanning", progress: 0, total: 0, fileProgress: { current: 0, total: files.length } });

      const { scanPdf } = await import("@/lib/pdf-parser");
      const allPayslips: ParsedPayslip[] = [];
      const buffers = new Map<string, ArrayBuffer>();
      let globalPageOffset = 0;

      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        const fileId = String(fileIdx);
        const buffer = await file.arrayBuffer();
        // Clone the buffer — pdfjs transfers it to a web worker, detaching the original
        buffers.set(fileId, buffer.slice(0));

        setAppState({
          stage: "scanning",
          progress: 0,
          total: 0,
          fileProgress: { current: fileIdx + 1, total: files.length },
        });

        const payslips = await scanPdf(buffer, (current, total) => {
          setAppState({
            stage: "scanning",
            progress: current,
            total,
            fileProgress: { current: fileIdx + 1, total: files.length },
          });
        });

        // Tag each payslip with source info and assign globally unique pageIndex
        for (const slip of payslips) {
          allPayslips.push({
            ...slip,
            sourceFileId: fileId,
            sourcePageIndex: slip.pageIndex,
            pageIndex: globalPageOffset + slip.pageIndex,
          });
        }
        globalPageOffset += payslips.length;
      }

      sourceBuffersRef.current = buffers;

      const result = buildScanResult(allPayslips);
      scanResultRef.current = result;

      // Select all high-confidence payslips by default
      const defaultSelected = new Set(
        allPayslips
          .filter((p) => p.confidence !== "none")
          .map((p) => p.pageIndex)
      );
      setSelection({ selected: defaultSelected });

      setAppState({ stage: "ready", result });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process PDF";
      setAppState({ stage: "error", message });
    }
  }, []);

  const togglePage = useCallback((pageIndex: number) => {
    setSelection((prev) => {
      const next = new Set(prev.selected);
      if (next.has(pageIndex)) {
        next.delete(pageIndex);
      } else {
        next.add(pageIndex);
      }
      return { selected: next };
    });
  }, []);

  const togglePerson = useCallback(
    (name: string) => {
      if (appState.stage !== "ready") return;
      const group = appState.result.groups.find((g) => g.name === name);
      if (!group) return;

      setSelection((prev) => {
        const next = new Set(prev.selected);
        const allSelected = group.payslips.every((p) =>
          next.has(p.pageIndex)
        );

        for (const p of group.payslips) {
          if (allSelected) {
            next.delete(p.pageIndex);
          } else {
            next.add(p.pageIndex);
          }
        }
        return { selected: next };
      });
    },
    [appState]
  );

  const selectAll = useCallback(() => {
    if (appState.stage !== "ready") return;
    const all = new Set(
      appState.result.payslips.map((p) => p.pageIndex)
    );
    setSelection({ selected: all });
  }, [appState]);

  const selectNone = useCallback(() => {
    setSelection({ selected: new Set() });
  }, []);

  const downloadSelected = useCallback(async () => {
    if (appState.stage !== "ready" || sourceBuffersRef.current.size === 0) return;

    const selectedPayslips = appState.result.payslips.filter((p) =>
      selection.selected.has(p.pageIndex)
    );
    if (selectedPayslips.length === 0) return;

    try {
      setAppState({
        stage: "downloading",
        progress: 0,
        total: selectedPayslips.length,
      });

      const { splitPdf } = await import("@/lib/pdf-splitter");
      const results = await splitPdf(
        sourceBuffersRef.current,
        selectedPayslips,
        (current, total) => {
          setAppState({ stage: "downloading", progress: current, total });
        }
      );

      const { downloadAsZip } = await import("@/lib/zip-builder");
      const names = selectedPayslips.map((p) => p.name ?? "");
      await downloadAsZip(results, names);

      // Return to ready state
      setAppState({ stage: "ready", result: scanResultRef.current! });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create download";
      setAppState({ stage: "error", message });
    }
  }, [appState, selection]);

  const downloadSingle = useCallback(
    async (payslip: ParsedPayslip) => {
      if (sourceBuffersRef.current.size === 0) return;

      try {
        const { splitPdf } = await import("@/lib/pdf-splitter");
        const results = await splitPdf(sourceBuffersRef.current, [payslip]);

        if (results.length > 0) {
          const { downloadSinglePdf } = await import("@/lib/zip-builder");
          await downloadSinglePdf(results[0].filename, results[0].data);
        }
      } catch (err) {
        console.error("Download failed:", err);
      }
    },
    []
  );

  const reset = useCallback(() => {
    sourceBuffersRef.current = new Map();
    scanResultRef.current = null;
    setSelection({ selected: new Set() });
    setAppState({ stage: "idle" });
  }, []);

  return {
    appState,
    selection,
    handleFiles,
    togglePage,
    togglePerson,
    selectAll,
    selectNone,
    downloadSelected,
    downloadSingle,
    reset,
  };
}

function buildScanResult(payslips: ParsedPayslip[]): ScanResult {
  const groupMap = new Map<string, ParsedPayslip[]>();
  const unparsed: ParsedPayslip[] = [];

  for (const slip of payslips) {
    if (slip.confidence === "none") {
      unparsed.push(slip);
      continue;
    }

    const name = slip.name ?? "ללא שם";
    const group = groupMap.get(name) || [];
    group.push(slip);
    groupMap.set(name, group);
  }

  const groups: PayslipGroup[] = Array.from(groupMap.entries())
    .map(([name, payslips]) => ({ name, payslips }))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));

  return {
    payslips,
    groups,
    unparsed,
    totalPages: payslips.length,
  };
}
