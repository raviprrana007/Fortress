/**
 * IndexedDB database layer using the `idb` library.
 * Schema version 1.
 *
 * Stores:
 *  - encrypted_vault: The single encrypted vault blob
 *  - account: User profile (no sensitive data)
 *  - activity_log: Audit trail
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { EncryptedVault, AuthAccount, ActivityLog } from '@/types';

const DB_NAME = 'fortress-db';
const DB_VERSION = 1;

export interface FortressDB {
  encrypted_vault: {
    key: string;
    value: EncryptedVault;
  };
  account: {
    key: string;
    value: AuthAccount;
  };
  activity_log: {
    key: string;
    value: ActivityLog;
    indexes: { by_timestamp: number };
  };
}

let db: IDBPDatabase<FortressDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<FortressDB>> {
  if (db) return db;

  db = await openDB<FortressDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Encrypted vault store
      if (!database.objectStoreNames.contains('encrypted_vault')) {
        database.createObjectStore('encrypted_vault', { keyPath: 'id' });
      }

      // Account store
      if (!database.objectStoreNames.contains('account')) {
        database.createObjectStore('account', { keyPath: 'id' });
      }

      // Activity log store
      if (!database.objectStoreNames.contains('activity_log')) {
        const logStore = database.createObjectStore('activity_log', { keyPath: 'id' });
        logStore.createIndex('by_timestamp', 'timestamp');
      }
    },
  });

  return db;
}

// ─── Vault Repository ─────────────────────────────────────────────────────────

export const vaultRepository = {
  async save(vault: EncryptedVault): Promise<void> {
    const database = await getDB();
    await database.put('encrypted_vault', vault);
  },

  async get(): Promise<EncryptedVault | undefined> {
    const database = await getDB();
    return database.get('encrypted_vault', 'primary');
  },

  async delete(): Promise<void> {
    const database = await getDB();
    await database.delete('encrypted_vault', 'primary');
  },

  async exists(): Promise<boolean> {
    const database = await getDB();
    const count = await database.count('encrypted_vault');
    return count > 0;
  },
};

// ─── Account Repository ───────────────────────────────────────────────────────

export const accountRepository = {
  async save(account: AuthAccount): Promise<void> {
    const database = await getDB();
    await database.put('account', account);
  },

  async get(): Promise<AuthAccount | undefined> {
    const database = await getDB();
    const all = await database.getAll('account');
    return all[0];
  },

  async delete(): Promise<void> {
    const database = await getDB();
    const account = await this.get();
    if (account) await database.delete('account', account.id);
  },

  async exists(): Promise<boolean> {
    const database = await getDB();
    const count = await database.count('account');
    return count > 0;
  },
};

// ─── Activity Log Repository ──────────────────────────────────────────────────

export const activityLogRepository = {
  async add(log: ActivityLog): Promise<void> {
    const database = await getDB();
    await database.put('activity_log', log);
    // Prune old logs (keep last 500)
    const all = await database.getAllFromIndex('activity_log', 'by_timestamp');
    if (all.length > 500) {
      const toDelete = all.slice(0, all.length - 500);
      for (const entry of toDelete) {
        await database.delete('activity_log', entry.id);
      }
    }
  },

  async getAll(): Promise<ActivityLog[]> {
    const database = await getDB();
    const all = await database.getAllFromIndex('activity_log', 'by_timestamp');
    return all.reverse(); // newest first
  },

  async getRecent(days = 30): Promise<ActivityLog[]> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const all = await this.getAll();
    return all.filter(log => log.timestamp >= cutoff);
  },

  async clear(): Promise<void> {
    const database = await getDB();
    await database.clear('activity_log');
  },
};
