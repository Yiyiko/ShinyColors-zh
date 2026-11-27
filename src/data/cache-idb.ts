export interface CacheEntry<T = unknown> {
  key: string;
  hash: string;
  value: T;
  updatedAt: number;
}

export interface DataCache {
  get<T = unknown>(key: string): Promise<CacheEntry<T> | null>;
  set<T = unknown>(key: string, hash: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = 'sczh-cache-v1';
const STORE_NAME = 'entries';

export class MemoryCache implements DataCache {
  private store = new Map<string, CacheEntry>();

  async get<T = unknown>(key: string): Promise<CacheEntry<T> | null> {
    return (this.store.get(key) as CacheEntry<T> | undefined) ?? null;
  }

  async set<T = unknown>(key: string, hash: string, value: T): Promise<void> {
    this.store.set(key, { key, hash, value, updatedAt: Date.now() });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export class IndexedDbCache implements DataCache {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private fallback = new MemoryCache();

  constructor(private readonly dbName = DB_NAME) {}

  private open(): Promise<IDBDatabase> | null {
    if (typeof indexedDB === 'undefined') return null;
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  async get<T = unknown>(key: string): Promise<CacheEntry<T> | null> {
    const dbP = this.open();
    if (!dbP) return this.fallback.get<T>(key);
    try {
      const db = await dbP;
      return await new Promise<CacheEntry<T> | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve((req.result as CacheEntry<T> | undefined) ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.fallback.get<T>(key);
    }
  }

  async set<T = unknown>(key: string, hash: string, value: T): Promise<void> {
    const entry: CacheEntry<T> = { key, hash, value, updatedAt: Date.now() };
    const dbP = this.open();
    if (!dbP) return this.fallback.set(key, hash, value);
    try {
      const db = await dbP;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      await this.fallback.set(key, hash, value);
    }
  }

  async delete(key: string): Promise<void> {
    const dbP = this.open();
    if (!dbP) return this.fallback.delete(key);
    try {
      const db = await dbP;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      await this.fallback.delete(key);
    }
  }

  async clear(): Promise<void> {
    await this.fallback.clear();
    const dbP = this.open();
    if (!dbP) return;
    try {
      const db = await dbP;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignore IDB clear failure
    }
  }
}
