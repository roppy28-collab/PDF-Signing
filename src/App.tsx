import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { SignaturePanel } from './components/SignaturePanel';
import { PdfCanvas } from './components/PdfCanvas';
import { NotificationModal } from './components/NotificationModal';
import { LoadedPdfInfo, SignaturePlacement, SignatureSettings } from './types';
import { processSignatureImage, ProcessedSignature } from './utils/imageProcessor';
import { createSamplePdf } from './utils/samplePdf';
import { createSampleSignatureJpg } from './utils/sampleSignature';
import { signPdfDocument, savePdfToLocalFolder } from './utils/pdfSigner';
import {
  saveDefaultSignature,
  getDefaultSignature,
  clearDefaultSignature,
} from './utils/signatureStorage';
import { PDFDocument } from 'pdf-lib';
import { FileUp, AlertCircle } from 'lucide-react';

export default function App() {
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

  // Initial load: load sample PDF and restore last used signature (or sample on first visit)
  useEffect(() => {
    handleLoadSamplePdf();

    async function initDefaultSignature() {
      try {
        const saved = await getDefaultSignature();
        if (saved && saved.dataUrl) {
          setRawImageSource(saved.dataUrl);
          if (saved.settings) {
            setSettings(saved.settings);
          }
          if (saved.lastWidth) {
            setPreferredWidth(saved.lastWidth);
          }
          if (saved.lastRotation) {
            setPreferredRotation(saved.lastRotation);
          }
          setSavedDefaultInfo({
            isSaved: true,
            name: saved.name || 'Saved Signature',
            timestamp: saved.timestamp,
          });
          return;
        }
      } catch (err) {
        console.warn('Could not load saved default signature:', err);
      }

      // First time visitor fallback: sample handwritten signature
      const sampleSig = createSampleSignatureJpg();
      setRawImageSource(sampleSig);
    }

    initDefaultSignature();
  }, []);

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
          sigName = source.name || 'Uploaded Signature';
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(source);
          });
        }

        setRawImageSource(dataUrl);

        // Automatically save as default signature for future sessions
        const saved = await saveDefaultSignature(dataUrl, settings, sigName, {
          lastWidth: preferredWidth,
          lastRotation: preferredRotation,
        });

        setSavedDefaultInfo({
          isSaved: true,
          name: saved.name,
          timestamp: saved.timestamp,
        });
      } catch (err) {
        console.error('Failed to save signature as default:', err);
      } finally {
        setIsSavingDefault(false);
      }
    },
    [settings, preferredWidth, preferredRotation]
  );

  // Auto-sync signature tuning adjustments to default signature in storage
  useEffect(() => {
    if (!rawImageSource || typeof rawImageSource !== 'string') return;

    const timer = setTimeout(async () => {
      try {
        await saveDefaultSignature(
          rawImageSource,
          settings,
          savedDefaultInfo?.name || 'My Signature',
          {
            lastWidth: preferredWidth,
            lastRotation: preferredRotation,
          }
        );
      } catch (e) {
        // quiet catch
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [settings, rawImageSource, savedDefaultInfo?.name, preferredWidth, preferredRotation]);

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
        isSigning={isSigning}
        hasSignaturePlaced={placements.length > 0}
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
        <SignaturePanel
          rawImageSource={rawImageSource ? (typeof rawImageSource === 'string' ? rawImageSource : URL.createObjectURL(rawImageSource)) : null}
          processedSignature={processedSignature}
          settings={settings}
          onSettingsChange={setSettings}
          onImageSelected={handleImageSelected}
          onAddSignatureToPage={handleAddSignatureToPage}
          hasPdfLoaded={!!pdfInfo}
          isProcessing={isProcessingSignature}
          savedDefaultInfo={savedDefaultInfo}
          onResetToSample={handleResetToSample}
          onClearSavedDefault={handleClearSavedDefault}
          isSavingDefault={isSavingDefault}
        />

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
      />
    </div>
  );
}
