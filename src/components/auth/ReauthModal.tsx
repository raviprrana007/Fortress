import React, { useState } from 'react'
import { Eye, EyeOff, Lock, Shield } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalTitle, ModalDescription } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/utils'

export function ReauthModal() {
  const { cancelReauth, resolveReauth } = useUIStore()
  const { unlockWithPassword, isLoading } = useAuthStore()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const valid = await unlockWithPassword(password)
      if (valid) {
        resolveReauth()
      } else {
        setError('Incorrect master password')
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Modal open onOpenChange={open => !open && cancelReauth()}>
      <ModalContent size="sm" showClose={false}>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <ModalTitle>Confirm Identity</ModalTitle>
              <ModalDescription>Enter your master password to continue</ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  autoFocus
                  autoComplete="current-password"
                  placeholder="Master password…"
                  className={cn(
                    'flex h-10 w-full rounded-lg border border-input bg-muted/30 pl-10 pr-10 py-2 text-sm text-foreground',
                    'placeholder:text-muted-foreground/60 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                    error && 'border-destructive/60'
                  )}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-destructive">⚠ {error}</p>}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={cancelReauth} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={isLoading} disabled={!password}>
                Confirm
              </Button>
            </div>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
