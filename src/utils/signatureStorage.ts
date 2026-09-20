import { SavedSignatureData, SignatureSettings } from '../types';
import { createSampleSignatureJpg, createSampleInitialsJpg } from './sampleSignature';

const DB_NAME = 'pdf_signer_db';
const DB_VERSION = 2;
const STORE_NAME = 'signatures';
const DEFAULT_KEY = 'last_used_signature';
const LOCAL_STORAGE_BACKUP_KEY = 'pdf_signer_last_signature';
const LOCAL_STORAGE_LIBRARY_KEY = 'pdf_signer_signature_library_v2';
const LOCAL_STORAGE_DEFAULT_ID_KEY = 'pdf_signer_default_sig_id';
const LOCAL_STORAGE_CLEARED_FLAG = 'pdf_signer_cleared_empty';
const MAX_LIBRARY_SIZE = 25;

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
 * Helper to sync library to localStorage backup
 */
function syncLibraryToLocalStorage(signatures: SavedSignatureData[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_LIBRARY_KEY, JSON.stringify(signatures));
  } catch (err) {
    console.warn('Could not save all signatures to localStorage backup:', err);
  }
}

/**
 * Seed initial sample signatures if library is completely empty on fresh install
 */
export function createInitialSignatures(): SavedSignatureData[] {
  const defaultSettings: SignatureSettings = {
    removeBackground: true,
    threshold: 220,
    feathering: 20,
    opacity: 0.95,
    inkColorMode: 'original',
  };

  const initialsSettings: SignatureSettings = {
    removeBackground: true,
    threshold: 215,
    feathering: 15,
    opacity: 0.95,
    inkColorMode: 'royal-blue',
  };

  const primarySig: SavedSignatureData = {
    id: 'sig_preset_formal',
    name: 'Formal Script (Sample)',
    dataUrl: createSampleSignatureJpg(),
    settings: defaultSettings,
    timestamp: Date.now() - 1000,
    lastWidth: 170,
    lastRotation: 0,
    isDefault: true,
  };

  const initialsSig: SavedSignatureData = {
    id: 'sig_preset_initials',
    name: 'Initials Stamp (Sample)',
    dataUrl: createSampleInitialsJpg(),
    settings: initialsSettings,
    timestamp: Date.now(),
    lastWidth: 120,
    lastRotation: 0,
    isDefault: false,
  };

  return [primarySig, initialsSig];
}

/**
 * Completely empties and purges the signature library and memory
 */
export async function clearAllSignaturesFromLibrary(): Promise<void> {
  // 1. Wipe IndexedDB object store
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.warn('IndexedDB clear error:', err);
  }

  // 2. Clear all local storage keys related to signatures
  try {
    localStorage.removeItem(LOCAL_STORAGE_LIBRARY_KEY);
    localStorage.removeItem(LOCAL_STORAGE_BACKUP_KEY);
    localStorage.removeItem(LOCAL_STORAGE_DEFAULT_ID_KEY);
    localStorage.removeItem('pdf_signer_signature_library');
    localStorage.removeItem('pdf_signer_last_signature');
    localStorage.setItem(LOCAL_STORAGE_CLEARED_FLAG, 'true');
  } catch (e) {
    console.warn('localStorage clear error:', e);
  }
}

/**
 * Get all saved signatures in the library
 */
export async function getAllSavedSignatures(): Promise<SavedSignatureData[]> {
  let list: SavedSignatureData[] = [];

  try {
    const db = await openDatabase();
    list = await new Promise<SavedSignatureData[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result || []) as SavedSignatureData[];
        const filtered = results.filter(
          (item) => item && item.id && item.id !== DEFAULT_KEY && item.dataUrl
        );
        resolve(filtered);
      };
      req.onerror = () => reject(req.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (idbErr) {
    console.warn('IndexedDB getAll failed, reading localStorage:', idbErr);
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_LIBRARY_KEY);
      if (raw) {
        list = JSON.parse(raw);
      }
    } catch (lsErr) {
      console.warn('localStorage read error:', lsErr);
    }
  }

  // Runaway protection: if corruption caused thousands of signatures, purge immediately
  if (list.length > 50) {
    console.warn(`Detected abnormal library size (${list.length} signatures). Purging memory.`);
    await clearAllSignaturesFromLibrary();
    return [];
  }

  // If empty:
  if (list.length === 0) {
    // Check if user has explicitly cleared the library or requested it empty
    if (localStorage.getItem(LOCAL_STORAGE_CLEARED_FLAG) === 'true') {
      return [];
    }
    // First ever visit: seed clean sample presets
    const presets = createInitialSignatures();
    for (const p of presets) {
      await saveSignatureToLibrary(p);
    }
    return presets;
  }

  // Ensure at least one signature is marked as default
  const hasDefault = list.some((s) => s.isDefault);
  if (!hasDefault && list.length > 0) {
    list[0].isDefault = true;
  }

  // Sort: default first, then timestamp descending
  return list.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return (b.timestamp || 0) - (a.timestamp || 0);
  });
}

/**
 * Save or update a signature in the library
 */
