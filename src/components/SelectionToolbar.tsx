"use client";

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onDownload: () => void;
}

export function SelectionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onSelectNone,
  onDownload,
}: SelectionToolbarProps) {
  if (totalCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            נבחרו{" "}
            <span className="font-bold text-blue-600">{selectedCount}</span> מתוך{" "}
            {totalCount}
          </span>
          <button
            onClick={onSelectAll}
            disabled={selectedCount === totalCount}
            className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            בחר הכל
          </button>
          <button
            onClick={onSelectNone}
            disabled={selectedCount === 0}
            className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            נקה בחירה
          </button>
        </div>

        <button
          onClick={onDownload}
          disabled={selectedCount === 0}
          className={`
            rounded-lg px-5 py-2 text-sm font-medium transition-all
            ${
              selectedCount > 0
                ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                : "cursor-not-allowed bg-gray-200 text-gray-400"
            }
          `}
        >
          הורד {selectedCount > 1 ? `${selectedCount} תלושים כ-ZIP` : "תלוש"}
        </button>
      </div>
    </div>
  );
}
