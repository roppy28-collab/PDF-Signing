import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { SignaturePanel } from './components/SignaturePanel';
import { PdfCanvas } from './components/PdfCanvas';
import { NotificationModal } from './components/NotificationModal';
import { LoadedPdfInfo, SavedSignatureData, SignaturePlacement, SignatureSettings } from './types';
import { processSignatureImage, ProcessedSignature } from './utils/imageProcessor';
import { createSamplePdf } from './utils/samplePdf';
import { createSampleSignatureJpg, createSampleInitialsJpg } from './utils/sampleSignature';
import { signPdfDocument, savePdfToLocalFolder } from './utils/pdfSigner';
import {
  saveSignatureToLibrary,
  getAllSavedSignatures,
  deleteSignatureFromLibrary,
  setDefaultSignatureId,
  renameSavedSignature,
  saveDefaultSignature,
  getDefaultSignature,
  clearDefaultSignature,
  clearAllSignaturesFromLibrary,
} from './utils/signatureStorage';
import { PDFDocument } from 'pdf-lib';
import { FileUp, AlertCircle, CheckCircle2, Info, PanelLeftOpen } from 'lucide-react';
import { EmailModal } from './components/EmailModal';
import { GmailImportModal } from './components/GmailImportModal';
import { InstallAppModal } from './components/InstallAppModal';
import { usePWAInstall } from './hooks/usePWAInstall';

