import type { Book } from '@/types';

const DB_NAME = 'bookshelfDB';
const STORE_NAME = 'books';
const DB_VERSION = 1;

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // If db is already initialized, resolve immediately
    if (db) {
      resolve(true);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database error:', request.error);
      reject(false);
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveBook = (book: Book): Promise<Book> => {
  return new Promise((resolve, reject) => {
    if (!db) {
        reject("DB not initialized");
        return;
    }
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(book);

    request.onsuccess = () => {
      resolve(book);
    };

    request.onerror = () => {
      console.error('Error saving book:', request.error);
      reject(request.error);
    };
  });
};


export const getBooks = (): Promise<Book[]> => {
    return new Promise((resolve, reject) => {
        if (!db) {
            // Wait for DB to be initialized if it's not ready
            initDB().then(() => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();

                request.onsuccess = () => {
                    const sortedBooks = request.result.sort((a, b) => b.id.localeCompare(a.id));
                    resolve(sortedBooks);
                };

                request.onerror = () => {
                    console.error('Error getting books:', request.error);
                    reject(request.error);
                };
            }).catch(reject);
            return
        }
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const sortedBooks = request.result.sort((a, b) => b.id.localeCompare(a.id));
            resolve(sortedBooks);
        };

        request.onerror = () => {
            console.error('Error getting books:', request.error);
            reject(request.error);
        };
    });
};

export const deleteBook = (id: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!db) {
        reject("DB not initialized");
        return;
    }
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve(id);
    };

    request.onerror = () => {
      console.error('Error deleting book:', request.error);
      reject(request.error);
    };
  });
};
