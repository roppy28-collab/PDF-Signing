import React, { useEffect, useRef, useState, useCallback } from 'react';
import { pdfjsLib } from '../utils/pdfRenderer';
import { SignaturePlacement } from '../types';
import { ProcessedSignature } from '../utils/imageProcessor';
import {
  RotateCw,
  RotateCcw,
  X,
  Move,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Compass
} from 'lucide-react';

interface PdfCanvasProps {
  pdfBytes: Uint8Array;
  currentPage: number;
  scale: number;
  onScaleCalculated?: (fitScale: number) => void;
  signaturePlacements: SignaturePlacement[];
  onUpdatePlacement: (placement: SignaturePlacement) => void;
  onRemovePlacement: (id: string) => void;
  processedSignature: ProcessedSignature | null;
  onPlaceSignatureAt: (pageNumber: number, pdfX: number, pdfY: number) => void;
  selectedPlacementId: string | null;
  onSelectPlacement: (id: string | null) => void;
}

export const PdfCanvas: React.FC<PdfCanvasProps> = ({
  pdfBytes,
  currentPage,
  scale,
  signaturePlacements,
  onUpdatePlacement,
  onRemovePlacement,
  processedSignature,
  onPlaceSignatureAt,
  selectedPlacementId,
  onSelectPlacement,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<any>(null);

  const [pageSize, setPageSize] = useState<{
    width: number; // PDF points
    height: number; // PDF points
    viewportWidth: number; // Screen pixels
    viewportHeight: number; // Screen pixels
  } | null>(null);

  const [activeDrag, setActiveDrag] = useState<{
    type: 'move' | 'resize' | 'rotate';
    handle?: 'nw' | 'ne' | 'sw' | 'se';
    placementId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    aspectRatio: number;
    centerX?: number;
    centerY?: number;
    initialRotation?: number;
  } | null>(null);

  const [rotatingAngleTooltip, setRotatingAngleTooltip] = useState<number | null>(null);

  // Load PDF Document when bytes change
  useEffect(() => {
    let isCancelled = false;

    async function loadDocument() {
      try {
        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
        }
        // Slice the buffer copy so PDF.js worker postMessage does not detach the original buffer
        const dataCopy = new Uint8Array(pdfBytes.slice(0));
        const loadingTask = pdfjsLib.getDocument({ data: dataCopy });
        const doc = await loadingTask.promise;
        if (!isCancelled) {
          pdfDocRef.current = doc;
          renderPage(doc, currentPage, scale);
        }
      } catch (err) {
        console.error('Error loading PDF document:', err);
      }
    }

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [pdfBytes]);

  // Render current page when page or scale changes
  const renderPage = useCallback(
    async (doc: any, pageNum: number, currentScale: number) => {
      if (!doc) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await doc.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const viewport = page.getViewport({ scale: currentScale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Support high DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        setPageSize({
          width: unscaledViewport.width,
          height: unscaledViewport.height,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
        });

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(pdfDocRef.current, currentPage, scale);
    }
  }, [currentPage, scale, renderPage]);

  // Filter signatures for the current page
  const currentPagePlacements = signaturePlacements.filter(
    (p) => p.pageNumber === currentPage
  );

  // Auto-select latest placement if none selected on this page
  useEffect(() => {
    if (currentPagePlacements.length > 0 && !selectedPlacementId) {
      onSelectPlacement(currentPagePlacements[currentPagePlacements.length - 1].id);
    }
  }, [currentPagePlacements.length, selectedPlacementId, onSelectPlacement]);

  // Pointer Handlers for Move
  const handlePointerDownMove = (
    e: React.PointerEvent,
    placement: SignaturePlacement
  ) => {
    e.stopPropagation();
    onSelectPlacement(placement.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setActiveDrag({
      type: 'move',
      placementId: placement.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: placement.x,
      initialY: placement.y,
      initialWidth: placement.width,
      initialHeight: placement.height,
      aspectRatio: placement.width / placement.height,
    });
  };

  // Pointer Handlers for 4-Corner Resize
  const handlePointerDownResize = (
    e: React.PointerEvent,
    placement: SignaturePlacement,
    handle: 'nw' | 'ne' | 'sw' | 'se'
  ) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setActiveDrag({
      type: 'resize',
      handle,
      placementId: placement.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: placement.x,
      initialY: placement.y,
      initialWidth: placement.width,
      initialHeight: placement.height,
      aspectRatio: placement.width / placement.height,
    });
  };

  // Pointer Handler for Interactive Free Rotation
  const handlePointerDownRotate = (
    e: React.PointerEvent,
    placement: SignaturePlacement
  ) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (!pageSize) return;

    // Calculate center of signature in screen viewport coordinates
    const screenX = placement.x * scale;
    const screenY = pageSize.viewportHeight - (placement.y + placement.height) * scale;
    const screenW = placement.width * scale;
    const screenH = placement.height * scale;

    const pageWrapper = document.getElementById('pdf-page-wrapper');
    const wrapperRect = pageWrapper?.getBoundingClientRect();

    const centerX = (wrapperRect?.left || 0) + screenX + screenW / 2;
    const centerY = (wrapperRect?.top || 0) + screenY + screenH / 2;

    setActiveDrag({
      type: 'rotate',
      placementId: placement.id,
      startX: e.clientX,
      startY: e.clientY,
      centerX,
      centerY,
      initialX: placement.x,
      initialY: placement.y,
      initialWidth: placement.width,
      initialHeight: placement.height,
      aspectRatio: placement.width / placement.height,
      initialRotation: placement.rotation || 0,
    });

    setRotatingAngleTooltip(placement.rotation || 0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDrag || !pageSize) return;

    const currentPlacement = signaturePlacements.find(
      (p) => p.id === activeDrag.placementId
    );
    if (!currentPlacement) return;

    if (activeDrag.type === 'move') {
      const deltaPixelX = e.clientX - activeDrag.startX;
      const deltaPixelY = e.clientY - activeDrag.startY;

      const deltaPdfX = deltaPixelX / scale;
      const deltaPdfY = -deltaPixelY / scale;

      let newX = activeDrag.initialX + deltaPdfX;
      let newY = activeDrag.initialY + deltaPdfY;

      // Keep within page boundaries with safety margins
      newX = Math.max(0, Math.min(pageSize.width - currentPlacement.width, newX));
      newY = Math.max(0, Math.min(pageSize.height - currentPlacement.height, newY));

      onUpdatePlacement({
        ...currentPlacement,
        x: newX,
        y: newY,
      });
    } else if (activeDrag.type === 'resize') {
      const deltaPixelX = e.clientX - activeDrag.startX;
      const handle = activeDrag.handle || 'se';

      let newWidth = activeDrag.initialWidth;
      let newHeight = activeDrag.initialHeight;
      let newX = activeDrag.initialX;
      let newY = activeDrag.initialY;

      if (handle === 'se') {
        // Dragging bottom-right
        const deltaPdfX = deltaPixelX / scale;
        newWidth = Math.max(40, Math.min(pageSize.width - activeDrag.initialX, activeDrag.initialWidth + deltaPdfX));
        newHeight = newWidth / activeDrag.aspectRatio;
        const deltaH = newHeight - activeDrag.initialHeight;
        newY = activeDrag.initialY - deltaH;
      } else if (handle === 'sw') {
        // Dragging bottom-left
        const deltaPdfX = -deltaPixelX / scale;
        newWidth = Math.max(40, activeDrag.initialWidth + deltaPdfX);
        newHeight = newWidth / activeDrag.aspectRatio;
        newX = activeDrag.initialX + (activeDrag.initialWidth - newWidth);
        const deltaH = newHeight - activeDrag.initialHeight;
        newY = activeDrag.initialY - deltaH;
      } else if (handle === 'ne') {
        // Dragging top-right
        const deltaPdfX = deltaPixelX / scale;
        newWidth = Math.max(40, Math.min(pageSize.width - activeDrag.initialX, activeDrag.initialWidth + deltaPdfX));
        newHeight = newWidth / activeDrag.aspectRatio;
      } else if (handle === 'nw') {
        // Dragging top-left
        const deltaPdfX = -deltaPixelX / scale;
        newWidth = Math.max(40, activeDrag.initialWidth + deltaPdfX);
        newHeight = newWidth / activeDrag.aspectRatio;
        newX = activeDrag.initialX + (activeDrag.initialWidth - newWidth);
      }

      onUpdatePlacement({
        ...currentPlacement,
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        width: newWidth,
        height: newHeight,
      });
    } else if (activeDrag.type === 'rotate') {
      const centerX = activeDrag.centerX ?? 0;
      const centerY = activeDrag.centerY ?? 0;

      // Calculate angle from center to mouse pointer
      const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      let deg = Math.round((rad * 180) / Math.PI);

      // Since handle is at top (which is -90 deg), add 90 deg
      let angle = (deg + 90) % 360;
      if (angle < 0) angle += 360;

      // Snap to 0°, 45°, 90°, 180°, 270° within 4 degrees
      const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
      for (const s of snapAngles) {
        if (Math.abs(angle - s) <= 4 || Math.abs(angle - (s - 360)) <= 4) {
          angle = s % 360;
          break;
        }
      }

      setRotatingAngleTooltip(angle);
      onUpdatePlacement({
        ...currentPlacement,
        rotation: angle,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDrag) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe ignore
      }
      setActiveDrag(null);
      setRotatingAngleTooltip(null);
    }
  };

  // Quick resize helper (+/- percent)
  const adjustSize = (placement: SignaturePlacement, factor: number) => {
    if (!pageSize) return;
    const aspect = placement.width / placement.height;
    const newWidth = Math.max(40, Math.min(pageSize.width - placement.x, placement.width * factor));
    const newHeight = newWidth / aspect;
    const deltaH = newHeight - placement.height;
    onUpdatePlacement({
      ...placement,
      width: newWidth,
      height: newHeight,
      y: Math.max(0, placement.y - deltaH / 2),
      x: Math.max(0, placement.x - (newWidth - placement.width) / 2),
    });
  };

  // Quick rotate helper
  const adjustRotation = (placement: SignaturePlacement, deltaDeg: number) => {
    const next = ((placement.rotation || 0) + deltaDeg) % 360;
    onUpdatePlacement({
      ...placement,
      rotation: next < 0 ? next + 360 : next,
    });
  };

  // Direct click on document to place signature
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pageSize || !processedSignature) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pdfX = clickX / scale;
    const pdfY = (pageSize.viewportHeight - clickY) / scale;

    if (currentPagePlacements.length === 0) {
      onPlaceSignatureAt(currentPage, pdfX, pdfY);
    } else {
      // Clicked blank space deselects
      onSelectPlacement(null);
    }
  };

  return (
    <div
      ref={containerRef}
      id="pdf-viewport-container"
      className="flex-1 overflow-auto bg-slate-200/70 p-4 sm:p-8 flex justify-center items-start relative select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        id="pdf-page-wrapper"
        onClick={handleCanvasClick}
        className="relative bg-white shadow-xl rounded-xs transition-shadow ring-1 ring-black/5"
        style={{
          width: pageSize?.viewportWidth,
          height: pageSize?.viewportHeight,
        }}
      >
        {/* The PDF Page Canvas */}
        <canvas ref={canvasRef} className="block pointer-events-none" />

        {/* Empty state prompt on page if no signature placed yet */}
        {pageSize && currentPagePlacements.length === 0 && processedSignature && (
          <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none">
            <div className="bg-slate-900/75 backdrop-blur-xs text-white text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Click anywhere on document or click &apos;Place Signature&apos;</span>
            </div>
          </div>
        )}

        {/* Translucent Signature Placements */}
        {pageSize &&
          processedSignature &&
          currentPagePlacements.map((placement) => {
            const screenX = placement.x * scale;
            const screenY =
              pageSize.viewportHeight - (placement.y + placement.height) * scale;
            const screenW = placement.width * scale;
            const screenH = placement.height * scale;
            const isSelected = selectedPlacementId === placement.id;
            const isCurrentlyRotating =
              activeDrag?.type === 'rotate' && activeDrag.placementId === placement.id;
            const isNearTop = screenY < 95;

            return (
              <div
                key={placement.id}
                id={`signature-element-${placement.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlacement(placement.id);
                }}
                onPointerDown={(e) => handlePointerDownMove(e, placement)}
                className={`absolute cursor-move group transition-shadow ${
                  isSelected
                    ? 'ring-2 ring-indigo-600 shadow-md'
                    : 'hover:ring-1 hover:ring-indigo-400'
                }`}
                style={{
                  left: `${screenX}px`,
                  top: `${screenY}px`,
                  width: `${screenW}px`,
                  height: `${screenH}px`,
                  transform: `rotate(${placement.rotation || 0}deg)`,
                  transformOrigin: 'center center',
                  touchAction: 'none',
                }}
              >
                {/* The Translucent Cutout Signature Image */}
                <img
                  src={processedSignature.dataUrl}
                  alt="Placed Signature"
                  className="w-full h-full object-contain pointer-events-none select-none"
                  draggable={false}
                />

                {/* Live Angle Indicator when rotating */}
                {isSelected && (isCurrentlyRotating || rotatingAngleTooltip !== null) && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-mono px-2 py-0.5 rounded-md shadow-md z-40 pointer-events-none whitespace-nowrap">
                    {placement.rotation || 0}°
                  </div>
                )}

                {/* Floating Multi-Action Bar (Position, Rotate, Resize, Remove) with generous clearance from rotation knob */}
                {isSelected && (
                  <div
                    className={`absolute ${
                      isNearTop ? 'top-[calc(100%+16px)]' : '-top-22'
                    } left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xs text-white rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-xl text-xs z-30 pointer-events-auto border border-slate-700/50 whitespace-nowrap`}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] text-slate-300 px-1 font-medium flex items-center gap-1">
                      <Move className="w-2.5 h-2.5 text-indigo-400" />
                      Drag
                    </span>

                    <div className="h-3.5 w-px bg-slate-700 mx-1" />

                    {/* Quick Rotate Buttons */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => adjustRotation(placement, -90)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                        title="Rotate -90° (Counter-clockwise)"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustRotation(placement, 90)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                        title="Rotate +90° (Clockwise)"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>

                      {/* Rotation Angle Readout & Reset to 0 */}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdatePlacement({
                            ...placement,
                            rotation: 0,
                          })
                        }
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-indigo-300 transition-colors flex items-center gap-1 ml-0.5"
                        title="Reset Rotation to 0°"
                      >
                        <Compass className="w-2.5 h-2.5 text-indigo-400" />
                        <span>{placement.rotation || 0}°</span>
                      </button>
                    </div>

                    <div className="h-3.5 w-px bg-slate-700 mx-1" />

                    {/* Quick Scale Buttons */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => adjustSize(placement, 0.85)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                        title="Shrink (-15%)"
                      >
                        <ZoomOut className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustSize(placement, 1.15)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                        title="Enlarge (+15%)"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="h-3.5 w-px bg-slate-700 mx-1" />

                    {/* Delete Placement */}
                    <button
                      type="button"
                      onClick={() => onRemovePlacement(placement.id)}
                      className="p-1 hover:bg-rose-600 rounded text-slate-300 hover:text-white transition-colors"
                      title="Remove signature"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Interactive Top Rotation Stem & Handle (Separated with generous room below the control bar) */}
                {isSelected && (
                  <div
                    className="absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-auto"
                    onPointerDown={(e) => handlePointerDownRotate(e, placement)}
                  >
                    {/* Circle Rotation Knob */}
                    <div
                      id="signature-rotate-handle"
                      className="w-6 h-6 rounded-full bg-white border-2 border-indigo-600 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                      title="Drag to rotate freely (360°)"
                    >
                      <RotateCw className="w-3 h-3 text-indigo-600 pointer-events-none" />
                    </div>
                    {/* Stem Line connecting to signature top edge */}
                    <div className="w-0.5 h-3 bg-indigo-600 pointer-events-none" />
                  </div>
                )}

                {/* 4 Corner Resize Handles */}
                {isSelected && (
                  <>
                    {/* Top-Left */}
                    <div
                      onPointerDown={(e) => handlePointerDownResize(e, placement, 'nw')}
                      className="absolute -left-2 -top-2 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-xs cursor-nwse-resize z-20 hover:scale-125 transition-transform pointer-events-auto"
                      title="Drag corner to resize"
                    />

                    {/* Top-Right */}
                    <div
                      onPointerDown={(e) => handlePointerDownResize(e, placement, 'ne')}
                      className="absolute -right-2 -top-2 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-xs cursor-nesw-resize z-20 hover:scale-125 transition-transform pointer-events-auto"
                      title="Drag corner to resize"
                    />

                    {/* Bottom-Left */}
                    <div
                      onPointerDown={(e) => handlePointerDownResize(e, placement, 'sw')}
                      className="absolute -left-2 -bottom-2 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-xs cursor-nesw-resize z-20 hover:scale-125 transition-transform pointer-events-auto"
                      title="Drag corner to resize"
                    />

                    {/* Bottom-Right */}
                    <div
                      onPointerDown={(e) => handlePointerDownResize(e, placement, 'se')}
                      className="absolute -right-2 -bottom-2 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-md cursor-nwse-resize z-20 hover:scale-125 transition-transform pointer-events-auto"
                      title="Drag corner to resize"
                    />
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
