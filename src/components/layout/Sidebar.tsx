import React, { useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Key, CreditCard, User, FileText, Star, Clock, Tag,
  Plus, Search, Lock, Settings, ChevronLeft, ChevronRight,
  BarChart3, Activity, Download, Upload, Menu
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import { useVaultStore } from '@/store/vault.store'
import { cn, getInitials } from '@/utils'
import type { EntryCategory } from '@/types'

const CATEGORY_ITEMS: { category: EntryCategory | 'all'; icon: React.ReactNode; label: string }[] = [
  { category: 'all', icon: <Key className="h-4 w-4" />, label: 'All Items' },
  { category: 'login', icon: <Key className="h-4 w-4" />, label: 'Logins' },
  { category: 'card', icon: <CreditCard className="h-4 w-4" />, label: 'Cards' },
  { category: 'identity', icon: <User className="h-4 w-4" />, label: 'Identities' },
  { category: 'note', icon: <FileText className="h-4 w-4" />, label: 'Secure Notes' },
]

export function Sidebar() {
  const { account, lockVault } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar, openModal, setActivePanel, activePanel } = useUIStore()
  const { setFilter, filter, entries } = useVaultStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        openModal('add-entry')
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'l') {
        e.preventDefault()
        lockVault()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openModal, lockVault])

  const favoritesCount = entries.filter(e => e.isFavorite).length

  return (
    <motion.div
      initial={false}
      animate={{ width: sidebarCollapsed ? 60 : 240 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="h-full border-r border-border/50 bg-card/50 flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className={cn(
        'flex items-center h-14 border-b border-border/50 px-3 shrink-0',
        sidebarCollapsed ? 'justify-center' : 'justify-between'
      )}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground text-sm">Fortress</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* New Entry Button */}
      <div className={cn('p-3', sidebarCollapsed ? 'flex justify-center' : '')}>
        <button
          onClick={() => openModal('add-entry')}
          className={cn(
            'flex items-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium',
            'hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm hover:shadow-glow-sm',
            sidebarCollapsed ? 'w-9 justify-center' : 'w-full px-3'
          )}
          title="New entry (Ctrl+N)"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && 'New Entry'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5 py-1">
        {!sidebarCollapsed && (
          <p className="section-header">Vault</p>
        )}

        {CATEGORY_ITEMS.map(({ category, icon, label }) => (
          <SidebarItem
            key={category}
            icon={icon}
            label={label}
            collapsed={sidebarCollapsed}
            active={activePanel === 'list' && filter.category === category}
            onClick={() => {
              setFilter({ category, showFavoritesOnly: false })
              setActivePanel('list')
            }}
            count={category === 'all' ? entries.length : entries.filter(e => e.category === category).length}
          />
        ))}

        <SidebarItem
          icon={<Star className="h-4 w-4" />}
          label="Favorites"
          collapsed={sidebarCollapsed}
          active={filter.showFavoritesOnly}
          onClick={() => {
            setFilter({ showFavoritesOnly: true, category: 'all' })
            setActivePanel('list')
          }}
          count={favoritesCount}
        />

        {!sidebarCollapsed && (
          <p className="section-header mt-4">Security</p>
        )}

        <SidebarItem
          icon={<BarChart3 className="h-4 w-4" />}
          label="Security Score"
          collapsed={sidebarCollapsed}
          active={activePanel === 'security'}
          onClick={() => setActivePanel('security')}
        />

        <SidebarItem
          icon={<Activity className="h-4 w-4" />}
          label="Activity Log"
          collapsed={sidebarCollapsed}
          active={activePanel === 'activity'}
          onClick={() => setActivePanel('activity')}
        />

        {!sidebarCollapsed && (
          <p className="section-header mt-4">Tools</p>
        )}

        <SidebarItem
          icon={<Download className="h-4 w-4" />}
          label="Export Vault"
          collapsed={sidebarCollapsed}
          onClick={() => openModal('export')}
        />

        <SidebarItem
          icon={<Upload className="h-4 w-4" />}
          label="Import Data"
          collapsed={sidebarCollapsed}
          onClick={() => openModal('import')}
        />
      </nav>

      {/* Footer — Account */}
      <div className="border-t border-border/50 p-3">
        <button
          onClick={() => setActivePanel('settings')}
          className={cn(
            'flex items-center gap-2.5 rounded-lg p-2 w-full text-left',
            'hover:bg-secondary transition-all group',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: account?.avatarColor || 'hsl(220, 75%, 52%)' }}
          >
            {account ? getInitials(account.displayName) : '?'}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{account?.displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{account?.email}</div>
            </div>
          )}
        </button>

        <button
          onClick={lockVault}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 mt-1 rounded-lg w-full text-sm',
            'text-muted-foreground hover:text-foreground hover:bg-secondary transition-all',
            sidebarCollapsed && 'justify-center'
          )}
          title="Lock vault (Ctrl+Shift+L)"
        >
          <Lock className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && 'Lock Vault'}
        </button>
      </div>
    </motion.div>
  )
}

interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  collapsed: boolean
  active?: boolean
  onClick: () => void
  count?: number
}

function SidebarItem({ icon, label, collapsed, active, onClick, count }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'nav-item w-full',
        active && 'active',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          {count !== undefined && count > 0 && (
            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">
              {count}
            </span>
          )}
        </>
      )}
    </button>
  )
}
