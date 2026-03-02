"use client";

import type { ScanResult, ParsedPayslip, SelectionState } from "@/lib/types";
import { PayslipCard } from "./PayslipCard";

interface PayslipGridProps {
  result: ScanResult;
  selection: SelectionState;
  onTogglePage: (pageIndex: number) => void;
  onTogglePerson: (name: string) => void;
  onDownloadSingle: (payslip: ParsedPayslip) => void;
}

export function PayslipGrid({
  result,
  selection,
  onTogglePage,
  onTogglePerson,
  onDownloadSingle,
}: PayslipGridProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg bg-gray-50 p-4 text-center">
        <p className="text-gray-700">
          נמצאו{" "}
          <span className="font-bold text-blue-600">{result.groups.length}</span>{" "}
          עובדים עם{" "}
          <span className="font-bold text-blue-600">
            {result.payslips.length - result.unparsed.length}
          </span>{" "}
          תלושים
          {result.unparsed.length > 0 && (
            <span className="text-amber-600">
              {" "}
              ({result.unparsed.length} עמודים לא מזוהים)
            </span>
          )}
        </p>
      </div>

      {/* Person groups */}
      {result.groups.map((group) => {
        const allSelected = group.payslips.every((p) =>
          selection.selected.has(p.pageIndex)
        );
        const someSelected =
          !allSelected &&
          group.payslips.some((p) => selection.selected.has(p.pageIndex));

        return (
          <div
            key={group.name}
            className="rounded-xl border border-gray-200 bg-white overflow-hidden"
          >
            {/* Person header */}
            <div
              onClick={() => onTogglePerson(group.name)}
              className="flex cursor-pointer items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3"
            >
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={() => onTogglePerson(group.name)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-base font-semibold text-gray-800">
                {group.name}
              </span>
              <span className="text-sm text-gray-500">
                ({group.payslips.length} תלושים)
              </span>
            </div>

            {/* Month cards */}
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4">
              {group.payslips.map((payslip) => (
                <PayslipCard
                  key={payslip.pageIndex}
                  payslip={payslip}
                  isSelected={selection.selected.has(payslip.pageIndex)}
                  onToggle={() => onTogglePage(payslip.pageIndex)}
                  onDownload={() => onDownloadSingle(payslip)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
