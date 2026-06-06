import React, { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useVaultStore } from '@/store/vault.store'
import { useUIStore } from '@/store/ui.store'

interface DeleteEntryModalProps {
  entryId: string
}

export function DeleteEntryModal({ entryId }: DeleteEntryModalProps) {
  const { deleteEntry, getEntry } = useVaultStore()
  const { closeModal, toast } = useUIStore()
  const [isLoading, setIsLoading] = useState(false)

  const entry = getEntry(entryId)
  if (!entry) return null

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await deleteEntry(entryId)
      toast({ type: 'success', title: 'Entry deleted', description: `${entry.name} removed from vault` })
      closeModal()
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: (err as Error).message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal open onOpenChange={open => !open && closeModal()}>
      <ModalContent size="sm">
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <ModalTitle>Delete Entry</ModalTitle>
              <ModalDescription>This action cannot be undone</ModalDescription>
            </div>
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">"{entry.name}"</span>? 
            This entry will be permanently removed from your vault.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={isLoading}
          >
            <Trash2 className="h-4 w-4" />
            Delete Entry
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
