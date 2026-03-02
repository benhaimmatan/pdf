"use client";

import { FileUpload } from "@/components/FileUpload";
import { ScanProgress } from "@/components/ScanProgress";
import { PayslipGrid } from "@/components/PayslipGrid";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { DownloadPanel } from "@/components/DownloadPanel";
import { UnparsedWarning } from "@/components/UnparsedWarning";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";

export default function Home() {
  const {
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
  } = usePdfProcessor();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-24">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">
          מפצל תלושי שכר
        </h1>
        <p className="mt-2 text-gray-500">
          העלה קבצי PDF עם תלושי שכר, בחר עובדים וחודשים, והורד תלושים
          בודדים
        </p>
      </div>

      {/* Idle — upload */}
      {appState.stage === "idle" && <FileUpload onFiles={handleFiles} />}

      {/* Scanning */}
      {appState.stage === "scanning" && (
        <ScanProgress progress={appState.progress} total={appState.total} fileProgress={appState.fileProgress} />
      )}

      {/* Ready — show results */}
      {appState.stage === "ready" && (
        <>
          {/* Top actions */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={reset}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← העלה קובץ אחר
            </button>
          </div>

          <PayslipGrid
            result={appState.result}
            selection={selection}
            onTogglePage={togglePage}
            onTogglePerson={togglePerson}
            onDownloadSingle={downloadSingle}
          />

          {appState.result.unparsed.length > 0 && (
            <div className="mt-6">
              <UnparsedWarning
                unparsed={appState.result.unparsed}
                selection={selection}
                onTogglePage={togglePage}
              />
            </div>
          )}

          <SelectionToolbar
            selectedCount={selection.selected.size}
            totalCount={
              appState.result.payslips.length - appState.result.unparsed.length
            }
            onSelectAll={selectAll}
            onSelectNone={selectNone}
            onDownload={downloadSelected}
          />
        </>
      )}

      {/* Downloading */}
      {appState.stage === "downloading" && (
        <DownloadPanel progress={appState.progress} total={appState.total} />
      )}

      {/* Error */}
      {appState.stage === "error" && (
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 text-4xl">❌</div>
          <p className="mb-2 text-lg font-medium text-red-700">
            שגיאה בעיבוד הקובץ
          </p>
          <p className="mb-4 text-sm text-red-600">{appState.message}</p>
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            נסה שוב
          </button>
        </div>
      )}
    </main>
  );
}
