// Offline Cache Utility using IndexedDB
// Provides local caching and offline mutation queue for Firestore data

const DB_NAME = 'myhospital-offline-cache';
const DB_VERSION = 1;
const CACHE_STORE = 'cached-data';
const MUTATION_STORE = 'mutation-queue';

interface Mutation {
  id?: number;
  collection: string;
  docId: string;
  type: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: number;
}

let db: IDBDatabase | null = null;

// Initialize IndexedDB
function initDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(CACHE_STORE)) {
        database.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains(MUTATION_STORE)) {
        database.createObjectStore(MUTATION_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

// Generate cache key
function getCacheKey(collection: string, id?: string): string {
  return id ? `${collection}/${id}` : collection;
}

// Get cached data (single document)
export async function getCached(collection: string, id: string): Promise<any | null> {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(CACHE_STORE, 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const key = getCacheKey(collection, id);
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Get all cached data in a collection
export async function getAllCached(collection: string): Promise<any[]> {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(CACHE_STORE, 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const all = request.result || [];
        const filtered = all.filter(item => item.key.startsWith(collection + '/'));
        resolve(filtered.map(item => item.data));
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Set cached data (single document)
export async function setCached(collection: string, id: string, data: any): Promise<void> {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(CACHE_STORE, 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const key = getCacheKey(collection, id);
      const request = store.put({ key, data });
      
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    return;
  }
}

// Set many cached items (collection)
export async function setManyCached(collection: string, items: any[]): Promise<void> {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(CACHE_STORE, 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      
      items.forEach(item => {
        const id = item.id || item.petId || item.appointmentId || item.clientUid;
        if (id) {
          const key = getCacheKey(collection, id);
          store.put({ key, data: item });
        }
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch {
    return;
  }
}

// Delete cached data
export async function deleteCached(collection: string, id: string): Promise<void> {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(CACHE_STORE, 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const key = getCacheKey(collection, id);
      store.delete(key);
      resolve();
    });
  } catch {
    return;
  }
}

// Clear all cache for a collection
export async function clearCache(collection?: string): Promise<void> {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(CACHE_STORE, 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      
      if (collection) {
        const request = store.getAll();
        request.onsuccess = () => {
          const all = request.result || [];
          all.forEach(item => {
            if (item.key.startsWith(collection + '/')) {
              store.delete(item.key);
            }
          });
          resolve();
        };
      } else {
        store.clear();
        resolve();
      }
    });
  } catch {
    return;
  }
}

// Queue a mutation for later sync
export async function queueMutation(
  collection: string,
  docId: string,
  type: 'create' | 'update' | 'delete',
  data?: any
): Promise<void> {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(MUTATION_STORE, 'readwrite');
      const store = transaction.objectStore(MUTATION_STORE);
      const mutation: Mutation = {
        collection,
        docId,
        type,
        data,
        timestamp: Date.now()
      };
      store.add(mutation);
      resolve();
    });
  } catch {
    return;
  }
}

// Get all queued mutations
export async function getQueuedMutations(): Promise<Mutation[]> {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(MUTATION_STORE, 'readonly');
      const store = transaction.objectStore(MUTATION_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Clear a mutation by id
export async function clearMutation(id: number): Promise<void> {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(MUTATION_STORE, 'readwrite');
      const store = transaction.objectStore(MUTATION_STORE);
      store.delete(id);
      resolve();
    });
  } catch {
    return;
  }
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Sync queued mutations when back online
export async function syncMutations(
  syncFn: (mutation: Mutation) => Promise<void>
): Promise<{ success: number; failed: number }> {
  const mutations = await getQueuedMutations();
  let success = 0;
  let failed = 0;

  for (const mutation of mutations) {
    try {
      await syncFn(mutation);
      if (mutation.id) await clearMutation(mutation.id);
      success++;
    } catch (error) {
      console.error('Failed to sync mutation:', error);
      failed++;
    }
  }

  return { success, failed };
}

// Setup online/offline listeners
export function setupConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const handleOnline = () => {
    console.log('App is online - ready to sync');
    onOnline();
  };
  
  const handleOffline = () => {
    console.log('App is offline - using cached data');
    onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
