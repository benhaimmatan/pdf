"use client";

import type { ParsedPayslip } from "@/lib/types";

interface PayslipCardProps {
  payslip: ParsedPayslip;
  isSelected: boolean;
  onToggle: () => void;
  onDownload: () => void;
}

export function PayslipCard({
  payslip,
  isSelected,
  onToggle,
  onDownload,
}: PayslipCardProps) {
  return (
    <div
      onClick={onToggle}
      className={`
        cursor-pointer rounded-lg border p-3 transition-all duration-150
        ${
          isSelected
            ? "border-blue-400 bg-blue-50 ring-1 ring-blue-400"
            : "border-gray-200 bg-white hover:border-gray-300"
        }
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-800">
            {payslip.monthLabel ?? `עמוד ${payslip.pageIndex + 1}`}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="הורד תלוש"
        >
          ⬇
        </button>
      </div>
      {payslip.confidence === "partial" && (
        <p className="mt-1 text-xs text-amber-600">
          זיהוי חלקי — עמוד {payslip.pageIndex + 1}
        </p>
      )}
    </div>
  );
}
