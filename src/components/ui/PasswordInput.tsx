import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Copy, RefreshCw, Check } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/utils'
import { copyToClipboard } from '@/utils'
import { useUIStore } from '@/store/ui.store'

interface PasswordInputProps {
  value: string
  onChange?: (v: string) => void
  onGenerate?: () => void
  label?: string
  error?: string
  readOnly?: boolean
  requireReauth?: boolean
  entryId?: string
  className?: string
}

export function PasswordInput({
  value,
  onChange,
  onGenerate,
  label,
  error,
  readOnly = false,
  requireReauth = false,
  className,
}: PasswordInputProps) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const { requestReauth } = useUIStore()

  const handleReveal = useCallback(() => {
    if (requireReauth && !revealed) {
      requestReauth(() => setRevealed(true))
    } else {
      setRevealed(r => !r)
    }
  }, [requireReauth, revealed, requestReauth])

  const handleCopy = useCallback(() => {
    copyToClipboard(value, 30000)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [value])

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">{label}</label>
      )}
      <div className="relative flex items-center">
        <input
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          readOnly={readOnly}
          className={cn(
            'flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 py-2',
            'text-sm font-mono tracking-wider text-foreground',
            'placeholder:text-muted-foreground/60 transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'pr-24',
            error && 'border-destructive/60',
            readOnly && 'cursor-default',
          )}
          placeholder="••••••••••••"
        />
        <div className="absolute right-1.5 flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleReveal}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            title={revealed ? 'Hide password' : 'Show password'}
          >
            <AnimatePresence mode="wait">
              {revealed ? (
                <motion.div key="hide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EyeOff className="h-3.5 w-3.5" />
                </motion.div>
              ) : (
                <motion.div key="show" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Eye className="h-3.5 w-3.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            title="Copy password"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div key="check" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                </motion.div>
              ) : (
                <motion.div key="copy" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                  <Copy className="h-3.5 w-3.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              title="Generate password"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">⚠ {error}</p>}
    </div>
  )
}
