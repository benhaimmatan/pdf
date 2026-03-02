"use client";

import type { ParsedPayslip, SelectionState } from "@/lib/types";

interface UnparsedWarningProps {
  unparsed: ParsedPayslip[];
  selection: SelectionState;
  onTogglePage: (pageIndex: number) => void;
}

export function UnparsedWarning({
  unparsed,
  selection,
  onTogglePage,
}: UnparsedWarningProps) {
  if (unparsed.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="mb-2 font-medium text-amber-800">
        ⚠️ {unparsed.length} עמודים לא זוהו
      </p>
      <p className="mb-3 text-sm text-amber-700">
        לא נמצא שם עובד או חודש בעמודים הבאים. ניתן לכלול אותם בהורדה.
      </p>
      <div className="flex flex-wrap gap-2">
        {unparsed.map((p) => (
          <button
            key={p.pageIndex}
            onClick={() => onTogglePage(p.pageIndex)}
            className={`
              rounded-md border px-3 py-1 text-sm transition-all
              ${
                selection.selected.has(p.pageIndex)
                  ? "border-amber-400 bg-amber-100 text-amber-800"
                  : "border-amber-200 bg-white text-amber-600 hover:bg-amber-50"
              }
            `}
          >
            עמוד {p.pageIndex + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
