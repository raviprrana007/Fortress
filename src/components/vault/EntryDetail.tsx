import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Edit2, Trash2, Star, Copy, ExternalLink, Globe, User, Mail, FileText,
  Tag, Clock, Shield, Check, Eye, EyeOff, ChevronDown, ChevronUp,
  Key, CreditCard, Hash, ChevronLeft
} from 'lucide-react'
import { useVaultStore } from '@/store/vault.store'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { cn, getCategoryIcon, formatDate, formatRelativeTime, getDomainFromUrl, getStrengthTextColor, copyToClipboard } from '@/utils'
import { StrengthBadge, CategoryBadge, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { activityLogRepository } from '@/db/repository'
import { v4 as uuidv4 } from 'uuid'

export function EntryDetail() {
  const { selectedEntryId, getEntry, toggleFavorite, deleteEntry } = useVaultStore()
  const { openModal, requestReauth, toast, setActivePanel, setActivePanel: setPanel } = useUIStore()
  const { account } = useAuthStore()

  const entry = selectedEntryId ? getEntry(selectedEntryId) : null

  if (!entry) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/30">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center mx-auto mb-4">
            <Key className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground">Select an entry to view details</p>
        </div>
      </div>
    )
  }

  const handleEdit = () => openModal('edit-entry', { entryId: entry.id })
  const handleDelete = () => openModal('delete-entry', { entryId: entry.id })
  const handleFavorite = () => toggleFavorite(entry.id)

  return (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full bg-background/30"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-start gap-3">
        <button 
          onClick={() => setActivePanel('list')} 
          className="md:hidden p-2 -ml-3 mr-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="w-12 h-12 rounded-xl bg-muted border border-border/50 flex items-center justify-center text-2xl shrink-0">
          {getCategoryIcon(entry.category)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">{entry.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <CategoryBadge category={entry.category} />
            <StrengthBadge score={entry.strength.score} label={entry.strength.label} showBars />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleFavorite}
            className={cn('p-2 rounded-lg transition-all', entry.isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')}
            title={entry.isFavorite ? 'Remove favorite' : 'Add to favorites'}
          >
            <Star className={cn('h-4 w-4', entry.isFavorite && 'fill-current')} />
          </button>
          <button onClick={handleEdit} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <Edit2 className="h-4 w-4" />
          </button>
          <button onClick={handleDelete} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Credentials Section */}
        {(entry.username || entry.email) && (
          <Section label="Credentials">
            {entry.username && (
              <CopyField
                icon={<User className="h-3.5 w-3.5" />}
                label="Username"
                value={entry.username}
                entryId={entry.id}
                action="username"
              />
            )}
            {entry.email && entry.email !== entry.username && (
              <CopyField
                icon={<Mail className="h-3.5 w-3.5" />}
                label="Email"
                value={entry.email}
                entryId={entry.id}
                action="email"
              />
            )}
          </Section>
        )}

        {/* Password Section */}
        {entry.password && (
          <Section label="Password">
            <PasswordField entry={entry} requireReauth={account?.settings.requireReauthForReveal ?? true} />
          </Section>
        )}

        {/* URL Section */}
        {entry.url && (
          <Section label="Website">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-primary hover:underline truncate"
              >
                {getDomainFromUrl(entry.url)}
              </a>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
          </Section>
        )}

        {/* Notes */}
        {entry.notes && (
          <Section label="Notes">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
              <p className="text-sm text-foreground whitespace-pre-wrap">{entry.notes}</p>
            </div>
          </Section>
        )}

        {/* Tags */}
        {entry.tags.length > 0 && (
          <Section label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map(tag => (
                <span key={tag} className="tag-pill">
                  <Tag className="h-3 w-3" /> {tag}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Custom Fields */}
        {entry.customFields.length > 0 && (
          <Section label="Custom Fields">
            {entry.customFields.map(field => (
              <CopyField
                key={field.id}
                icon={<Hash className="h-3.5 w-3.5" />}
                label={field.label}
                value={field.value}
                entryId={entry.id}
                action="custom"
                isPassword={field.type === 'password'}
              />
            ))}
          </Section>
        )}

        {/* Security Analysis */}
        <Section label="Security Analysis">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Entropy</span>
              <span className="text-foreground font-mono">{entry.strength.entropy} bits</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Crack Time</span>
              <span className={cn('font-medium', getStrengthTextColor(entry.strength.score))}>
                {entry.strength.crackTime}
              </span>
            </div>
            {entry.strength.suggestions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
                {entry.strength.suggestions.map((s, i) => (
                  <p key={i} className="text-xs text-yellow-400 flex items-center gap-1">
                    <span>•</span> {s}
                  </p>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Metadata */}
        <Section label="Details">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="text-foreground">{formatDate(entry.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Modified</p>
              <p className="text-foreground">{formatRelativeTime(entry.updatedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Password Changed</p>
              <p className="text-foreground">{formatRelativeTime(entry.passwordChangedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Accessed</p>
              <p className="text-foreground">{formatRelativeTime(entry.lastAccessedAt)}</p>
            </div>
          </div>
        </Section>
      </div>
    </motion.div>
  )
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

// ─── Copy Field ───────────────────────────────────────────────────────────────

interface CopyFieldProps {
  icon: React.ReactNode
  label: string
  value: string
  entryId: string
  action: string
  isPassword?: boolean
}

function CopyField({ icon, label, value, entryId, action, isPassword }: CopyFieldProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useUIStore()

  const handleCopy = useCallback(() => {
    copyToClipboard(value, 30000)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ type: 'success', title: `${label} copied`, description: 'Clipboard will clear in 30s' })
    activityLogRepository.add({
      id: uuidv4(), action: 'password_copied', entryId,
      metadata: { field: action }, timestamp: Date.now(),
    })
  }, [value, label, entryId, action, toast])

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30 group">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm text-foreground truncate', isPassword && 'font-mono tracking-wider')}>
          {isPassword ? '•'.repeat(Math.min(value.length, 16)) : value}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        title="Copy"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div key="check" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </motion.div>
          ) : (
            <motion.div key="copy" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <Copy className="h-3.5 w-3.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  )
}

// ─── Password Field with Reveal ───────────────────────────────────────────────

function PasswordField({ entry, requireReauth }: { entry: { id: string; password: string; strength: { score: number; label: string } }; requireReauth: boolean }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const { requestReauth, toast } = useUIStore()

  const handleReveal = () => {
    if (requireReauth && !revealed) {
      requestReauth(() => {
        setRevealed(true)
        activityLogRepository.add({ id: uuidv4(), action: 'password_revealed', entryId: entry.id, timestamp: Date.now() })
      })
    } else {
      setRevealed(r => !r)
    }
  }

  const handleCopy = () => {
    const doCopy = () => {
      copyToClipboard(entry.password, 30000)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ type: 'success', title: 'Password copied', description: 'Clipboard will clear in 30s' })
      activityLogRepository.add({ id: uuidv4(), action: 'password_copied', entryId: entry.id, timestamp: Date.now() })
    }

    if (requireReauth) {
      requestReauth(doCopy)
    } else {
      doCopy()
    }
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30 group">
      <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Password</p>
        <p className={cn('text-sm font-mono tracking-wider text-foreground truncate')}>
          {revealed ? entry.password : '•'.repeat(Math.min(entry.password.length, 20))}
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        <button onClick={handleReveal} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title={revealed ? 'Hide' : 'Reveal'}>
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button onClick={handleCopy} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="Copy password">
          <AnimatePresence mode="wait">
            {copied
              ? <motion.div key="c" initial={{ scale: 0.8 }} animate={{ scale: 1 }}><Check className="h-3.5 w-3.5 text-emerald-400" /></motion.div>
              : <motion.div key="cc" initial={{ scale: 0.8 }} animate={{ scale: 1 }}><Copy className="h-3.5 w-3.5" /></motion.div>
            }
          </AnimatePresence>
        </button>
      </div>
    </div>
  )
}
