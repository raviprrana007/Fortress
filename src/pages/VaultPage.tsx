import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/layout/Sidebar'
import { EntryList } from '@/components/vault/EntryList'
import { EntryDetail } from '@/components/vault/EntryDetail'
import { SecurityDashboard } from '@/components/security/SecurityDashboard'
import { ActivityLogPanel } from '@/components/security/ActivityLog'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { useUIStore } from '@/store/ui.store'
import { useAutoLock } from '@/hooks/useAutoLock'
import { cn } from '@/utils'

export function VaultPage() {
  const { activePanel, sidebarCollapsed, setSidebarCollapsed } = useUIStore()

  useAutoLock()

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <div className={cn(
        "absolute inset-y-0 left-0 z-50 md:relative md:flex shrink-0 transition-transform duration-300",
        sidebarCollapsed ? "-translate-x-full md:translate-x-0" : "translate-x-0"
      )}>
        <Sidebar />
      </div>
      
      {/* Mobile backdrop for sidebar */}
      {!sidebarCollapsed && (
         <div 
           className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" 
           onClick={() => setSidebarCollapsed(true)} 
         />
      )}

      <div className="flex flex-1 overflow-hidden min-w-0">
        {/* Entry list — always visible when on list/detail panel */}
        <AnimatePresence>
          {(activePanel === 'list' || activePanel === 'detail') && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "w-full md:w-[280px] shrink-0 border-r border-border/50 overflow-hidden",
                activePanel === 'detail' ? 'hidden md:block' : 'block'
              )}
            >
              <EntryList />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content area */}
        <div className={cn(
          "flex-1 overflow-hidden min-w-0",
          activePanel === 'list' ? 'hidden md:block' : 'block'
        )}>
          <AnimatePresence mode="wait">
            {activePanel === 'detail' && (
              <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto">
                <EntryDetail />
              </motion.div>
            )}
            {activePanel === 'list' && (
              <motion.div key="list-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <EntryDetailPlaceholder />
              </motion.div>
            )}
            {activePanel === 'security' && (
              <motion.div key="security" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto">
                <SecurityDashboard />
              </motion.div>
            )}
            {activePanel === 'activity' && (
              <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto">
                <ActivityLogPanel />
              </motion.div>
            )}
            {activePanel === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto">
                <SettingsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function EntryDetailPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center bg-background/30">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-muted/20 border border-border/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🔐</span>
        </div>
        <p className="text-muted-foreground text-sm">Select an entry to view details</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Press Ctrl+K to search or Ctrl+N to add</p>
      </div>
    </div>
  )
}
