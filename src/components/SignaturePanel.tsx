import React, { useRef } from 'react';
import {
  Upload,
  Sparkles,
  Sliders,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  Info,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  Compass,
  BookmarkCheck,
  CheckCircle2,
  Undo2
} from 'lucide-react';
import { SignatureSettings, SignaturePlacement } from '../types';
import { ProcessedSignature } from '../utils/imageProcessor';
import { createSampleSignatureJpg } from '../utils/sampleSignature';

interface SignaturePanelProps {
  rawImageSource: string | null;
  processedSignature: ProcessedSignature | null;
  settings: SignatureSettings;
  onSettingsChange: (newSettings: SignatureSettings) => void;
  onImageSelected: (source: string | File) => void;
  onAddSignatureToPage: () => void;
  hasPdfLoaded: boolean;
  isProcessing: boolean;
  selectedPlacement?: SignaturePlacement | null;
  onUpdatePlacement?: (placement: SignaturePlacement) => void;
  savedDefaultInfo?: { isSaved: boolean; name: string; timestamp: number } | null;
  onResetToSample?: () => void;
  onClearSavedDefault?: () => void;
  isSavingDefault?: boolean;
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
  selectedPlacement,
  onUpdatePlacement,
  savedDefaultInfo,
  onResetToSample,
  onClearSavedDefault,
  isSavingDefault,
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

  // Resize helper for selected placement
  const handleScaleChange = (newWidth: number) => {
    if (!selectedPlacement || !onUpdatePlacement) return;
    const aspect = selectedPlacement.width / selectedPlacement.height;
    const clampedWidth = Math.max(40, Math.min(450, newWidth));
    const newHeight = clampedWidth / aspect;
    const deltaH = newHeight - selectedPlacement.height;

    onUpdatePlacement({
      ...selectedPlacement,
      width: Math.round(clampedWidth),
      height: Math.round(newHeight),
      y: Math.max(0, selectedPlacement.y - deltaH / 2),
      x: Math.max(0, selectedPlacement.x - (clampedWidth - selectedPlacement.width) / 2),
    });
  };

  const handleScaleStep = (factor: number) => {
    if (!selectedPlacement) return;
    handleScaleChange(selectedPlacement.width * factor);
  };

  // Rotation helper for selected placement
  const handleRotationChange = (deg: number) => {
    if (!selectedPlacement || !onUpdatePlacement) return;
    const normalized = ((deg % 360) + 360) % 360;
    onUpdatePlacement({
      ...selectedPlacement,
      rotation: normalized,
    });
  };

  const handleRotationStep = (deltaDeg: number) => {
    if (!selectedPlacement) return;
    handleRotationChange((selectedPlacement.rotation || 0) + deltaDeg);
  };

