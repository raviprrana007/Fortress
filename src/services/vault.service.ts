/**
 * Vault Service — manages encrypted vault CRUD operations.
 * The vault blob is stored encrypted in IndexedDB.
 * The decrypted vault lives ONLY in Zustand memory store.
 */

import { v4 as uuidv4 } from 'uuid';
import { encryptVault, decryptVault } from '@/crypto/vault';
import { vaultRepository } from '@/db/repository';
import { scorePassword } from '@/crypto/generator';
import type { VaultEntry, EncryptedVault, EntryCategory, CustomField } from '@/types';

export interface VaultData {
  entries: VaultEntry[];
  version: number;
}

// ─── Vault Initialization ─────────────────────────────────────────────────────

export async function initializeVault(masterPassword: string): Promise<void> {
  const emptyVault: VaultData = { entries: [], version: 1 };
  const { blob, kdf } = await encryptVault(emptyVault, masterPassword);

  const vaultRecord: EncryptedVault = {
    id: 'primary',
    blob,
    algorithm: 'AES-GCM-256',
    kdf,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await vaultRepository.save(vaultRecord);
}

// ─── Unlock / Lock ────────────────────────────────────────────────────────────

export async function unlockVault(masterPassword: string): Promise<VaultData> {
  const record = await vaultRepository.get();
  if (!record) throw new Error('No vault found. Please create an account first.');

  try {
    return await decryptVault<VaultData>(record.blob, masterPassword, record.kdf);
  } catch {
    throw new Error('Incorrect master password');
  }
}

// ─── Entry Operations ─────────────────────────────────────────────────────────

export function createEntry(partial: Partial<VaultEntry>): VaultEntry {
  const now = Date.now();
  const password = partial.password || '';
  return {
    id: uuidv4(),
    name: partial.name || '',
    username: partial.username || '',
    email: partial.email || '',
    password,
    url: partial.url || '',
    notes: partial.notes || '',
    category: (partial.category as EntryCategory) || 'login',
    tags: partial.tags || [],
    isFavorite: partial.isFavorite || false,
    customFields: (partial.customFields as CustomField[]) || [],
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    passwordChangedAt: now,
    strength: scorePassword(password),
    twoFactorSecret: partial.twoFactorSecret,
  };
}

export function updateEntryInList(
  entries: VaultEntry[],
  id: string,
  updates: Partial<VaultEntry>
): VaultEntry[] {
  return entries.map(entry => {
    if (entry.id !== id) return entry;
    const passwordChanged = updates.password && updates.password !== entry.password;
    return {
      ...entry,
      ...updates,
      updatedAt: Date.now(),
      passwordChangedAt: passwordChanged ? Date.now() : entry.passwordChangedAt,
      strength: updates.password ? scorePassword(updates.password) : entry.strength,
    };
  });
}

export function deleteEntryFromList(entries: VaultEntry[], id: string): VaultEntry[] {
  return entries.filter(e => e.id !== id);
}

// ─── Persist Encrypted Vault ──────────────────────────────────────────────────

export async function persistVault(
  entries: VaultEntry[],
  masterPassword: string
): Promise<void> {
  const record = await vaultRepository.get();
  if (!record) throw new Error('No vault record found');

  const vaultData: VaultData = { entries, version: record.version };
  const { blob, kdf } = await encryptVault(vaultData, masterPassword);

  await vaultRepository.save({
    ...record,
    blob,
    kdf,
    updatedAt: Date.now(),
  });
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

export function findDuplicates(entries: VaultEntry[]): Map<string, VaultEntry[]> {
  const byUrl = new Map<string, VaultEntry[]>();

  for (const entry of entries) {
    if (!entry.url) continue;
    try {
      const hostname = new URL(entry.url).hostname;
      if (!byUrl.has(hostname)) byUrl.set(hostname, []);
      byUrl.get(hostname)!.push(entry);
    } catch { /* skip invalid URLs */ }
  }

  // Return only those with duplicates
  const result = new Map<string, VaultEntry[]>();
  for (const [key, list] of byUrl.entries()) {
    if (list.length > 1) result.set(key, list);
  }
  return result;
}

// ─── Vault Health ─────────────────────────────────────────────────────────────

export function getPasswordAge(entry: VaultEntry): number {
  return Math.floor((Date.now() - entry.passwordChangedAt) / (1000 * 60 * 60 * 24));
}

export function isPasswordOld(entry: VaultEntry, thresholdDays = 90): boolean {
  return getPasswordAge(entry) > thresholdDays;
}
