import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Trash2, Wand2 } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { StrengthBadge } from '@/components/ui/Badge'
import { useVaultStore } from '@/store/vault.store'
import { useUIStore } from '@/store/ui.store'
import { scorePassword, generatePassword, DEFAULT_GENERATOR_OPTIONS } from '@/crypto/generator'
import { v4 as uuidv4 } from 'uuid'
import type { VaultEntry, EntryCategory, CustomField } from '@/types'
import { cn } from '@/utils'

const CATEGORIES: { value: EntryCategory; label: string; icon: string }[] = [
  { value: 'login', label: 'Login', icon: '🔑' },
  { value: 'card', label: 'Credit Card', icon: '💳' },
  { value: 'identity', label: 'Identity', icon: '🪪' },
  { value: 'note', label: 'Secure Note', icon: '📝' },
  { value: 'ssh-key', label: 'SSH Key', icon: '🔐' },
  { value: 'api-key', label: 'API Key', icon: '⚙️' },
  { value: 'bank', label: 'Banking', icon: '🏦' },
  { value: 'crypto', label: 'Crypto', icon: '₿' },
  { value: 'other', label: 'Other', icon: '📦' },
]

interface EntryFormModalProps {
  mode: 'add' | 'edit'
  entryId?: string
}

export function EntryFormModal({ mode, entryId }: EntryFormModalProps) {
  const { addEntry, updateEntry, getEntry, setSelectedEntry } = useVaultStore()
  const { closeModal, toast } = useUIStore()

  const existingEntry = entryId ? getEntry(entryId) : null

  const [form, setForm] = useState({
    name: existingEntry?.name || '',
    username: existingEntry?.username || '',
    email: existingEntry?.email || '',
    password: existingEntry?.password || '',
    url: existingEntry?.url || '',
    notes: existingEntry?.notes || '',
    category: existingEntry?.category || 'login' as EntryCategory,
    tags: existingEntry?.tags.join(', ') || '',
    isFavorite: existingEntry?.isFavorite || false,
    twoFactorSecret: existingEntry?.twoFactorSecret || '',
  })

  const [customFields, setCustomFields] = useState<CustomField[]>(existingEntry?.customFields || [])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const strength = form.password ? scorePassword(form.password) : null

  const setField = useCallback((key: string, value: string | boolean) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }, [errors])

  const generateNewPassword = useCallback(() => {
    const pwd = generatePassword(DEFAULT_GENERATOR_OPTIONS)
    setField('password', pwd)
  }, [setField])

  const addCustomField = () => {
    setCustomFields(f => [...f, { id: uuidv4(), label: '', value: '', type: 'text' }])
  }

  const removeCustomField = (id: string) => {
    setCustomFields(f => f.filter(field => field.id !== id))
  }

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(f => f.map(field => field.id === id ? { ...field, ...updates } : field))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (form.url && !isValidUrl(form.url)) newErrors.url = 'Invalid URL format'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      const payload: Partial<VaultEntry> = {
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        url: form.url.trim(),
        notes: form.notes.trim(),
        category: form.category,
        tags,
        isFavorite: form.isFavorite,
        customFields,
        twoFactorSecret: form.twoFactorSecret || undefined,
      }

      if (mode === 'add') {
        const newEntry = await addEntry(payload)
        setSelectedEntry(newEntry.id)
        toast({ type: 'success', title: 'Entry added', description: `${form.name} saved to vault` })
      } else if (entryId) {
        await updateEntry(entryId, payload)
        toast({ type: 'success', title: 'Entry updated', description: `${form.name} has been updated` })
      }
      closeModal()
    } catch (err) {
      toast({ type: 'error', title: 'Error', description: (err as Error).message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal open onOpenChange={open => !open && closeModal()}>
      <ModalContent size="lg" showClose={false}>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <div className="flex items-center justify-between">
              <ModalTitle>{mode === 'add' ? 'New Entry' : 'Edit Entry'}</ModalTitle>
              <button type="button" onClick={closeModal} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
          </ModalHeader>

          <ModalBody className="space-y-5 max-h-[65vh] overflow-y-auto">
            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setField('category', cat.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      form.category === cat.value
                        ? 'bg-primary/15 text-primary border-primary/30'
                        : 'bg-muted/30 text-muted-foreground border-border/50 hover:border-border'
                    )}
                  >
                    <span>{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <Input
              label="Name *"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. GitHub, Netflix, Work Email"
              error={errors.name}
              autoFocus
            />

            {/* Credentials */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Username"
                value={form.username}
                onChange={e => setField('username', e.target.value)}
                placeholder="username"
                autoComplete="off"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <PasswordInput
                label="Password"
                value={form.password}
                onChange={v => setField('password', v)}
                onGenerate={generateNewPassword}
              />
              {strength && (
                <div className="flex items-center justify-between px-0.5">
                  <StrengthBadge score={strength.score} label={strength.label} showBars />
                  <span className="text-xs text-muted-foreground">{strength.entropy} bits · {strength.crackTime}</span>
                </div>
              )}
            </div>

            {/* URL */}
            <Input
              label="Website URL"
              type="url"
              value={form.url}
              onChange={e => setField('url', e.target.value)}
              placeholder="https://example.com"
              error={errors.url}
            />

            {/* Tags */}
            <Input
              label="Tags"
              value={form.tags}
              onChange={e => setField('tags', e.target.value)}
              placeholder="work, social, banking (comma separated)"
              hint="Separate tags with commas"
            />

            {/* Favorite toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setField('isFavorite', !form.isFavorite)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors',
                  form.isFavorite ? 'bg-primary border-primary/50' : 'bg-muted border-border/50'
                )}
              >
                <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', form.isFavorite ? 'translate-x-6' : 'translate-x-1')} />
              </button>
              <label className="text-sm text-foreground">Add to favorites</label>
            </div>

            {/* Notes */}
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Secure notes, recovery codes, hints…"
              rows={3}
            />

            {/* Custom Fields */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Custom Fields</label>
                <Button type="button" variant="ghost" size="sm" onClick={addCustomField}>
                  <Plus className="h-3.5 w-3.5" /> Add Field
                </Button>
              </div>
              {customFields.map(field => (
                <div key={field.id} className="flex items-center gap-2">
                  <input
                    value={field.label}
                    onChange={e => updateCustomField(field.id, { label: e.target.value })}
                    placeholder="Field name"
                    className="flex h-8 w-1/3 rounded-lg border border-input bg-muted/30 px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    value={field.value}
                    onChange={e => updateCustomField(field.id, { value: e.target.value })}
                    placeholder="Value"
                    className="flex h-8 flex-1 rounded-lg border border-input bg-muted/30 px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <select
                    value={field.type}
                    onChange={e => updateCustomField(field.id, { type: e.target.value as CustomField['type'] })}
                    className="h-8 px-2 rounded-lg border border-border/50 bg-muted/30 text-xs text-muted-foreground focus:outline-none"
                  >
                    <option value="text">Text</option>
                    <option value="password">Password</option>
                    <option value="url">URL</option>
                    <option value="email">Email</option>
                  </select>
                  <button type="button" onClick={() => removeCustomField(field.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={isLoading}>
              {mode === 'add' ? 'Add Entry' : 'Save Changes'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}

function isValidUrl(url: string): boolean {
  try { new URL(url); return true } catch { return false }
}