export default function App() {
  // PWA install hook state
  const { isInstallable, isInstalled, install, hasNativePrompt } = usePWAInstall();
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);

  // Signature panel visibility state (can be hidden/shown by user)
  const [isSignaturePanelVisible, setIsSignaturePanelVisible] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('pdf_signer_signature_panel_visible');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleSignaturePanel = useCallback(() => {
    setIsSignaturePanelVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pdf_signer_signature_panel_visible', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Keyboard shortcut (Ctrl+B or Cmd+B) to toggle Signature Setup panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        handleToggleSignaturePanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleSignaturePanel]);

  // PDF state
  const [pdfInfo, setPdfInfo] = useState<LoadedPdfInfo | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [isLoadingSample, setIsLoadingSample] = useState<boolean>(false);

  // Signature state
  const [rawImageSource, setRawImageSource] = useState<string | File | null>(null);
  const [processedSignature, setProcessedSignature] = useState<ProcessedSignature | null>(null);
  const [isProcessingSignature, setIsProcessingSignature] = useState<boolean>(false);
  const [settings, setSettings] = useState<SignatureSettings>({
    removeBackground: true,
    threshold: 220,
    feathering: 20,
    opacity: 0.95,
    inkColorMode: 'original',
  });

  // Multiple saved signatures library state
  const [savedSignatures, setSavedSignatures] = useState<SavedSignatureData[]>([]);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);

  // Default signature persistence state
  const [savedDefaultInfo, setSavedDefaultInfo] = useState<{
    isSaved: boolean;
    name: string;
    timestamp: number;
  } | null>(null);
  const [isSavingDefault, setIsSavingDefault] = useState<boolean>(false);
  const [preferredWidth, setPreferredWidth] = useState<number>(160);
  const [preferredRotation, setPreferredRotation] = useState<number>(0);

  // Placed signatures on the PDF
  const [placements, setPlacements] = useState<SignaturePlacement[]>([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);

  // Derive currently active placement
  const selectedPlacement =
    placements.find((p) => p.id === selectedPlacementId) ||
    (placements.length > 0 ? placements[placements.length - 1] : null);

  // Signing & saving state
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [savedSuccessModal, setSavedSuccessModal] = useState<{
    isOpen: boolean;
    fileName: string;
    bytes: Uint8Array | null;
  }>({
    isOpen: false,
    fileName: '',
    bytes: null,
  });

  // Email modal state
  const [emailModal, setEmailModal] = useState<{
    isOpen: boolean;
    pdfBytes: Uint8Array | null;
  }>({
    isOpen: false,
    pdfBytes: null,
  });

  // Gmail import modal state
  const [gmailImportModalOpen, setGmailImportModalOpen] = useState<boolean>(false);

  // Toast feedback state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Global window drag & drop tracking
  const [isGlobalDragging, setIsGlobalDragging] = useState<boolean>(false);
  const dragCounterRef = useRef(0);

  // Handle loading PDF bytes
  const loadPdfFromBytes = useCallback(async (bytes: Uint8Array, fileName: string) => {
    try {
      setErrorMessage(null);
      // Create safe clone of bytes so PDF.js and pdf-lib can never detach the stored buffer
      const safeBytes = new Uint8Array(bytes.slice(0));
      const pdfDoc = await PDFDocument.load(safeBytes.slice(0));
      const numPages = pdfDoc.getPageCount();

      setPdfInfo({
        name: fileName,
        size: safeBytes.length,
        numPages,
        bytes: safeBytes,
      });
      setCurrentPage(1);
      setTotalPages(numPages);
      setPlacements([]); // reset placements for new document
      setSelectedPlacementId(null);
    } catch (err: any) {
      console.error('Failed to load PDF:', err);
      setErrorMessage('Could not open PDF file. Please ensure it is a valid document.');
    }
  }, []);

  // Handle PDF File selection
  const handlePdfSelected = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        await loadPdfFromBytes(new Uint8Array(buffer), file.name);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the selected file.');
    };
    reader.readAsArrayBuffer(file);
  }, [loadPdfFromBytes]);

  // Handle Sample PDF loading
  const handleLoadSamplePdf = async () => {
    try {
      setIsLoadingSample(true);
      const bytes = await createSamplePdf();
      await loadPdfFromBytes(bytes, 'Sample_Agreement.pdf');
    } catch (err) {
      console.error('Failed to create sample PDF:', err);
      setErrorMessage('Failed to generate sample PDF.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Re-process signature whenever raw source or settings change
  useEffect(() => {
    let isMounted = true;
    if (!rawImageSource) {
      setProcessedSignature(null);
      return;
    }

    async function runProcessing() {
      setIsProcessingSignature(true);
      try {
        const result = await processSignatureImage(rawImageSource!, settings);
        if (isMounted) {
          setProcessedSignature(result);
        }
      } catch (err) {
        console.error('Failed to process signature image:', err);
      } finally {
        if (isMounted) {
          setIsProcessingSignature(false);
        }
      }
    }

    runProcessing();

    return () => {
      isMounted = false;
    };
  }, [rawImageSource, settings]);

  // Initial load: load sample PDF and restore signatures library
  useEffect(() => {
    handleLoadSamplePdf();

    async function initSignaturesLibrary() {
      try {
        // User requested: "Empty library and memory" / fix 1629 signatures
        // Detect runaway bloat (>20 items) or perform initial clean purge
        const list = await getAllSavedSignatures();
        if (list.length > 20 || localStorage.getItem('purged_1629_corrupt') !== 'true') {
          await clearAllSignaturesFromLibrary();
          localStorage.setItem('purged_1629_corrupt', 'true');
          setSavedSignatures([]);
          setActiveSignatureId(null);
          setRawImageSource(null);
          setProcessedSignature(null);
          setSavedDefaultInfo(null);
          return;
        }

        setSavedSignatures(list);

        const defaultSig = list.find((s) => s.isDefault) || list[0];
        if (defaultSig && defaultSig.dataUrl) {
          setActiveSignatureId(defaultSig.id);
          setRawImageSource(defaultSig.dataUrl);
          if (defaultSig.settings) {
            setSettings(defaultSig.settings);
          }
          if (defaultSig.lastWidth) {
            setPreferredWidth(defaultSig.lastWidth);
          }
          if (defaultSig.lastRotation) {
            setPreferredRotation(defaultSig.lastRotation);
          }
          setSavedDefaultInfo({
            isSaved: true,
            name: defaultSig.name || 'Saved Signature',
            timestamp: defaultSig.timestamp,
          });
          return;
        }
      } catch (err) {
        console.warn('Could not load signatures library:', err);
      }
    }

    initSignaturesLibrary();
  }, []);

  // Switch to a chosen saved signature from Gallery or Dropdown
  const handleSelectSavedSignature = useCallback(
    (sig: SavedSignatureData) => {
      setActiveSignatureId(sig.id);
      setRawImageSource(sig.dataUrl);
      if (sig.settings) {
        setSettings(sig.settings);
      }
      if (sig.lastWidth) {
        setPreferredWidth(sig.lastWidth);
      }
      if (sig.lastRotation !== undefined) {
        setPreferredRotation(sig.lastRotation);
      }
      setSavedDefaultInfo({
        isSaved: !!sig.isDefault,
        name: sig.name,
        timestamp: sig.timestamp,
      });
      showToast(`Active signature: "${sig.name}"`, 'info');
    },
    [showToast]
  );

  // Save current signature as a new entry in library
  const handleSaveCurrentToLibrary = useCallback(
    async (name: string) => {
      if (!rawImageSource) return;

      let dataUrl = '';
      if (typeof rawImageSource === 'string') {
        dataUrl = rawImageSource;
      } else {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(rawImageSource);
        });
      }

      const newSig = await saveSignatureToLibrary({
        name,
        dataUrl,
        settings,
        lastWidth: preferredWidth,
        lastRotation: preferredRotation,
        isDefault: savedSignatures.length === 0,
      });

      const updatedList = await getAllSavedSignatures();
      setSavedSignatures(updatedList);
      setActiveSignatureId(newSig.id);
      showToast(`Saved "${newSig.name}" to your library`, 'success');
    },
    [rawImageSource, settings, preferredWidth, preferredRotation, savedSignatures.length, showToast]
  );

  // Delete a saved signature from library
  const handleDeleteSavedSignature = useCallback(
    async (id: string) => {
      await deleteSignatureFromLibrary(id);
      const updatedList = await getAllSavedSignatures();
      setSavedSignatures(updatedList);

      if (activeSignatureId === id) {
        const next = updatedList.find((s) => s.isDefault) || updatedList[0];
        if (next) {
          handleSelectSavedSignature(next);
        } else {
          setActiveSignatureId(null);
          setRawImageSource(null);
        }
      }
      showToast('Signature deleted from library', 'info');
    },
    [activeSignatureId, handleSelectSavedSignature, showToast]
  );

  // Set default signature
  const handleSetDefaultSignature = useCallback(
    async (id: string) => {
      await setDefaultSignatureId(id);
      const updatedList = await getAllSavedSignatures();
      setSavedSignatures(updatedList);
      const target = updatedList.find((s) => s.id === id);
      if (target) {
        setSavedDefaultInfo({
          isSaved: true,
          name: target.name,
          timestamp: target.timestamp,
        });
        showToast(`"${target.name}" set as default signature`, 'success');
      }
    },
    [showToast]
  );

  // Rename saved signature
  const handleRenameSavedSignature = useCallback(
    async (id: string, newName: string) => {
      await renameSavedSignature(id, newName);
      const updatedList = await getAllSavedSignatures();
      setSavedSignatures(updatedList);
      showToast(`Renamed to "${newName}"`, 'success');
    },
    [showToast]
  );

  // Add preset signature (e.g. Formal script or Blue initials)
  const handleAddPresetSignature = useCallback(
    async (type: 'formal' | 'initials') => {
      const dataUrl = type === 'formal' ? createSampleSignatureJpg() : createSampleInitialsJpg();
      const name = type === 'formal' ? 'Formal Script' : 'Blue Initials';
      const presetSettings: SignatureSettings =
        type === 'formal'
          ? { removeBackground: true, threshold: 220, feathering: 20, opacity: 0.95, inkColorMode: 'original' }
          : { removeBackground: true, threshold: 215, feathering: 15, opacity: 0.95, inkColorMode: 'royal-blue' };

      const saved = await saveSignatureToLibrary({
        name,
        dataUrl,
        settings: presetSettings,
        lastWidth: type === 'formal' ? 170 : 120,
        lastRotation: 0,
        isDefault: false,
      });

      const updatedList = await getAllSavedSignatures();
      setSavedSignatures(updatedList);
      handleSelectSavedSignature(saved);
      showToast(`Added sample: "${name}"`, 'success');
    },
    [handleSelectSavedSignature, showToast]
  );

  // Handle user selecting/uploading a new signature image
  const handleImageSelected = useCallback(
    async (source: string | File) => {
      if (!source) {
        setRawImageSource(null);
        return;
      }

      setIsSavingDefault(true);
      try {
        let dataUrl = '';
        let sigName = 'Imported Signature';

        if (typeof source === 'string') {
          dataUrl = source;
          sigName = source.startsWith('data:image/svg')
            ? 'Sample Signature'
            : 'Imported Signature';
        } else {
          sigName = source.name.replace(/\.[^/.]+$/, '') || 'Uploaded Signature';
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(source);
          });
        }

        setRawImageSource(dataUrl);

        // Automatically save into the signature library and activate it
        const saved = await saveSignatureToLibrary({
          name: sigName,
          dataUrl,
          settings,
          lastWidth: preferredWidth,
          lastRotation: preferredRotation,
          isDefault: savedSignatures.length === 0,
        });

        const updatedList = await getAllSavedSignatures();
        setSavedSignatures(updatedList);
        setActiveSignatureId(saved.id);

        setSavedDefaultInfo({
          isSaved: saved.isDefault || false,
          name: saved.name,
          timestamp: saved.timestamp,
        });

        showToast(`Added "${saved.name}" to your signatures`, 'success');
      } catch (err) {
        console.error('Failed to save signature:', err);
      } finally {
        setIsSavingDefault(false);
      }
    },
    [settings, preferredWidth, preferredRotation, savedSignatures.length, showToast]
  );

  // Empty entire signature library and wipe memory
  const handleEmptyLibrary = useCallback(async () => {
    await clearAllSignaturesFromLibrary();
    setSavedSignatures([]);
    setActiveSignatureId(null);
    setRawImageSource(null);
    setProcessedSignature(null);
    setSavedDefaultInfo(null);
    showToast('Signature library and memory emptied', 'info');
  }, [showToast]);

  // Reset to demo sample signature
  const handleResetToSample = useCallback(async () => {
    const sampleSig = createSampleSignatureJpg();
    setRawImageSource(sampleSig);
    const defaultSettings: SignatureSettings = {
      removeBackground: true,
      threshold: 220,
      feathering: 20,
      opacity: 0.95,
      inkColorMode: 'original',
    };
    setSettings(defaultSettings);
    await clearDefaultSignature();
    setSavedDefaultInfo(null);
  }, []);

  // Clear saved default
  const handleClearSavedDefault = useCallback(async () => {
    await clearDefaultSignature();
    setSavedDefaultInfo(null);
  }, []);

  // Place signature on the active page
  const handleAddSignatureToPage = useCallback(() => {
    if (!processedSignature || !pdfInfo) return;

    // Default dimensions based on aspect ratio and user's preferred width
    const width = preferredWidth || 160;
    const height = width / processedSignature.originalAspect;

    // Place nicely at the bottom right or center of page
    const newPlacement: SignaturePlacement = {
      id: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      pageNumber: currentPage,
      x: 320, // aligns well with signature line in standard documents
      y: 180, // bottom area in PDF coordinates
      width,
      height,
      rotation: preferredRotation || 0,
      signaturePngDataUrl: processedSignature.dataUrl,
    };

    setPlacements((prev) => [...prev, newPlacement]);
    setSelectedPlacementId(newPlacement.id);
  }, [processedSignature, pdfInfo, currentPage, preferredWidth, preferredRotation]);

  const handlePlaceSignatureAt = useCallback(
    (pageNumber: number, pdfX: number, pdfY: number) => {
      if (!processedSignature) return;
      const width = preferredWidth || 160;
      const height = width / processedSignature.originalAspect;

      const newPlacement: SignaturePlacement = {
        id: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        pageNumber,
        x: Math.max(20, pdfX - width / 2),
        y: Math.max(20, pdfY - height / 2),
        width,
        height,
        rotation: preferredRotation || 0,
        signaturePngDataUrl: processedSignature.dataUrl,
      };

      setPlacements((prev) => [...prev, newPlacement]);
      setSelectedPlacementId(newPlacement.id);
    },
    [processedSignature, preferredWidth, preferredRotation]
  );

  const handleUpdatePlacement = useCallback((updated: SignaturePlacement) => {
    setPlacements((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    if (updated.width) setPreferredWidth(updated.width);
    if (updated.rotation !== undefined) setPreferredRotation(updated.rotation);
  }, []);

  const handleRemovePlacement = useCallback((id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
    setSelectedPlacementId((prev) => (prev === id ? null : prev));
  }, []);

  // Sign and Save PDF to Local Folder
  const handleSignAndSave = async () => {
    if (!pdfInfo || !processedSignature || placements.length === 0) return;

    setIsSigning(true);
    setErrorMessage(null);

    try {
      // 1. Embed translucent signature into PDF
      const signedBytes = await signPdfDocument({
        pdfBytes: pdfInfo.bytes.slice(0),
        signaturePngDataUrl: processedSignature.dataUrl,
        placements,
      });

      // 2. Determine suggested filename
      const baseName = pdfInfo.name.replace(/\.[^/.]+$/, '');
      const suggestedName = `${baseName}_signed.pdf`;

      // 3. Save to local folder
      const result = await savePdfToLocalFolder(signedBytes, suggestedName);

      if (result.success) {
        setSavedSuccessModal({
          isOpen: true,
          fileName: result.filename,
          bytes: signedBytes,
        });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User voluntarily canceled the file picker dialog
        console.log('User cancelled folder save dialog');
      } else {
        console.error('Error signing/saving PDF:', err);
        setErrorMessage('Failed to sign and save PDF. Please try again.');
      }
    } finally {
      setIsSigning(false);
    }
  };

  // Sign document and open email modal (Gmail / Outlook)
  const handleOpenEmailModal = async () => {
    if (!pdfInfo || !processedSignature || placements.length === 0) return;

    setIsSigning(true);
    setErrorMessage(null);

    try {
      const signedBytes = await signPdfDocument({
        pdfBytes: pdfInfo.bytes.slice(0),
        signaturePngDataUrl: processedSignature.dataUrl,
        placements,
      });

      setEmailModal({
        isOpen: true,
        pdfBytes: signedBytes,
      });
    } catch (err: any) {
      console.error('Error signing PDF for email:', err);
      setErrorMessage('Failed to prepare signed document for emailing. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  // Global drag & drop listeners for PDF files
  const handleGlobalDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsGlobalDragging(true);
    }
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsGlobalDragging(false);
      dragCounterRef.current = 0;
    }
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragging(false);
    dragCounterRef.current = 0;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        handlePdfSelected(file);
      } else if (file.type.startsWith('image/')) {
        setRawImageSource(file);
      }
    }
  };

  return (
    <div
      id="app-root-container"
      onDragEnter={handleGlobalDragEnter}
      onDragLeave={handleGlobalDragLeave}
      onDragOver={handleGlobalDragOver}
      onDrop={handleGlobalDrop}
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans"
    >
      {/* Top Application Header */}
      <Header
        pdfInfo={pdfInfo}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)))}
        scale={scale}
        onScaleChange={setScale}
        onFitWidth={() => setScale(1.0)}
        onOpenNewPdfClick={() => {
          const input = document.getElementById('pdf-file-picker-input') as HTMLInputElement;
          input?.click();
        }}
        onSignAndSave={handleSignAndSave}
        onOpenEmailModal={handleOpenEmailModal}
        onOpenGmailImport={() => setGmailImportModalOpen(true)}
        onOpenInstallModal={() => setInstallModalOpen(true)}
        isAppInstalled={isInstalled}
        isSigning={isSigning}
        hasSignaturePlaced={placements.length > 0}
        isSignaturePanelVisible={isSignaturePanelVisible}
        onToggleSignaturePanel={handleToggleSignaturePanel}
      />

      {/* Error alert if any */}
      {errorMessage && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 font-bold px-2 py-0.5 rounded"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: JPG Signature and Translucency Settings */}
        {isSignaturePanelVisible && (
          <SignaturePanel
            rawImageSource={rawImageSource ? (typeof rawImageSource === 'string' ? rawImageSource : URL.createObjectURL(rawImageSource)) : null}
            processedSignature={processedSignature}
            settings={settings}
            onSettingsChange={setSettings}
            onImageSelected={handleImageSelected}
            onAddSignatureToPage={handleAddSignatureToPage}
            hasPdfLoaded={!!pdfInfo}
            isProcessing={isProcessingSignature}
            savedSignatures={savedSignatures}
            activeSignatureId={activeSignatureId}
            onSelectSavedSignature={handleSelectSavedSignature}
            onSaveCurrentToLibrary={handleSaveCurrentToLibrary}
            onDeleteSavedSignature={handleDeleteSavedSignature}
            onSetDefaultSignature={handleSetDefaultSignature}
            onRenameSavedSignature={handleRenameSavedSignature}
            onAddPresetSignature={handleAddPresetSignature}
            onEmptyLibrary={handleEmptyLibrary}
            savedDefaultInfo={savedDefaultInfo}
            onResetToSample={handleResetToSample}
            onClearSavedDefault={handleClearSavedDefault}
            isSavingDefault={isSavingDefault}
            onHidePanel={() => {
              setIsSignaturePanelVisible(false);
              try {
                localStorage.setItem('pdf_signer_signature_panel_visible', 'false');
              } catch {}
            }}
          />
        )}

        {/* Floating Reopen Button when Signature Setup is hidden */}
        {!isSignaturePanelVisible && (
          <button
            id="floating-show-signature-setup-btn"
            type="button"
            onClick={() => {
              setIsSignaturePanelVisible(true);
              try {
                localStorage.setItem('pdf_signer_signature_panel_visible', 'true');
              } catch {}
            }}
            className="absolute left-3 top-3 z-30 flex items-center gap-2 px-3 py-2 bg-white/95 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-xl shadow-md border border-slate-200/90 text-xs font-semibold backdrop-blur-xs transition-all cursor-pointer active:scale-95 group hover:border-indigo-300 hover:shadow-lg"
            title="Show Signature Setup (Ctrl+B)"
          >
            <PanelLeftOpen className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Signature Setup</span>
          </button>
        )}

        {/* Center / Right: PDF Document Area or Drop Zone */}
        {pdfInfo ? (
          <PdfCanvas
            pdfBytes={pdfInfo.bytes}
            currentPage={currentPage}
            scale={scale}
            signaturePlacements={placements}
            onUpdatePlacement={handleUpdatePlacement}
            onRemovePlacement={handleRemovePlacement}
            processedSignature={processedSignature}
            onPlaceSignatureAt={handlePlaceSignatureAt}
            selectedPlacementId={selectedPlacementId}
            onSelectPlacement={setSelectedPlacementId}
          />
        ) : (
          <DropZone
            onPdfSelected={handlePdfSelected}
            onLoadSamplePdf={handleLoadSamplePdf}
            isLoadingSample={isLoadingSample}
            onOpenGmailImport={() => setGmailImportModalOpen(true)}
          />
        )}

        {/* Fullscreen Drag Overlay if file dragged anywhere over window */}
        {isGlobalDragging && (
          <div className="absolute inset-0 z-50 bg-indigo-900/60 backdrop-blur-xs flex items-center justify-center pointer-events-none animate-fade-in">
            <div className="bg-white rounded-2xl p-8 shadow-2xl border border-indigo-100 flex flex-col items-center max-w-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 ring-8 ring-indigo-50/50">
                <FileUp className="w-8 h-8 animate-bounce" />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">
                Drop file here
              </h4>
              <p className="text-xs text-slate-500">
                Drop your PDF document or JPG signature to load
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file picker for header action */}
      <input
        type="file"
        id="pdf-file-picker-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePdfSelected(file);
        }}
        accept="application/pdf"
        className="hidden"
      />

      {/* Local Save Success Confirmation Modal */}
      <NotificationModal
        isOpen={savedSuccessModal.isOpen}
        onClose={() => setSavedSuccessModal((prev) => ({ ...prev, isOpen: false }))}
        fileName={savedSuccessModal.fileName}
        savedPdfBytes={savedSuccessModal.bytes}
        onEmailClick={handleOpenEmailModal}
      />

      {/* Email Modal (Gmail & Outlook) */}
      <EmailModal
        isOpen={emailModal.isOpen}
        onClose={() => setEmailModal({ isOpen: false, pdfBytes: null })}
        pdfBytes={emailModal.pdfBytes}
        documentName={
          pdfInfo
            ? `${pdfInfo.name.replace(/\.[^/.]+$/, '')}_signed.pdf`
            : 'document_signed.pdf'
        }
        onShowToast={showToast}
      />

      {/* Gmail Document Import Modal */}
      <GmailImportModal
        isOpen={gmailImportModalOpen}
        onClose={() => setGmailImportModalOpen(false)}
        onPdfSelected={(bytes, filename) => {
          loadPdfFromBytes(bytes, filename);
        }}
        onShowToast={showToast}
      />

      {/* PWA Install Modal */}
      <InstallAppModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        hasNativePrompt={hasNativePrompt}
        onNativeInstall={install}
        isInstalled={isInstalled}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : toast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-indigo-600 text-white border-indigo-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white/70 hover:text-white p-0.5"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
