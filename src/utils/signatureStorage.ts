import { SavedSignatureData, SignatureSettings } from '../types';

const DB_NAME = 'pdf_signer_db';
const DB_VERSION = 1;
const STORE_NAME = 'signatures';
const DEFAULT_KEY = 'last_used_signature';
const LOCAL_STORAGE_BACKUP_KEY = 'pdf_signer_last_signature';

/**
 * Open or upgrade the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open database'));
    };
  });
}

/**
 * Save the last used signature as the default
 */
export async function saveDefaultSignature(
  dataUrl: string,
  settings: SignatureSettings,
  name: string = 'My Signature',
  extra?: { lastWidth?: number; lastRotation?: number }
): Promise<SavedSignatureData> {
  const payload: SavedSignatureData = {
    id: DEFAULT_KEY,
    name,
    dataUrl,
    settings,
    timestamp: Date.now(),
    lastWidth: extra?.lastWidth,
    lastRotation: extra?.lastRotation,
  };

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(payload);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (idbErr) {
    console.warn('IndexedDB write failed, falling back to localStorage:', idbErr);
    try {
      // For localStorage fallback, only store if not excessively large
      if (dataUrl.length < 2.5 * 1024 * 1024) {
        localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(payload));
      }
    } catch (lsErr) {
      console.warn('localStorage write failed:', lsErr);
    }
  }

  return payload;
}

/**
 * Load the last used signature
 */
export async function getDefaultSignature(): Promise<SavedSignatureData | null> {
  try {
    const db = await openDatabase();
    const result = await new Promise<SavedSignatureData | null>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(DEFAULT_KEY);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
      transaction.oncomplete = () => db.close();
    });

    if (result && result.dataUrl) {
      return result;
    }
  } catch (idbErr) {
    console.warn('IndexedDB read failed, checking localStorage fallback:', idbErr);
  }

  // Check localStorage backup
  try {
    const item = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    if (item) {
      const parsed = JSON.parse(item) as SavedSignatureData;
      if (parsed && parsed.dataUrl) {
        return parsed;
      }
    }
  } catch (lsErr) {
    console.warn('localStorage read error:', lsErr);
  }

  return null;
}

/**
 * Clear the saved default signature
 */
export async function clearDefaultSignature(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(DEFAULT_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (idbErr) {
    console.warn('IndexedDB delete failed:', idbErr);
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_BACKUP_KEY);
  } catch (lsErr) {
    console.warn('localStorage remove failed:', lsErr);
  }
}
