/**
 * Vault Store — in-memory only, never persisted.
 * Stores decrypted entries ONLY while vault is unlocked.
 * Master password retained in memory for re-encryption on save.
 */

import { create } from 'zustand';
import Fuse from 'fuse.js';
import type { VaultEntry, VaultFilter, SortField, SortDirection, EntryCategory } from '@/types';
import {
  createEntry,
  updateEntryInList,
  deleteEntryFromList,
  persistVault,
} from '@/services/vault.service';
import { activityLogRepository } from '@/db/repository';
import { v4 as uuidv4 } from 'uuid';

interface VaultState {
  entries: VaultEntry[];
  masterPassword: string; // held in memory for re-encryption
  isLoaded: boolean;
  isSaving: boolean;
  selectedEntryId: string | null;
  filter: VaultFilter;
  filteredEntries: VaultEntry[];
  searchIndex: Fuse<VaultEntry> | null;
}

interface VaultActions {
  loadEntries: (entries: VaultEntry[], masterPassword: string) => void;
  clearVault: () => void;
  addEntry: (partial: Partial<VaultEntry>) => Promise<VaultEntry>;
  updateEntry: (id: string, updates: Partial<VaultEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setSelectedEntry: (id: string | null) => void;
  setFilter: (updates: Partial<VaultFilter>) => void;
  resetFilter: () => void;
  getEntry: (id: string) => VaultEntry | undefined;
  touchEntry: (id: string) => void;
}

const DEFAULT_FILTER: VaultFilter = {
  search: '',
  category: 'all',
  tag: null,
  showFavoritesOnly: false,
  sortField: 'name',
  sortDirection: 'asc',
};

function buildSearchIndex(entries: VaultEntry[]): Fuse<VaultEntry> {
  return new Fuse(entries, {
    keys: [
      { name: 'name', weight: 0.4 },
      { name: 'username', weight: 0.2 },
      { name: 'email', weight: 0.2 },
      { name: 'url', weight: 0.1 },
      { name: 'notes', weight: 0.05 },
      { name: 'tags', weight: 0.05 },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 1,
  });
}

function applyFilter(entries: VaultEntry[], filter: VaultFilter, index: Fuse<VaultEntry> | null): VaultEntry[] {
  let result = [...entries];

  // Text search
  if (filter.search && index) {
    result = index.search(filter.search).map(r => r.item);
  }

  // Category filter
  if (filter.category !== 'all') {
    result = result.filter(e => e.category === filter.category);
  }

  // Tag filter
  if (filter.tag) {
    result = result.filter(e => e.tags.includes(filter.tag!));
  }

  // Favorites filter
  if (filter.showFavoritesOnly) {
    result = result.filter(e => e.isFavorite);
  }

  // Sort (only when not searching, search results are already ranked)
  if (!filter.search) {
    result = sortEntries(result, filter.sortField, filter.sortDirection);
  }

  return result;
}

function sortEntries(entries: VaultEntry[], field: SortField, direction: SortDirection): VaultEntry[] {
  return [...entries].sort((a, b) => {
    let comparison = 0;
    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'updatedAt':
        comparison = a.updatedAt - b.updatedAt;
        break;
      case 'createdAt':
        comparison = a.createdAt - b.createdAt;
        break;
      case 'lastAccessedAt':
        comparison = a.lastAccessedAt - b.lastAccessedAt;
        break;
      case 'strength':
        comparison = a.strength.score - b.strength.score;
        break;
    }
    return direction === 'asc' ? comparison : -comparison;
  });
}

export const useVaultStore = create<VaultState & VaultActions>()((set, get) => ({
  entries: [],
  masterPassword: '',
  isLoaded: false,
  isSaving: false,
  selectedEntryId: null,
  filter: DEFAULT_FILTER,
  filteredEntries: [],
  searchIndex: null,

  loadEntries: (entries, masterPassword) => {
    const index = buildSearchIndex(entries);
    const filter = get().filter;
    set({
      entries,
      masterPassword,
      isLoaded: true,
      searchIndex: index,
      filteredEntries: applyFilter(entries, filter, index),
    });
  },

  clearVault: () => {
    set({
      entries: [],
      masterPassword: '',
      isLoaded: false,
      selectedEntryId: null,
      filteredEntries: [],
      searchIndex: null,
      filter: DEFAULT_FILTER,
    });
  },

  addEntry: async (partial) => {
    const entry = createEntry(partial);
    const newEntries = [...get().entries, entry];
    const index = buildSearchIndex(newEntries);

    set(state => ({
      entries: newEntries,
      searchIndex: index,
      filteredEntries: applyFilter(newEntries, state.filter, index),
    }));

    set({ isSaving: true });
    try {
      await persistVault(newEntries, get().masterPassword);
    } finally {
      set({ isSaving: false });
    }

    await activityLogRepository.add({
      id: uuidv4(),
      action: 'entry_created',
      entryId: entry.id,
      entryName: entry.name,
      timestamp: Date.now(),
    });

    return entry;
  },

  updateEntry: async (id, updates) => {
    const newEntries = updateEntryInList(get().entries, id, updates);
    const index = buildSearchIndex(newEntries);

    set(state => ({
      entries: newEntries,
      searchIndex: index,
      filteredEntries: applyFilter(newEntries, state.filter, index),
    }));

    set({ isSaving: true });
    try {
      await persistVault(newEntries, get().masterPassword);
    } finally {
      set({ isSaving: false });
    }

    const entry = newEntries.find(e => e.id === id);
    await activityLogRepository.add({
      id: uuidv4(),
      action: 'entry_updated',
      entryId: id,
      entryName: entry?.name,
      timestamp: Date.now(),
    });
  },

  deleteEntry: async (id) => {
    const entry = get().entries.find(e => e.id === id);
    const newEntries = deleteEntryFromList(get().entries, id);
    const index = buildSearchIndex(newEntries);

    set(state => ({
      entries: newEntries,
      searchIndex: index,
      filteredEntries: applyFilter(newEntries, state.filter, index),
      selectedEntryId: state.selectedEntryId === id ? null : state.selectedEntryId,
    }));

    set({ isSaving: true });
    try {
      await persistVault(newEntries, get().masterPassword);
    } finally {
      set({ isSaving: false });
    }

    await activityLogRepository.add({
      id: uuidv4(),
      action: 'entry_deleted',
      entryId: id,
      entryName: entry?.name,
      timestamp: Date.now(),
    });
  },

  toggleFavorite: async (id) => {
    const entry = get().entries.find(e => e.id === id);
    if (!entry) return;
    await get().updateEntry(id, { isFavorite: !entry.isFavorite });
  },

  setSelectedEntry: (id) => {
    set({ selectedEntryId: id });
    if (id) {
      get().touchEntry(id);
    }
  },

  setFilter: (updates) => {
    const filter = { ...get().filter, ...updates };
    const { entries, searchIndex } = get();
    set({ filter, filteredEntries: applyFilter(entries, filter, searchIndex) });
  },

  resetFilter: () => {
    const { entries, searchIndex } = get();
    set({ filter: DEFAULT_FILTER, filteredEntries: applyFilter(entries, DEFAULT_FILTER, searchIndex) });
  },

  getEntry: (id) => get().entries.find(e => e.id === id),

  touchEntry: (id) => {
    const newEntries = get().entries.map(e =>
      e.id === id ? { ...e, lastAccessedAt: Date.now() } : e
    );
    set({ entries: newEntries });
  },
}));
