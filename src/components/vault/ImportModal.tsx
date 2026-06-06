import React, { useState, useRef } from 'react'
import { Upload, FileUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useVaultStore } from '@/store/vault.store'
import { useUIStore } from '@/store/ui.store'
import { importVault } from '@/services/import-export.service'
import { persistVault } from '@/services/vault.service'
import { activityLogRepository } from '@/db/repository'
import type { ImportFormat } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/utils'

const IMPORT_FORMATS: { value: ImportFormat; label: string; ext: string }[] = [
  { value: 'fortress-json', label: 'Fortress JSON', ext: '.json' },
  { value: 'bitwarden-json', label: 'Bitwarden JSON', ext: '.json' },
  { value: 'lastpass-csv', label: 'LastPass CSV', ext: '.csv' },
  { value: '1password-csv', label: '1Password CSV', ext: '.csv' },
  { value: 'chrome-csv', label: 'Chrome CSV', ext: '.csv' },
  { value: 'csv', label: 'Generic CSV', ext: '.csv' },
]

export function ImportModal() {
  const { entries, masterPassword } = useVaultStore()
  const { closeModal, toast } = useUIStore()
  const [format, setFormat] = useState<ImportFormat>('fortress-json')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [preview, setPreview] = useState<{ imported: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const handleImport = async () => {
    if (!file) return
    setIsImporting(true)
    try {
      const content = await file.text()
      const result = await importVault(content, format, entries)

      if (result.imported === 0 && result.errors.length > 0) {
        toast({ type: 'error', title: 'Import failed', description: result.errors[0] })
        return
      }

      // Save imported entries
      await persistVault(result.entries, masterPassword)

      // Reload vault store (simple approach: update entries directly)
      useVaultStore.setState({
        entries: result.entries,
        filteredEntries: result.entries,
      })

      await activityLogRepository.add({
        id: uuidv4(), action: 'vault_imported', timestamp: Date.now(),
        metadata: { format, count: String(result.imported) }
      })

      toast({
        type: 'success',
        title: `Imported ${result.imported} entries`,
        description: result.skipped > 0 ? `${result.skipped} duplicates skipped` : undefined
      })
      closeModal()
    } catch (err) {
      toast({ type: 'error', title: 'Import error', description: (err as Error).message })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Modal open onOpenChange={open => !open && closeModal()}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Vault
          </ModalTitle>
          <ModalDescription>Import passwords from another manager</ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {/* Format selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Source Format</label>
            <div className="grid grid-cols-2 gap-2">
              {IMPORT_FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all',
                    format === f.value
                      ? 'border-primary/50 bg-primary/5 text-foreground'
                      : 'border-border/50 text-muted-foreground hover:border-border'
                  )}
                >
                  <div className={cn('w-3 h-3 rounded-full border-2 shrink-0', format === f.value ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all',
              isDragging ? 'border-primary/50 bg-primary/5' : 'border-border/50 hover:border-border',
              file && 'border-emerald-500/50 bg-emerald-500/5'
            )}
          >
            <input ref={fileRef} type="file" accept=".json,.csv,.xml" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </>
            ) : (
              <>
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">JSON or CSV files supported</p>
                </div>
              </>
            )}
          </div>

          {/* Security note */}
          <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              Imported entries will be merged with your existing vault. Duplicates will be skipped.
            </p>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleImport} loading={isImporting} disabled={!file}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
