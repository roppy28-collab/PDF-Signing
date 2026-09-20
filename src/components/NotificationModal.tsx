import React from 'react';
import { CheckCircle2, FolderDown, X, Download } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  savedPdfBytes: Uint8Array | null;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  fileName,
  savedPdfBytes,
}) => {
  if (!isOpen) return null;

  const handleDownloadAgain = () => {
    if (!savedPdfBytes) return;
    const blob = new Blob([savedPdfBytes as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in select-none">
      <div
        id="save-success-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <h3 className="text-base font-semibold text-slate-900 mb-1">
          PDF Successfully Signed!
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Your document with the translucent signature has been saved to your local folder.
        </p>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <FolderDown className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {fileName}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium">
              Saved to local files
            </p>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Continue Editing
          </button>
          <button
            type="button"
            onClick={handleDownloadAgain}
            className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Another Copy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
