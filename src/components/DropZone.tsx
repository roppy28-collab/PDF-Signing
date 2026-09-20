import React, { useRef, useState } from 'react';
import { FileText, Upload, Sparkles, ShieldCheck } from 'lucide-react';

interface DropZoneProps {
  onPdfSelected: (file: File) => void;
  onLoadSamplePdf: () => void;
  isLoadingSample: boolean;
  onOpenGmailImport?: () => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onPdfSelected,
  onLoadSamplePdf,
  isLoadingSample,
  onOpenGmailImport,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      onPdfSelected(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPdfSelected(file);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50/50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="application/pdf"
        className="hidden"
        id="pdf-file-picker-input"
      />

      <div
        id="pdf-main-dropzone"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`max-w-xl w-full border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/40 scale-[1.01] shadow-lg ring-4 ring-indigo-500/10'
            : 'border-slate-300 hover:border-indigo-400 hover:bg-white bg-white/70 shadow-xs'
        }`}
      >
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs group-hover:scale-105 transition-transform">
          <FileText className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
          Drop your PDF file here
        </h3>
        <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
          Drag and drop any PDF document to open, sign with your translucent signature, and save locally.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            id="browse-pdf-button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Browse PDF Files</span>
          </button>

          {onOpenGmailImport && (
            <button
              type="button"
              id="import-from-gmail-button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenGmailImport();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-700 text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
              title="Browse PDF attachments in your Gmail inbox"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fill="#EA4335"
                  d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                />
              </svg>
              <span>Import from Gmail</span>
            </button>
          )}

          <button
            type="button"
            id="open-sample-pdf-button"
            disabled={isLoadingSample}
            onClick={(e) => {
              e.stopPropagation();
              onLoadSamplePdf();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>{isLoadingSample ? 'Creating Sample...' : 'Try Sample Agreement'}</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>100% Client-Side Processing • Your files never leave your device</span>
        </div>
      </div>
    </div>
  );
};