  return (
    <aside
      id="signature-control-sidebar"
      className="w-full md:w-80 lg:w-88 bg-white border-r border-slate-200 flex flex-col h-auto md:h-full shrink-0 shadow-xs z-10 overflow-y-auto"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Signature Setup</h2>
            <p className="text-[11px] text-slate-500">Import JPG & place on document</p>
          </div>
        </div>

        {rawImageSource && (
          <button
            type="button"
            onClick={() => onImageSelected('')}
            className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium p-1 hover:bg-rose-50 rounded"
            title="Reset signature"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Step 1: Import JPG Signature */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              1. Signature JPG
            </label>
            {savedDefaultInfo?.isSaved ? (
              <div
                className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs"
                title="This signature will automatically load every time you open this app"
              >
                <BookmarkCheck className="w-3 h-3 text-emerald-600" />
                <span>Default Loaded</span>
              </div>
            ) : isSavingDefault ? (
              <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-600" />
                <span>Saving default...</span>
              </div>
            ) : null}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/jpg,image/png"
            className="hidden"
            id="signature-file-input"
          />

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
                Drop JPG signature here
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
                    <span>Background translucent</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Change JPG
                  </button>
                </div>
              </div>

              {/* Saved Default Info Banner */}
              {savedDefaultInfo?.isSaved && (
                <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-900 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate font-medium" title={savedDefaultInfo.name}>
                      {savedDefaultInfo.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {onResetToSample && (
                      <button
                        type="button"
                        onClick={onResetToSample}
                        className="text-slate-600 hover:text-indigo-600 font-medium text-[10px] flex items-center gap-0.5"
                        title="Switch back to the demo sample signature"
                      >
                        <Undo2 className="w-2.5 h-2.5" />
                        <span>Sample</span>
                      </button>
                    )}
                    {onClearSavedDefault && (
                      <button
                        type="button"
                        onClick={onClearSavedDefault}
                        className="text-rose-600 hover:text-rose-700 font-medium text-[10px]"
                        title="Forget this saved signature"
                      >
                        Forget
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Sample Signature Generator Button (when cleared) */}
          {!rawImageSource && (
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={async () => {
                  if (onResetToSample) {
                    onResetToSample();
                  } else {
                    const sampleDataUrl = await createSampleSignatureJpg();
                    onImageSelected(sampleDataUrl);
                  }
                }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2"
              >
                Use sample handwritten signature
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Signature Size & Rotation Controls (When placed or selected) */}
        {processedSignature && selectedPlacement && (
          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Size & Rotation Controls
                </span>
              </div>
              <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                Active on Page {selectedPlacement.pageNumber}
              </span>
            </div>

            {/* Rotation Control */}
            <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-indigo-100/70">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-slate-400" />
                  Rotation Angle
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                    {selectedPlacement.rotation || 0}°
                  </span>
                  {(selectedPlacement.rotation || 0) !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleRotationChange(0)}
                      className="text-[10px] text-slate-400 hover:text-indigo-600 underline"
                      title="Reset to 0 degrees"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Continuous Angle Slider 0° - 360° */}
              <input
                id="signature-rotation-slider"
                type="range"
                min="0"
                max="360"
                step="1"
                value={selectedPlacement.rotation || 0}
                onChange={(e) => handleRotationChange(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />

              {/* Quick Rotation Buttons */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleRotationStep(-90)}
                  className="px-2 py-1 text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded font-medium text-slate-700 flex items-center justify-center gap-1"
                  title="Rotate -90° counter-clockwise"
                >
                  <RotateCcw className="w-2.5 h-2.5 text-indigo-500" />
                  -90°
                </button>
                <button
                  type="button"
                  onClick={() => handleRotationStep(90)}
                  className="px-2 py-1 text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded font-medium text-slate-700 flex items-center justify-center gap-1"
                  title="Rotate +90° clockwise"
                >
                  <RotateCw className="w-2.5 h-2.5 text-indigo-500" />
                  +90°
                </button>
                <button
                  type="button"
                  onClick={() => handleRotationStep(180)}
                  className="px-2 py-1 text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded font-medium text-slate-700 flex items-center justify-center"
                  title="Flip 180°"
                >
                  180°
                </button>
                <button
                  type="button"
                  onClick={() => handleRotationChange(0)}
                  className="px-2 py-1 text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded font-medium text-slate-700 flex items-center justify-center"
                  title="Reset to 0°"
                >
                  0° Level
                </button>
              </div>

              {/* Fine-tune +/- 5 degrees */}
              <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-500">
                <button
                  type="button"
                  onClick={() => handleRotationStep(-5)}
                  className="hover:text-indigo-600"
                >
                  ◀ Tilt -5°
                </button>
                <span>Or drag top round handle on document</span>
                <button
                  type="button"
                  onClick={() => handleRotationStep(5)}
                  className="hover:text-indigo-600"
                >
                  Tilt +5° ▶
                </button>
              </div>
            </div>

            {/* Size / Scale Control */}
            <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-indigo-100/70">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-slate-400" />
                  Signature Size
                </span>
                <span className="font-mono text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                  {Math.round(selectedPlacement.width)} × {Math.round(selectedPlacement.height)} pt
                </span>
              </div>

              {/* Width Slider */}
              <input
                id="signature-size-slider"
                type="range"
                min="50"
                max="350"
                step="2"
                value={selectedPlacement.width}
                onChange={(e) => handleScaleChange(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />

              {/* Quick Size Presets & Step Buttons */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleScaleStep(0.85)}
                  className="px-2 py-1 text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded font-medium text-slate-700 flex items-center justify-center gap-1"
                  title="Shrink signature 15%"
                >
                  <Minimize2 className="w-2.5 h-2.5 text-indigo-500" />
                  -15%
                </button>
                <button
                  type="button"
                  onClick={() => handleScaleStep(1.15)}
                  className="px-2 py-1 text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded font-medium text-slate-700 flex items-center justify-center gap-1"
                  title="Enlarge signature 15%"
                >
                  <Maximize2 className="w-2.5 h-2.5 text-indigo-500" />
                  +15%
                </button>
                <button
                  type="button"
                  onClick={() => handleScaleChange(120)}
                  className={`px-2 py-1 text-[11px] border rounded font-medium transition-colors ${
                    Math.abs(selectedPlacement.width - 120) < 10
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Compact size (120pt)"
                >
                  Small
                </button>
                <button
                  type="button"
                  onClick={() => handleScaleChange(190)}
                  className={`px-2 py-1 text-[11px] border rounded font-medium transition-colors ${
                    Math.abs(selectedPlacement.width - 190) < 10
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Large size (190pt)"
                >
                  Large
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center pt-0.5">
                Tip: Drag any of the 4 corner handles on the document to resize freely
              </p>
            </div>
          </div>
        )}

        {/* Translucency & Ink Tuning */}
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
                  <span>Eliminate shadow paper</span>
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
                    className={`text-xs py-1.5 px-2 rounded-lg border font-medium transition-all ${
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
                White paper is made translucent so underlying printed text or signature lines stay cleanly visible.
              </span>
            </div>
          </div>
        )}

        {/* Step 3: Add to Document Button */}
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
