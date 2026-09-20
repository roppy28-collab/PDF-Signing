import { PDFDocument, degrees } from 'pdf-lib';
import { SignaturePlacement } from '../types';

export interface SignPdfOptions {
  pdfBytes: Uint8Array;
  signaturePngDataUrl: string;
  placements: SignaturePlacement[];
}

/**
 * Embeds translucent signatures onto the PDF pages at specified coordinates.
 */
export async function signPdfDocument(options: SignPdfOptions): Promise<Uint8Array> {
  const { pdfBytes, signaturePngDataUrl, placements } = options;

  // Load the PDF
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Cache embedded PNG images by data URL so duplicate signatures don't bloat the PDF
  const imageCache = new Map<string, any>();

  const getEmbeddedImage = async (dataUrl: string) => {
    if (imageCache.has(dataUrl)) {
      return imageCache.get(dataUrl);
    }
    const signatureBytes = dataUrlToUint8Array(dataUrl);
    const embedded = await pdfDoc.embedPng(signatureBytes);
    imageCache.set(dataUrl, embedded);
    return embedded;
  };

  // Pre-cache fallback image
  if (signaturePngDataUrl) {
    await getEmbeddedImage(signaturePngDataUrl);
  }

  const pages = pdfDoc.getPages();

  for (const placement of placements) {
    const pageIndex = placement.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const targetDataUrl = placement.signaturePngDataUrl || signaturePngDataUrl;
    if (!targetDataUrl) continue;

    const embeddedImage = await getEmbeddedImage(targetDataUrl);
    const page = pages[pageIndex];
    const rotationDeg = placement.rotation || 0;

    if (rotationDeg === 0) {
      // Direct draw without rotation
      page.drawImage(embeddedImage, {
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
      });
    } else {
      // In CSS, rotation is clockwise around center (center center).
      // In PDF, angles are counter-clockwise around (x, y).
      // To rotate around center (cx, cy) = (x + width/2, y + height/2):
      const rad = (-rotationDeg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const hw = placement.width / 2;
      const hh = placement.height / 2;

      // New bottom-left position so center stays anchored
      const newX = placement.x + hw - hw * cos + hh * sin;
      const newY = placement.y + hh - hw * sin - hh * cos;

      page.drawImage(embeddedImage, {
        x: newX,
        y: newY,
        width: placement.width,
        height: placement.height,
        rotate: degrees(-rotationDeg),
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Saves the signed PDF to the user's local folder.
 * Tries the modern File System Access API (showSaveFilePicker) first,
 * falling back seamlessly to browser download.
 */
export async function savePdfToLocalFolder(
  pdfBytes: Uint8Array,
  suggestedName: string
): Promise<{ success: boolean; method: 'picker' | 'download'; filename: string }> {
  const cleanName = suggestedName.endsWith('.pdf') ? suggestedName : `${suggestedName}.pdf`;

  // Try File System Access API (allows picking exact local folder)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: cleanName,
        types: [
          {
            description: 'PDF Document (*.pdf)',
            accept: {
              'application/pdf': ['.pdf'],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(pdfBytes);
      await writable.close();

      return {
        success: true,
        method: 'picker',
        filename: handle.name || cleanName,
      };
    } catch (err: any) {
      // If user aborted or permission was denied in iframe, fallback to standard download
      if (err.name === 'AbortError') {
        throw err; // User canceled the dialog
      }
      console.warn('showSaveFilePicker not supported or rejected, falling back to download:', err);
    }
  }

  // Fallback: Standard browser download to local folder
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  return {
    success: true,
    method: 'download',
    filename: cleanName,
  };
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
