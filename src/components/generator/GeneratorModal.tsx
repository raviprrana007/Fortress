import React, { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Copy, Check, Wand2, Sliders } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalTitle } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/ui.store'
import { generatePassword, scorePassword, DEFAULT_GENERATOR_OPTIONS, calculateEntropy, crackTimeFromEntropy } from '@/crypto/generator'
import { copyToClipboard } from '@/utils'
import { StrengthBadge } from '@/components/ui/Badge'
import type { GeneratorOptions } from '@/types'
import { cn } from '@/utils'

export function GeneratorModal() {
  const { closeModal, toast } = useUIStore()
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_GENERATOR_OPTIONS)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = useCallback(() => {
    const pwd = generatePassword(options)
    setPassword(pwd)
  }, [options])

  useEffect(() => { generate() }, [generate])

  const strength = password ? scorePassword(password) : null

  const handleCopy = () => {
    copyToClipboard(password, 30000)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ type: 'success', title: 'Password copied', description: 'Clipboard clears in 30s' })
  }

  const setOpt = (key: keyof GeneratorOptions, value: unknown) => {
    setOptions(o => ({ ...o, [key]: value }))
  }

  return (
    <Modal open onOpenChange={open => !open && closeModal()}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Password Generator
          </ModalTitle>
        </ModalHeader>

        <ModalBody className="space-y-5">
          {/* Generated Password Display */}
          <div className="relative">
            <div className={cn(
              'flex items-center gap-3 p-4 rounded-xl border border-border/50',
              'bg-muted/30 min-h-[72px]'
            )}>
              <p
                className={cn(
                  'flex-1 font-mono text-lg text-foreground break-all leading-relaxed',
                  options.mode === 'passphrase' && 'text-base tracking-normal'
                )}
              >
                {password}
              </p>
            </div>

            {/* Strength bar */}
            {strength && (
              <div className="flex gap-1 mt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all duration-300',
                      i < strength.score
                        ? ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'][Math.min(strength.score - 1, 3)]
                        : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Strength info */}
          {strength && (
            <div className="flex items-center justify-between">
              <StrengthBadge score={strength.score} label={strength.label} />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{strength.entropy} bits</span>
                <span>•</span>
                <span>Cracks in: {strength.crackTime}</span>
              </div>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            {(['password', 'passphrase', 'pin'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setOpt('mode', mode)}
                className={cn(
                  'flex-1 py-2 text-xs font-medium capitalize transition-all',
                  options.mode === mode
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Options */}
          {options.mode === 'password' && (
            <div className="space-y-4">
              {/* Length */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Length</label>
                  <span className="text-sm font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {options.length}
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={128}
                  value={options.length}
                  onChange={e => setOpt('length', parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>8</span><span>128</span>
                </div>
              </div>

              {/* Character sets */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'uppercase', label: 'Uppercase (A-Z)' },
                  { key: 'lowercase', label: 'Lowercase (a-z)' },
                  { key: 'numbers', label: 'Numbers (0-9)' },
                  { key: 'symbols', label: 'Symbols (!@#...)' },
                ].map(({ key, label }) => (
                  <Toggle
                    key={key}
                    checked={(options as unknown as Record<string, boolean>)[key]}
                    onChange={v => setOpt(key as keyof GeneratorOptions, v)}
                    label={label}
                  />
                ))}
              </div>

              <Toggle
                checked={options.excludeAmbiguous}
                onChange={v => setOpt('excludeAmbiguous', v)}
                label="Exclude ambiguous (0, O, l, I)"
              />
            </div>
          )}

          {options.mode === 'passphrase' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Words</label>
                  <span className="text-sm font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {options.passphraseWords}
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={options.passphraseWords}
                  onChange={e => setOpt('passphraseWords', parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Separator</label>
                  <input
                    value={options.passphraseSeparator}
                    onChange={e => setOpt('passphraseSeparator', e.target.value)}
                    maxLength={3}
                    className="h-8 w-full rounded-lg border border-input bg-muted/30 px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <Toggle
                  checked={options.passphraseCapitalize}
                  onChange={v => setOpt('passphraseCapitalize', v)}
                  label="Capitalize words"
                />
              </div>
            </div>
          )}

          {options.mode === 'pin' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">PIN Length</label>
                <span className="text-sm font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">{options.length}</span>
              </div>
              <input
                type="range"
                min={4}
                max={12}
                value={options.length}
                onChange={e => setOpt('length', parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={generate} className="flex-1">
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
            <Button onClick={handleCopy} className="flex-1">
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors border shrink-0',
          checked ? 'bg-primary border-primary/50' : 'bg-muted border-border/50'
        )}
      >
        <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm', checked ? 'translate-x-4.5' : 'translate-x-0.5')} />
      </button>
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
    </label>
  )
}
