"use client";

import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onFiles: (files: File[]) => void;
}

export function FileUpload({ onFiles }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const pdfFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === "application/pdf"
      );
      if (pdfFiles.length > 0) {
        onFiles(pdfFiles);
      }
    },
    [onFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFiles(Array.from(files));
      }
    },
    [onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center
        transition-all duration-200
        ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <div className="mb-4 text-5xl">📄</div>
      <p className="text-lg font-medium text-gray-700">
        גרור קבצי PDF לכאן
      </p>
      <p className="mt-2 text-sm text-gray-500">
        או לחץ לבחירת קבצים (ניתן לבחור מספר קבצים)
      </p>
    </div>
  );
}
