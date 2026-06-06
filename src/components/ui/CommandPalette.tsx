import React, { useEffect, useCallback } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Lock, Shield, Settings, Download, Upload, Star, Clock } from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { useVaultStore } from '@/store/vault.store'
import { useAuthStore } from '@/store/auth.store'
import { cn, getCategoryIcon } from '@/utils'

export function CommandPalette() {
  const { commandPaletteOpen, openCommandPalette, closeCommandPalette, openModal, setActivePanel } = useUIStore()
  const { entries, setSelectedEntry, setFilter } = useVaultStore()
  const { lockVault } = useAuthStore()

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        commandPaletteOpen ? closeCommandPalette() : openCommandPalette()
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        closeCommandPalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandPaletteOpen, openCommandPalette, closeCommandPalette])

  const handleSelect = useCallback((action: string, entryId?: string) => {
    closeCommandPalette()
    switch (action) {
      case 'new-entry':
        openModal('add-entry')
        break
      case 'generator':
        openModal('generator')
        break
      case 'lock':
        lockVault()
        break
      case 'security':
        setActivePanel('security')
        break
      case 'settings':
        setActivePanel('settings')
        break
      case 'export':
        openModal('export')
        break
      case 'import':
        openModal('import')
        break
      case 'favorites':
        setFilter({ showFavoritesOnly: true })
        break
      case 'recent':
        setFilter({ sortField: 'lastAccessedAt', sortDirection: 'desc' })
        break
      case 'entry':
        if (entryId) {
          setSelectedEntry(entryId)
          setActivePanel('detail')
        }
        break
    }
  }, [closeCommandPalette, openModal, lockVault, setActivePanel, setFilter, setSelectedEntry])

  const recentEntries = [...entries]
    .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
    .slice(0, 5)

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={closeCommandPalette}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed left-1/2 top-[20vh] z-50 w-full max-w-lg -translate-x-1/2"
          >
            <Command
              className="rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden"
              shouldFilter={true}
            >
              <div className="flex items-center gap-2 px-4 border-b border-border/50">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Command.Input
                  placeholder="Search vault, actions…"
                  className="flex h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <kbd className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">ESC</kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  No results found
                </Command.Empty>

                {recentEntries.length > 0 && (
                  <Command.Group heading={<span className="section-header">Recent</span>}>
                    {recentEntries.map(entry => (
                      <Command.Item
                        key={entry.id}
                        value={`${entry.name} ${entry.username} ${entry.url}`}
                        onSelect={() => handleSelect('entry', entry.id)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer',
                          'text-foreground transition-colors',
                          'aria-selected:bg-secondary'
                        )}
                      >
                        <span className="text-base">{getCategoryIcon(entry.category)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{entry.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{entry.username || entry.email}</div>
                        </div>
                        {entry.isFavorite && <Star className="h-3 w-3 text-yellow-400 fill-current shrink-0" />}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading={<span className="section-header">Actions</span>}>
                  {[
                    { id: 'new-entry', icon: Plus, label: 'New Entry', shortcut: '⌘N' },
                    { id: 'generator', icon: RefreshIcon, label: 'Password Generator' },
                    { id: 'security', icon: Shield, label: 'Security Dashboard' },
                    { id: 'favorites', icon: Star, label: 'View Favorites' },
                    { id: 'recent', icon: Clock, label: 'Recently Accessed' },
                    { id: 'import', icon: Upload, label: 'Import Vault' },
                    { id: 'export', icon: Download, label: 'Export Vault' },
                    { id: 'settings', icon: Settings, label: 'Settings' },
                    { id: 'lock', icon: Lock, label: 'Lock Vault', shortcut: '⌘⇧L' },
                  ].map(({ id, icon: Icon, label, shortcut }) => (
                    <Command.Item
                      key={id}
                      value={label}
                      onSelect={() => handleSelect(id)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer',
                        'text-muted-foreground transition-colors',
                        'aria-selected:bg-secondary aria-selected:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {shortcut && (
                        <kbd className="text-xs border border-border rounded px-1 py-0.5 font-mono text-muted-foreground">
                          {shortcut}
                        </kbd>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Simple refresh icon placeholder
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}
