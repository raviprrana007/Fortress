import React, { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AuthPage } from '@/pages/AuthPage'
import { VaultPage } from '@/pages/VaultPage'
import { ToastProvider } from '@/components/ui/Toast'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { EntryFormModal } from '@/components/vault/EntryFormModal'
import { DeleteEntryModal } from '@/components/vault/DeleteEntryModal'
import { GeneratorModal } from '@/components/generator/GeneratorModal'
import { ExportModal } from '@/components/vault/ExportModal'
import { ImportModal } from '@/components/vault/ImportModal'
import { ReauthModal } from '@/components/auth/ReauthModal'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'

export default function App() {
  const { isAuthenticated, loadAccount } = useAuthStore()
  const { modal, theme } = useUIStore()

  // Load account on mount
  useEffect(() => {
    loadAccount()
  }, [loadAccount])

  // Apply saved theme
  useEffect(() => {
    const saved = localStorage.getItem('fortress-theme') as 'dark' | 'light' | 'system' | null
    if (saved) {
      useUIStore.getState().setTheme(saved)
    } else {
      // Default to dark
      useUIStore.getState().setTheme('dark')
    }
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Already handled in sub-components — just prevent defaults here if needed
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      {/* Main App */}
      <AnimatePresence mode="wait">
        {isAuthenticated ? (
          <VaultPage key="vault" />
        ) : (
          <AuthPage key="auth" />
        )}
      </AnimatePresence>

      {/* Global Modals */}
      {modal?.type === 'add-entry' && <EntryFormModal mode="add" />}
      {modal?.type === 'edit-entry' && (
        <EntryFormModal mode="edit" entryId={modal.props?.entryId as string} />
      )}
      {modal?.type === 'delete-entry' && (
        <DeleteEntryModal entryId={modal.props?.entryId as string} />
      )}
      {modal?.type === 'generator' && <GeneratorModal />}
      {modal?.type === 'export' && <ExportModal />}
      {modal?.type === 'import' && <ImportModal />}
      {modal?.type === 'reauth' && <ReauthModal />}

      {/* Command Palette */}
      <CommandPalette />

      {/* Toast System */}
      <ToastProvider />
    </>
  )
}
