export interface SignaturePlacement {
  id: string;
  pageNumber: number; // 1-based
  x: number; // in PDF points (relative to page)
  y: number; // in PDF points (relative to page, from bottom)
  width: number; // in PDF points
  height: number; // in PDF points
  rotation: number; // degrees
}

export interface SignatureSettings {
  // Translucency & background removal settings for JPG
  removeBackground: boolean;
  threshold: number; // 0 to 255, lightness cutoff for paper removal
  feathering: number; // smooth edge transition
  opacity: number; // 0.1 to 1.0 (signature translucency)
  inkColorMode: 'original' | 'deep-black' | 'royal-blue';
}

export interface LoadedPdfInfo {
  name: string;
  size: number;
  numPages: number;
  bytes: Uint8Array;
}

export interface SavedSignatureData {
  id: string;
  name: string;
  dataUrl: string;
  settings: SignatureSettings;
  timestamp: number;
  lastWidth?: number;
  lastRotation?: number;
}
