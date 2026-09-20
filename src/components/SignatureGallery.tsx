import React, { useState, useRef } from 'react';
import {
  LayoutGrid,
  List,
  Star,
  Trash2,
  Edit2,
  Check,
  Plus,
  BookmarkCheck,
  Sparkles,
  Upload,
  Save,
  X,
  AlertTriangle,
} from 'lucide-react';
import { SavedSignatureData } from '../types';

interface SignatureGalleryProps {
  signatures: SavedSignatureData[];
  activeSignatureId: string | null;
  onSelect: (signature: SavedSignatureData) => void;
  onSaveCurrentAsNew: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onRename: (id: string, newName: string) => Promise<void>;
  onAddNewJpgClick: () => void;
  onAddPreset: (type: 'formal' | 'initials') => Promise<void>;
  onEmptyLibrary: () => Promise<void>;
  isCurrentSavedInLibrary: boolean;
}

export const SignatureGallery: React.FC<SignatureGalleryProps> = ({
  signatures,
  activeSignatureId,
  onSelect,
  onSaveCurrentAsNew,
  onDelete,
  onSetDefault,
  onRename,
  onAddNewJpgClick,
  onAddPreset,
  onEmptyLibrary,
  isCurrentSavedInLibrary,
}) => {
  // View mode: 'gallery' or 'dropdown'
  const [viewMode, setViewMode] = useState<'gallery' | 'dropdown'>('gallery');

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Inline "Save current as new" state
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [newSignatureName, setNewSignatureName] = useState('');

  // Delete single confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Empty whole library confirmation
  const [confirmEmptyLibrary, setConfirmEmptyLibrary] = useState(false);

  const handleStartRename = (sig: SavedSignatureData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(sig.id);
    setEditingName(sig.name);
  };

  const handleSaveRename = async (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingName.trim()) {
      await onRename(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameToSave = newSignatureName.trim() || `Signature ${signatures.length + 1}`;
    await onSaveCurrentAsNew(nameToSave);
    setIsSavingNew(false);
    setNewSignatureName('');
  };

  const activeSignature =
    signatures.find((s) => s.id === activeSignatureId) ||
    signatures.find((s) => s.isDefault) ||
    signatures[0] ||
    null;

  return (
    <div id="signature-library-section" className="space-y-3">
      {/* Header with Counter, Empty Library Button, and View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Saved Signatures
          </label>
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-full border border-indigo-200">
            {signatures.length}
          </span>
          {signatures.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmEmptyLibrary(true)}
              className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-0.5 ml-1 font-medium cursor-pointer"
              title="Empty entire signature library and clear memory"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>Empty</span>
            </button>
          )}
        </div>

        {/* Gallery / Dropdown View Toggle */}
        {signatures.length > 0 && (
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
            <button
              type="button"
              id="view-mode-gallery-btn"
              onClick={() => setViewMode('gallery')}
              className={`p-1 rounded-md transition-all flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                viewMode === 'gallery'
                  ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Gallery Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gallery</span>
            </button>
            <button
              type="button"
              id="view-mode-dropdown-btn"
              onClick={() => setViewMode('dropdown')}
              className={`p-1 rounded-md transition-all flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                viewMode === 'dropdown'
                  ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Dropdown List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dropdown</span>
            </button>
          </div>
        )}
      </div>

      {/* Save current signature as a new entry prompt */}
      {isSavingNew ? (
        <form
          onSubmit={handleSaveCurrent}
          className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
            <span>Save Current Signature as:</span>
            <button
              type="button"
              onClick={() => setIsSavingNew(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              autoFocus
              placeholder="e.g., Formal Contract, Initials, Jane Doe"
              value={newSignatureName}
              onChange={(e) => setNewSignatureName(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-white text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      ) : null}

      {/* EMPTY STATE: WHEN LIBRARY HAS 0 SIGNATURES */}
      {signatures.length === 0 && (
        <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center space-y-3">
          <p className="text-xs text-slate-600 font-medium">
            Signature library is empty (0 signatures).
          </p>
          <div className="flex flex-col gap-1.5 pt-1">
            <button
              type="button"
              onClick={onAddNewJpgClick}
              className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload JPG Signature</span>
            </button>
            <div className="flex gap-1.5 justify-center">
              <button
                type="button"
                onClick={() => onAddPreset('formal')}
                className="flex-1 py-1 px-2 text-[11px] bg-white border border-slate-200 hover:border-slate-300 rounded-md text-slate-700 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
              >
                + Formal Script
              </button>
              <button
                type="button"
                onClick={() => onAddPreset('initials')}
                className="flex-1 py-1 px-2 text-[11px] bg-white border border-slate-200 hover:border-slate-300 rounded-md text-slate-700 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
              >
                + Blue Initials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: DROPDOWN VIEW */}
      {signatures.length > 0 && viewMode === 'dropdown' && (
        <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 font-medium">
              Select active signature:
            </label>
            <select
              id="signature-dropdown-select"
              value={activeSignature?.id || ''}
              onChange={(e) => {
                const found = signatures.find((s) => s.id === e.target.value);
                if (found) onSelect(found);
              }}
              className="w-full text-xs font-semibold py-2 px-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-2xs cursor-pointer"
            >
              {signatures.map((sig) => (
                <option key={sig.id} value={sig.id}>
                  {sig.name} {sig.isDefault ? '★ (Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick actions for currently selected dropdown item */}
          {activeSignature && (
            <div className="flex items-center justify-between pt-1 text-[11px] border-t border-slate-200/60">
              <div className="flex items-center gap-1.5">
                {activeSignature.isDefault ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <BookmarkCheck className="w-3 h-3 text-emerald-600" />
                    Default
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetDefault(activeSignature.id)}
                    className="text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-1 p-1 hover:bg-white rounded transition-colors cursor-pointer"
                    title="Make this signature the default that auto-loads"
                  >
                    <Star className="w-3 h-3" />
                    Set as default
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => handleStartRename(activeSignature, e)}
                  className="text-slate-500 hover:text-slate-800 font-medium p-1 hover:bg-white rounded transition-colors cursor-pointer"
                  title="Rename this signature"
                >
                  <Edit2 className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingId(activeSignature.id)}
                  className="text-slate-400 hover:text-rose-600 font-medium p-1 hover:bg-white rounded transition-colors cursor-pointer"
                  title="Delete signature"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: GALLERY VIEW */}
      {signatures.length > 0 && viewMode === 'gallery' && (
        <div className="space-y-2">
          <div
            id="signature-gallery-grid"
            className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5"
          >
            {signatures.map((sig) => {
              const isActive = sig.id === activeSignatureId;
              const isEditing = editingId === sig.id;

              return (
                <div
                  key={sig.id}
                  onClick={() => onSelect(sig)}
                  className={`group relative rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer bg-white text-left ${
                    isActive
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs bg-indigo-50/20'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  {/* Checkerboard preview container */}
                  <div
                    className="w-full h-16 rounded-lg border border-slate-100 flex items-center justify-center p-1.5 relative overflow-hidden bg-slate-50 mb-1.5"
                    style={{
                      backgroundImage: `linear-gradient(45deg, #f1f5f9 25%, transparent 25%), 
                                       linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), 
                                       linear-gradient(45deg, transparent 75%, #f1f5f9 75%), 
                                       linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)`,
                      backgroundSize: '12px 12px',
                      backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <img
                      src={sig.dataUrl}
                      alt={sig.name}
                      className="max-h-full max-w-full object-contain pointer-events-none"
                    />

                    {/* Active check badge */}
                    {isActive && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Default star badge */}
                    {sig.isDefault && (
                      <div
                        className="absolute bottom-1 left-1 px-1 py-0.2 bg-emerald-600 text-white text-[9px] font-bold rounded-sm flex items-center gap-0.5 shadow-2xs"
                        title="Default signature on startup"
                      >
                        <span>Default</span>
                      </div>
                    )}
                  </div>

                  {/* Name and Rename Input */}
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1 mt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(sig.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-full text-[11px] px-1.5 py-0.5 border border-indigo-400 rounded bg-white text-slate-800 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveRename(sig.id);
                        }}
                        className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between min-w-0">
                      <span
                        className="text-[11px] font-semibold text-slate-700 truncate flex-1"
                        title={sig.name}
                      >
                        {sig.name}
                      </span>
                    </div>
                  )}

                  {/* Card Action overlay */}
                  <div
                    className="flex items-center justify-between pt-1 mt-1 border-t border-slate-100 text-[10px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!sig.isDefault ? (
                      <button
                        type="button"
                        onClick={() => onSetDefault(sig.id)}
                        className="text-slate-400 hover:text-amber-600 flex items-center gap-0.5 transition-colors cursor-pointer"
                        title="Set as default"
                      >
                        <Star className="w-2.5 h-2.5" />
                        <span>Set Default</span>
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-medium">Active Default</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(sig, e)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                        title="Rename"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingId(sig.id)}
                        className="text-slate-300 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                        title="Delete signature"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Card: Add / Upload New JPG */}
            <button
              type="button"
              id="gallery-add-new-btn"
              onClick={onAddNewJpgClick}
              className="rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/40 p-2 flex flex-col items-center justify-center min-h-24 text-slate-500 hover:text-indigo-600 transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center mb-1 transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold">Upload JPG</span>
              <span className="text-[9px] text-slate-400">New signature</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Bar: Save Current Signature or Add Presets */}
      <div className="flex items-center justify-between pt-1 gap-2">
        {!isSavingNew && (
          <button
            type="button"
            onClick={() => setIsSavingNew(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 py-1 px-2 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            title="Save current tuned signature to your collection"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to Library</span>
          </button>
        )}

        {/* Presets helper */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 ml-auto">
          <span>Add:</span>
          <button
            type="button"
            onClick={() => onAddPreset('formal')}
            className="text-indigo-600 hover:underline font-medium cursor-pointer"
          >
            + Formal
          </button>
          <button
            type="button"
            onClick={() => onAddPreset('initials')}
            className="text-indigo-600 hover:underline font-medium cursor-pointer"
          >
            + Initials
          </button>
        </div>
      </div>

      {/* Delete Single Signature Confirmation Modal */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeletingId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-4 max-w-xs w-full space-y-3 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-xs font-bold text-slate-900">Delete Signature?</h4>
            <p className="text-[11px] text-slate-500">
              Are you sure you want to remove this signature from your library?
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDelete(deletingId);
                  setDeletingId(null);
                }}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Library & Memory Confirmation Modal */}
      {confirmEmptyLibrary && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmEmptyLibrary(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-4 max-w-sm w-full space-y-3 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="text-sm font-bold text-slate-900">Empty Library and Memory?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will immediately remove all saved signatures and wipe the storage memory. You can start fresh or load sample signatures anytime.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEmptyLibrary(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onEmptyLibrary();
                  setConfirmEmptyLibrary(false);
                }}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                Empty Library & Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
