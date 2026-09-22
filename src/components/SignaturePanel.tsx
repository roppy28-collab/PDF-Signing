import React, { useRef } from 'react';
import {
  Upload,
  Sparkles,
  Sliders,
  Trash2,
  Plus,
  RefreshCw,
  Info,
  CheckCircle2,
  Undo2,
  BookmarkCheck,
  PanelLeftClose,
} from 'lucide-react';
import { SavedSignatureData, SignatureSettings } from '../types';
import { ProcessedSignature } from '../utils/imageProcessor';
import { SignatureGallery } from './SignatureGallery';

interface SignaturePanelProps {
  rawImageSource: string | null;
  processedSignature: ProcessedSignature | null;
  settings: SignatureSettings;
  onSettingsChange: (newSettings: SignatureSettings) => void;
  onImageSelected: (source: string | File) => void;
  onAddSignatureToPage: () => void;
  hasPdfLoaded: boolean;
  isProcessing: boolean;
  savedSignatures: SavedSignatureData[];
  activeSignatureId: string | null;
  onSelectSavedSignature: (sig: SavedSignatureData) => void;
  onSaveCurrentToLibrary: (name: string) => Promise<void>;
  onDeleteSavedSignature: (id: string) => Promise<void>;
  onSetDefaultSignature: (id: string) => Promise<void>;
  onRenameSavedSignature: (id: string, newName: string) => Promise<void>;
  onAddPresetSignature: (type: 'formal' | 'initials') => Promise<void>;
  onEmptyLibrary: () => Promise<void>;
  savedDefaultInfo?: { isSaved: boolean; name: string; timestamp: number } | null;
  onResetToSample?: () => void;
  onClearSavedDefault?: () => void;
  isSavingDefault?: boolean;
  onHidePanel?: () => void;
}

