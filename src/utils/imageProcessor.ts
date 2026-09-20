import { SignatureSettings } from '../types';

export interface ProcessedSignature {
  dataUrl: string; // PNG with alpha transparency
  width: number;
  height: number;
  originalAspect: number;
}

/**
 * Process a JPG/PNG signature image to make the paper background translucent/transparent
 * where needed and apply custom opacity and ink enhancement.
 */
export async function processSignatureImage(
  imageSource: string | File,
  settings: SignatureSettings
): Promise<ProcessedSignature> {
  const img = await loadImage(imageSource);

  // Setup offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not get 2D canvas context');
  }

  // Draw image
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // We want to detect background & make paper translucent/transparent
  // settings.threshold is 0..255 (e.g., 220)
  // settings.feathering is 5..50
  // settings.opacity is 0.1..1.0
  const threshold = settings.threshold;
  const feather = Math.max(1, settings.feathering);
  const opacityMultiplier = Math.min(1, Math.max(0.05, settings.opacity));

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let hasInk = false;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue;

    // Perceived luminance (standard Rec. 709)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (settings.removeBackground) {
      if (luminance >= threshold) {
        // Pure background (paper) -> Completely transparent
        data[i + 3] = 0;
      } else if (luminance > threshold - feather) {
        // Feathered edge (anti-aliased pen border)
        const t = (threshold - luminance) / feather; // 0 to 1
        const calculatedAlpha = Math.round(t * 255 * opacityMultiplier);
        data[i + 3] = calculatedAlpha;

        if (calculatedAlpha > 10) {
          const pixelIndex = i / 4;
          const x = pixelIndex % canvas.width;
          const y = Math.floor(pixelIndex / canvas.width);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasInk = true;
        }
      } else {
        // Solid ink stroke -> Apply translucency / opacity setting
        data[i + 3] = Math.round(255 * opacityMultiplier);

        const pixelIndex = i / 4;
        const x = pixelIndex % canvas.width;
        const y = Math.floor(pixelIndex / canvas.width);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasInk = true;
      }

      // Optional ink color enhancement
      if (data[i + 3] > 0) {
        if (settings.inkColorMode === 'deep-black') {
          // Darken ink to rich deep ink
          const factor = (threshold - luminance) / threshold;
          data[i] = Math.max(10, Math.round(r * (1 - factor * 0.7)));
          data[i + 1] = Math.max(10, Math.round(g * (1 - factor * 0.7)));
          data[i + 2] = Math.max(15, Math.round(b * (1 - factor * 0.7)));
        } else if (settings.inkColorMode === 'royal-blue') {
          // Classic ballpoint / fountain pen blue
          data[i] = Math.min(255, Math.max(12, Math.round(r * 0.4)));
          data[i + 1] = Math.min(255, Math.max(35, Math.round(g * 0.5 + 20)));
          data[i + 2] = Math.min(255, Math.max(120, Math.round(b * 0.6 + 90)));
        }
      }
    } else {
      // Background removal turned off, just apply general opacity
      data[i + 3] = Math.round(a * opacityMultiplier);
      hasInk = true;
    }
  }

  // Put processed image data back
  ctx.putImageData(imgData, 0, 0);

  // Auto-crop to trim unnecessary paper borders around the signature
  if (hasInk && maxX > minX && maxY > minY) {
    const pad = 10;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(canvas.width - cropX, maxX - minX + pad * 2);
    const cropH = Math.min(canvas.height - cropY, maxY - minY + pad * 2);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (croppedCtx) {
      croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      return {
        dataUrl: croppedCanvas.toDataURL('image/png'),
        width: cropW,
        height: cropH,
        originalAspect: cropW / cropH,
      };
    }
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    originalAspect: canvas.width / canvas.height,
  };
}

function loadImage(source: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          img.src = e.target.result;
        } else {
          reject(new Error('Failed to read file as data URL'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(source);
    }
  });
}
