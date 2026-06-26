import { openDB, type IDBPDatabase } from 'idb';

export const META_DB = 'linkedout-meta';
const META_VERSION = 2;

export const STORE_IMPORTS = 'imports';
export const STORE_SETTINGS = 'settings';

export async function openMetaDb(): Promise<IDBPDatabase> {
  return openDB(META_DB, META_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_IMPORTS)) {
        db.createObjectStore(STORE_IMPORTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS);
      }
    },
  });
}
