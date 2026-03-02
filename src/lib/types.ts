export interface ParsedPayslip {
  /** 0-based page index in the source PDF */
  pageIndex: number;
  /** Employee name extracted from the page */
  name: string | null;
  /** Hebrew or numeric month string (e.g., "ינואר" or "01") */
  month: string | null;
  /** Year as string (e.g., "2024") */
  year: string | null;
  /** Combined display label: "ינואר 2024" */
  monthLabel: string | null;
  /** Confidence: did we find both name and month? */
  confidence: "high" | "partial" | "none";
  /** Raw text extracted from the page (for debugging) */
  rawText?: string;
}

export interface PayslipGroup {
  /** Employee name */
  name: string;
  /** All payslips for this person, keyed by monthLabel */
  payslips: ParsedPayslip[];
}

export interface ScanResult {
  /** All parsed payslips */
  payslips: ParsedPayslip[];
  /** Grouped by person name */
  groups: PayslipGroup[];
  /** Pages that couldn't be identified */
  unparsed: ParsedPayslip[];
  /** Total pages in the PDF */
  totalPages: number;
}

export type AppState =
  | { stage: "idle" }
  | { stage: "scanning"; progress: number; total: number }
  | { stage: "ready"; result: ScanResult }
  | { stage: "downloading"; progress: number; total: number }
  | { stage: "error"; message: string };

export interface SelectionState {
  /** Set of "pageIndex" numbers that are selected */
  selected: Set<number>;
}
