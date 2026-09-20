import React from 'react';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FolderDown,
  RefreshCw,
  Upload
} from 'lucide-react';
import { LoadedPdfInfo } from '../types';

interface HeaderProps {
  pdfInfo: LoadedPdfInfo | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  onFitWidth: () => void;
  onOpenNewPdfClick: () => void;
  onSignAndSave: () => void;
  isSigning: boolean;
  hasSignaturePlaced: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pdfInfo,
  currentPage,
  totalPages,
  onPageChange,
  scale,
  onScaleChange,
  onFitWidth,
  onOpenNewPdfClick,
  onSignAndSave,
  isSigning,
  hasSignaturePlaced,
}) => {
  return (
    <header
      id="app-header"
      className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 select-none"
    >
      {/* Brand & Document Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-900 hidden sm:inline tracking-tight">
            PDF Signer
          </span>
        </div>

        {pdfInfo && (
          <>
            <div className="h-4 w-px bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-xs font-medium text-slate-700 truncate max-w-[140px] sm:max-w-[200px] md:max-w-[260px]"
                title={pdfInfo.name}
              >
                {pdfInfo.name}
              </span>
              <button
                id="change-pdf-btn"
                onClick={onOpenNewPdfClick}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-medium px-2 py-1 rounded transition-colors hidden sm:flex items-center gap-1"
                title="Open another PDF"
              >
                <Upload className="w-3 h-3" />
                Change
              </button>
            </div>
          </>
        )}
      </div>

      {/* Center: Pagination & Zoom Controls (Only when PDF is loaded) */}
      {pdfInfo && totalPages > 0 && (
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Page navigation */}
          <div className="flex items-center bg-slate-100/80 rounded-lg p-1 border border-slate-200/70">
            <button
              id="prev-page-btn"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-700 px-2 min-w-[65px] text-center font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              id="next-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden md:flex items-center bg-slate-100/80 rounded-lg p-1 border border-slate-200/70">
            <button
              id="zoom-out-btn"
              disabled={scale <= 0.5}
              onClick={() => onScaleChange(Math.max(0.5, scale - 0.15))}
              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-700 px-2 min-w-[50px] text-center font-mono">
              {Math.round(scale * 100)}%
            </span>
            <button
              id="zoom-in-btn"
              disabled={scale >= 2.5}
              onClick={() => onScaleChange(Math.min(2.5, scale + 0.15))}
              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              id="fit-width-btn"
              onClick={onFitWidth}
              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white transition-colors ml-0.5"
              title="Fit to Container"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Right Side: Sign & Save to Local Folder Action */}
      <div className="flex items-center gap-2">
        {pdfInfo && (
          <button
            id="sign-and-save-btn"
            disabled={isSigning || !hasSignaturePlaced}
            onClick={onSignAndSave}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs ${
              hasSignaturePlaced && !isSigning
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-sm active:scale-98 ring-2 ring-emerald-500/20'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
            title={
              !hasSignaturePlaced
                ? 'Import a signature and place it on the document first'
                : 'Sign PDF with translucent signature and save to local folder'
            }
          >
            {isSigning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Signing PDF...</span>
              </>
            ) : (
              <>
                <FolderDown className="w-4 h-4" />
                <span>Sign & Save to Local Folder</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