export async function saveSignatureToLibrary(
  sig: Omit<SavedSignatureData, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
): Promise<SavedSignatureData> {
  // Clear the cleared flag when user saves a signature
  try {
    localStorage.removeItem(LOCAL_STORAGE_CLEARED_FLAG);
  } catch (e) {
    // quiet catch
  }

  const id = sig.id || `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = sig.timestamp || Date.now();

  const payload: SavedSignatureData = {
    id,
    name: sig.name.trim() || 'My Signature',
    dataUrl: sig.dataUrl,
    settings: sig.settings,
    timestamp,
    lastWidth: sig.lastWidth,
    lastRotation: sig.lastRotation,
    isDefault: !!sig.isDefault,
  };

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      if (payload.isDefault) {
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const all = (getAllReq.result || []) as SavedSignatureData[];
          for (const item of all) {
            if (item.id !== id && item.isDefault) {
              item.isDefault = false;
              store.put(item);
            }
          }
          store.put(payload);
        };
      } else {
        store.put(payload);
      }

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (idbErr) {
    console.warn('IndexedDB save failed, updating localStorage:', idbErr);
  }

  // Update localStorage backup
  try {
    let currentList: SavedSignatureData[] = [];
    const raw = localStorage.getItem(LOCAL_STORAGE_LIBRARY_KEY);
    if (raw) currentList = JSON.parse(raw);

    if (payload.isDefault) {
      currentList = currentList.map((item) => ({ ...item, isDefault: false }));
    }

    const index = currentList.findIndex((item) => item.id === id);
    if (index >= 0) {
      currentList[index] = payload;
    } else {
      currentList.unshift(payload);
      if (currentList.length > MAX_LIBRARY_SIZE) {
        currentList = currentList.slice(0, MAX_LIBRARY_SIZE);
      }
    }
    syncLibraryToLocalStorage(currentList);
  } catch (e) {
    console.warn('localStorage sync error:', e);
  }

  // Sync to legacy key if default
  if (payload.isDefault) {
    saveDefaultLegacyKey(payload).catch(() => {});
  }

  return payload;
}

/**
 * Delete a signature from the library
 */
export async function deleteSignatureFromLibrary(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (idbErr) {
    console.warn('IndexedDB delete failed:', idbErr);
  }

  // Update localStorage backup
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LIBRARY_KEY);
    if (raw) {
      const currentList: SavedSignatureData[] = JSON.parse(raw);
      const filtered = currentList.filter((item) => item.id !== id);
      syncLibraryToLocalStorage(filtered);
    }
  } catch (e) {
    console.warn('localStorage delete sync error:', e);
  }
}

/**
 * Set a signature as default
 */
export async function setDefaultSignatureId(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = (req.result || []) as SavedSignatureData[];
        let targetSig: SavedSignatureData | null = null;

        for (const item of all) {
          if (item.id === id) {
            item.isDefault = true;
            targetSig = item;
            store.put(item);
          } else if (item.isDefault) {
            item.isDefault = false;
            store.put(item);
          }
        }

        if (targetSig) {
          saveDefaultLegacyKey(targetSig).catch(() => {});
        }
      };

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (idbErr) {
    console.warn('IndexedDB setDefault failed:', idbErr);
  }

  // Update localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LIBRARY_KEY);
    if (raw) {
      const currentList: SavedSignatureData[] = JSON.parse(raw);
      const updated = currentList.map((item) => ({
        ...item,
        isDefault: item.id === id,
      }));
      syncLibraryToLocalStorage(updated);
      localStorage.setItem(LOCAL_STORAGE_DEFAULT_ID_KEY, id);
    }
  } catch (e) {
    console.warn('localStorage setDefault sync error:', e);
  }
}

/**
 * Rename a saved signature
 */
export async function renameSavedSignature(id: string, newName: string): Promise<void> {
  const cleanName = newName.trim();
  if (!cleanName) return;

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const item = req.result as SavedSignatureData | undefined;
        if (item) {
          item.name = cleanName;
          store.put(item);
        }
      };

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.warn('IndexedDB rename error:', err);
  }

  // Update localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LIBRARY_KEY);
    if (raw) {
      const currentList: SavedSignatureData[] = JSON.parse(raw);
      const updated = currentList.map((item) =>
        item.id === id ? { ...item, name: cleanName } : item
      );
      syncLibraryToLocalStorage(updated);
    }
  } catch (e) {
    console.warn('localStorage rename sync error:', e);
  }
}

/**
 * Internal helper to save to the legacy DEFAULT_KEY
 */
async function saveDefaultLegacyKey(payload: SavedSignatureData): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({
        ...payload,
        id: DEFAULT_KEY,
      });
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (e) {
    // quiet catch
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(payload));
  } catch (e) {
    // quiet catch
  }
}

/**
 * Legacy support: Save default signature without creating duplicates
 */
export async function saveDefaultSignature(
  dataUrl: string,
  settings: SignatureSettings,
  name: string = 'My Signature',
  extra?: { lastWidth?: number; lastRotation?: number }
): Promise<SavedSignatureData> {
  const existingId = localStorage.getItem(LOCAL_STORAGE_DEFAULT_ID_KEY) || undefined;
  return saveSignatureToLibrary({
    id: existingId,
    name,
    dataUrl,
    settings,
    lastWidth: extra?.lastWidth,
    lastRotation: extra?.lastRotation,
    isDefault: true,
  });
}

/**
 * Load default signature
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
    // quiet catch
  }

  try {
    const item = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    if (item) {
      const parsed = JSON.parse(item) as SavedSignatureData;
      if (parsed && parsed.dataUrl) {
        return parsed;
      }
    }
  } catch (lsErr) {
    // quiet catch
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
      store.delete(DEFAULT_KEY);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (e) {
    // quiet catch
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_BACKUP_KEY);
    localStorage.removeItem(LOCAL_STORAGE_DEFAULT_ID_KEY);
  } catch (e) {
    // quiet catch
  }
}
