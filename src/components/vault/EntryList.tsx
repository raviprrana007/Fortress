import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, SortAsc, SortDesc, Filter, Star, Grid3X3, List as ListIcon,
  Plus, Loader2
} from 'lucide-react'
import { useVaultStore } from '@/store/vault.store'
import { useUIStore } from '@/store/ui.store'
import { cn, getCategoryIcon, getDomainFromUrl, getStrengthColor, formatRelativeTime, getFaviconUrl } from '@/utils'
import { StrengthBadge } from '@/components/ui/Badge'
import type { VaultEntry, SortField } from '@/types'

export function EntryList() {
  const {
    filteredEntries, selectedEntryId, setSelectedEntry,
    filter, setFilter, isSaving,
  } = useVaultStore()
  const { openModal, setActivePanel } = useUIStore()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({ search: e.target.value })
  }, [setFilter])

  const handleSort = useCallback(() => {
    setFilter({ sortDirection: filter.sortDirection === 'asc' ? 'desc' : 'asc' })
  }, [filter.sortDirection, setFilter])

  const handleEntryClick = (entry: VaultEntry) => {
    setSelectedEntry(entry.id)
    setActivePanel('detail')
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Search & Controls */}
      <div className="p-4 border-b border-border/50 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            id="vault-search"
            type="search"
            placeholder="Search vault… (Ctrl+K)"
            value={filter.search}
            onChange={handleSearch}
            className={cn(
              'flex h-9 w-full rounded-lg border border-input bg-muted/30 pl-9 pr-3 py-2 text-sm',
              'text-foreground placeholder:text-muted-foreground/60 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
            )}
          />
          {isSaving && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <SortSelect value={filter.sortField} onChange={v => setFilter({ sortField: v as SortField })} />
            <button
              onClick={handleSort}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              {filter.sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setFilter({ showFavoritesOnly: !filter.showFavoritesOnly })}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-all',
                filter.showFavoritesOnly
                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Star className="h-3.5 w-3.5" />
              Favorites
            </button>
          </div>

          <div className="flex items-center border border-border/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 transition-all', viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              <ListIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 transition-all', viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Count */}
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'item' : 'items'}
        </span>
        <button
          onClick={() => openModal('add-entry')}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <AnimatePresence>
          {filteredEntries.length === 0 ? (
            <EmptyState hasSearch={!!filter.search} onAddEntry={() => openModal('add-entry')} />
          ) : viewMode === 'list' ? (
            <div className="space-y-1">
              {filteredEntries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                >
                  <EntryListItem
                    entry={entry}
                    isSelected={entry.id === selectedEntryId}
                    onClick={() => handleEntryClick(entry)}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {filteredEntries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                >
                  <EntryGridItem
                    entry={entry}
                    isSelected={entry.id === selectedEntryId}
                    onClick={() => handleEntryClick(entry)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Entry List Item ──────────────────────────────────────────────────────────

function EntryListItem({ entry, isSelected, onClick }: { entry: VaultEntry; isSelected: boolean; onClick: () => void }) {
  const domain = entry.url ? getDomainFromUrl(entry.url) : ''
  const faviconUrl = entry.url ? getFaviconUrl(entry.url) : ''

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
        'hover:bg-secondary/60 group',
        isSelected && 'bg-secondary border border-border/50'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base',
        'bg-muted border border-border/50'
      )}>
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            className="w-5 h-5 rounded"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span>{getCategoryIcon(entry.category)}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground truncate">{entry.name}</span>
          {entry.isFavorite && <Star className="h-3 w-3 text-yellow-400 fill-current shrink-0" />}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {entry.username || entry.email || domain || '—'}
        </div>
      </div>

      {/* Strength dot */}
      <div className={cn('w-2 h-2 rounded-full shrink-0', getStrengthColor(entry.strength.score))} />
    </button>
  )
}

// ─── Entry Grid Item ──────────────────────────────────────────────────────────

function EntryGridItem({ entry, isSelected, onClick }: { entry: VaultEntry; isSelected: boolean; onClick: () => void }) {
  const faviconUrl = entry.url ? getFaviconUrl(entry.url) : ''

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all',
        'bg-card/50 border border-border/50 hover:border-primary/30 hover:shadow-glow-sm',
        isSelected && 'border-primary/50 shadow-glow-sm'
      )}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted border border-border/50 text-xl">
        {faviconUrl ? (
          <img src={faviconUrl} alt="" className="w-6 h-6 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <span>{getCategoryIcon(entry.category)}</span>
        )}
      </div>
      <div className="w-full">
        <div className="text-sm font-medium text-foreground truncate">{entry.name}</div>
        <div className="text-xs text-muted-foreground truncate">{entry.username || entry.email || '—'}</div>
      </div>
      <div className={cn('h-1 w-full rounded-full', getStrengthColor(entry.strength.score))} />
    </button>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasSearch, onAddEntry }: { hasSearch: boolean; onAddEntry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center px-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center mb-4">
        {hasSearch ? <Search className="h-8 w-8 text-muted-foreground" /> : <Star className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        {hasSearch ? 'No results found' : 'No entries yet'}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {hasSearch ? 'Try a different search term' : 'Add your first password to get started'}
      </p>
      {!hasSearch && (
        <button
          onClick={onAddEntry}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add First Entry
        </button>
      )}
    </motion.div>
  )
}

// ─── Sort Select ──────────────────────────────────────────────────────────────

function SortSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-7 px-2 rounded-md text-xs border border-border/50 bg-muted/30 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
    >
      <option value="name">Name</option>
      <option value="updatedAt">Updated</option>
      <option value="createdAt">Created</option>
      <option value="strength">Strength</option>
      <option value="lastAccessedAt">Last Used</option>
    </select>
  )
}
