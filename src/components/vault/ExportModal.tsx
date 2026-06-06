import React, { useState } from 'react'
import { Download, AlertTriangle } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useVaultStore } from '@/store/vault.store'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { exportVault, downloadFile } from '@/services/import-export.service'
import { activityLogRepository } from '@/db/repository'
import type { ExportFormat } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/utils'

const EXPORT_FORMATS: { value: ExportFormat; label: string; description: string; recommended?: boolean }[] = [
  { value: 'fortress-json', label: 'Fortress JSON', description: 'Full encrypted-ready export with all metadata. Best for backups.', recommended: true },
  { value: 'csv', label: 'CSV (Universal)', description: 'Compatible with most password managers and spreadsheets.' },
  { value: 'bitwarden-json', label: 'Bitwarden JSON', description: 'Import directly into Bitwarden or compatible managers.' },
]

export function ExportModal() {
  const { entries } = useVaultStore()
  const { closeModal, toast, requestReauth } = useUIStore()
  const { account } = useAuthStore()
  const [format, setFormat] = useState<ExportFormat>('fortress-json')
  const [isExporting, setIsExporting] = useState(false)

  const doExport = async () => {
    setIsExporting(true)
    try {
      const content = exportVault(entries, format)
      const ext = format === 'csv' ? 'csv' : 'json'
      const mimeType = format === 'csv' ? 'text/csv' : 'application/json'
      const filename = `fortress-export-${new Date().toISOString().split('T')[0]}.${ext}`
      downloadFile(content, filename, mimeType)
      await activityLogRepository.add({ id: uuidv4(), action: 'vault_exported', timestamp: Date.now(), metadata: { format } })
      toast({ type: 'success', title: 'Export complete', description: `${entries.length} entries exported` })
      closeModal()
    } catch (err) {
      toast({ type: 'error', title: 'Export failed', description: (err as Error).message })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExport = () => {
    if (account?.settings.requireReauthForExport) {
      requestReauth(doExport)
    } else {
      doExport()
    }
  }

  return (
    <Modal open onOpenChange={open => !open && closeModal()}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Vault
          </ModalTitle>
          <ModalDescription>
            Export {entries.length} entries from your vault
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">
              Exported files contain plaintext passwords. Store them securely and delete after use.
            </p>
          </div>

          <div className="space-y-2">
            {EXPORT_FORMATS.map(f => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                  format === f.value
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border/50 hover:border-border'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-all',
                  format === f.value ? 'border-primary bg-primary' : 'border-border'
                )} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{f.label}</span>
                    {f.recommended && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Recommended</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                </div>
              </button>
            ))}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleExport} loading={isExporting}>
            <Download className="h-4 w-4" />
            Export {entries.length} entries
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
