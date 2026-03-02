"use client";

interface ScanProgressProps {
  progress: number;
  total: number;
}

export function ScanProgress({ progress, total }: ScanProgressProps) {
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mb-4 text-4xl animate-pulse">🔍</div>
      <p className="mb-3 text-lg font-medium text-gray-700">
        סורק תלושי שכר...
      </p>
      <div className="mb-2 h-3 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-gray-500">
        עמוד {progress} מתוך {total}
      </p>
    </div>
  );
}