export const SignaturePanel: React.FC<SignaturePanelProps> = ({
  rawImageSource,
  processedSignature,
  settings,
  onSettingsChange,
  onImageSelected,
  onAddSignatureToPage,
  hasPdfLoaded,
  isProcessing,
  savedSignatures,
  activeSignatureId,
  onSelectSavedSignature,
  onSaveCurrentToLibrary,
  onDeleteSavedSignature,
  onSetDefaultSignature,
  onRenameSavedSignature,
  onAddPresetSignature,
  onEmptyLibrary,
  savedDefaultInfo,
  onResetToSample,
  onClearSavedDefault,
  isSavingDefault,
  onHidePanel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png)$/i))) {
      onImageSelected(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const activeSavedSig = savedSignatures.find((s) => s.id === activeSignatureId);
  const isCurrentSaved = !!activeSavedSig;

  return (
    <aside
      id="signature-control-sidebar"
      className="w-full md:w-84 lg:w-92 bg-white border-r border-slate-200 flex flex-col h-auto md:h-full shrink-0 shadow-xs z-10 overflow-y-auto"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Signature Setup</h2>
            <p className="text-[11px] text-slate-500">Save & switch between multiple signatures</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {rawImageSource && (
            <button
              type="button"
              onClick={() => onImageSelected('')}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium p-1 hover:bg-rose-50 rounded cursor-pointer"
              title="Clear signature"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          {onHidePanel && (
            <button
              id="hide-signature-setup-btn"
              type="button"
              onClick={onHidePanel}
              className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 p-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ml-0.5"
              title="Hide Signature Setup"
            >
              <PanelLeftClose className="w-4 h-4 text-slate-500" />
              <span className="text-[11px] font-medium hidden sm:inline">Hide</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Hidden file input for uploading JPG signature */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/jpg,image/png"
          className="hidden"
          id="signature-file-input"
        />

        {/* Feature 1: Multiple Signatures Library (Dropdown & Gallery View) */}
        <SignatureGallery
          signatures={savedSignatures}
          activeSignatureId={activeSignatureId}
          onSelect={onSelectSavedSignature}
          onSaveCurrentAsNew={onSaveCurrentToLibrary}
          onDelete={onDeleteSavedSignature}
          onSetDefault={onSetDefaultSignature}
          onRename={onRenameSavedSignature}
          onAddNewJpgClick={() => fileInputRef.current?.click()}
          onAddPreset={onAddPresetSignature}
          onEmptyLibrary={onEmptyLibrary}
          isCurrentSavedInLibrary={isCurrentSaved}
        />

        {/* Feature 2: Active Signature Preview & Translucency */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Active Signature Preview
            </label>
            {activeSavedSig?.isDefault && (
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <BookmarkCheck className="w-3 h-3 text-emerald-600" />
                Default Signature
              </span>
            )}
          </div>

          {!rawImageSource ? (
            <div
              id="signature-dropzone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl p-5 text-center cursor-pointer transition-all duration-150"
            >
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 text-slate-500 flex items-center justify-center transition-colors mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-slate-700 mb-1">
                Drop new JPG signature here
              </p>
              <p className="text-[11px] text-slate-400 mb-3">
                Photo or scan of handwritten signature
              </p>
              <button
                type="button"
                className="text-xs font-medium px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
              >
                Browse JPG File
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Preview with checkerboard background showing translucency */}
              <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                <div
                  className="w-full h-28 flex items-center justify-center p-3 relative"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #e2e8f0 25%, transparent 25%), 
                                     linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), 
                                     linear-gradient(45deg, transparent 75%, #e2e8f0 75%), 
                                     linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)`,
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-full shadow-xs">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Processing translucency...
                    </div>
                  ) : processedSignature ? (
                    <img
                      src={processedSignature.dataUrl}
                      alt="Translucent Signature Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : null}
                </div>

                <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="truncate max-w-[150px] font-medium text-slate-700">
                      {activeSavedSig?.name || 'Active Signature'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                  >
                    Replace JPG
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feature 3: Translucency & Ink Tuning */}
        {processedSignature && (
          <div className="space-y-4 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Sliders className="w-3.5 h-3.5" />
              <span>Translucency & Ink Tuning</span>
            </div>

            {/* Threshold Slider for White Paper Removal */}
            {settings.removeBackground && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-medium">Paper Removal Cutoff</span>
                  <span className="text-slate-500 font-mono">{settings.threshold}</span>
                </div>
                <input
                  id="threshold-slider"
                  type="range"
                  min="160"
                  max="252"
                  value={settings.threshold}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      threshold: Number(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Keep faint ink</span>
                  <span>Eliminate paper shadows</span>
                </div>
              </div>
            )}

            {/* Overall Signature Opacity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">Signature Opacity</span>
                <span className="text-slate-500 font-mono">
                  {Math.round(settings.opacity * 100)}%
                </span>
              </div>
              <input
                id="opacity-slider"
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={settings.opacity}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    opacity: Number(e.target.value),
                  })
                }
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Semi-translucent</span>
                <span>Solid opaque</span>
              </div>
            </div>

            {/* Ink Color Enhancement */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-600 font-medium block">
                Ink Color Mode
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'original', label: 'Original' },
                  { id: 'deep-black', label: 'Deep Ink' },
                  { id: 'royal-blue', label: 'Classic Blue' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      onSettingsChange({
                        ...settings,
                        inkColorMode: mode.id as any,
                      })
                    }
                    className={`text-xs py-1.5 px-2 rounded-lg border font-medium transition-all cursor-pointer ${
                      settings.inkColorMode === mode.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Informational tip */}
            <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 flex items-start gap-2 text-[11px] text-blue-700">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
              <span>
                White paper is made translucent so underlying document text or signature lines stay cleanly visible.
              </span>
            </div>
          </div>
        )}

        {/* Feature 4: Place on Document Action */}
        {processedSignature && (
          <div className="pt-2 border-t border-slate-100">
            <button
              id="place-signature-btn"
              type="button"
              onClick={onAddSignatureToPage}
              disabled={!hasPdfLoaded}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs ${
                hasPdfLoaded
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Place Signature on Document</span>
            </button>
            {!hasPdfLoaded && (
              <p className="text-[11px] text-amber-600 mt-1.5 text-center">
                Open or drop a PDF file first to place signature
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
