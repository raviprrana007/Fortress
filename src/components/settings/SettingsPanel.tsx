import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Moon, Sun, Monitor, Lock, Timer, Clipboard, Eye, Download, Fingerprint, Trash2, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import { isWebAuthnSupported, registerBiometric } from '@/crypto/webauthn'
import type { UserSettings } from '@/types'
import { cn } from '@/utils'

export function SettingsPanel() {
  const { account, updateAccount } = useAuthStore()
  const { toast, setTheme, theme, setActivePanel } = useUIStore()
  const [isEnrollingBiometric, setIsEnrollingBiometric] = useState(false)

  if (!account) return null

  const settings = account.settings

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      await updateAccount({ settings: { ...settings, ...updates } })
      toast({ type: 'success', title: 'Settings saved' })
    } catch {
      toast({ type: 'error', title: 'Failed to save settings' })
    }
  }

  const handleBiometricEnroll = async () => {
    if (!isWebAuthnSupported()) {
      toast({ type: 'error', title: 'Biometric not supported', description: 'Your device does not support biometric auth' })
      return
    }
    setIsEnrollingBiometric(true)
    try {
      const { credentialId } = await registerBiometric(account.id, account.displayName)
      await updateAccount({ hasWebAuthn: true, webAuthnCredentialId: credentialId })
      toast({ type: 'success', title: 'Biometric enrolled', description: 'You can now unlock with biometrics' })
    } catch (err) {
      toast({ type: 'error', title: 'Enrollment failed', description: (err as Error).message })
    } finally {
      setIsEnrollingBiometric(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
        <button 
          onClick={() => setActivePanel('list')} 
          className="md:hidden p-2 -ml-3 mr-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Settings
          </h2>
          <p className="text-sm text-muted-foreground">Customize your Fortress experience</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
        {/* Profile */}
        <Section title="Profile">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/30">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: account.avatarColor }}
            >
              {account.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{account.displayName}</p>
              <p className="text-sm text-muted-foreground">{account.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Member since {new Date(account.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Theme</label>
            <div className="flex gap-2">
              {[
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'system', label: 'System', icon: Monitor },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { setTheme(value as 'dark' | 'light' | 'system'); updateSettings({ theme: value as 'dark' | 'light' | 'system' }) }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all flex-1',
                    theme === value
                      ? 'border-primary/50 bg-primary/5 text-foreground'
                      : 'border-border/50 text-muted-foreground hover:border-border'
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Security */}
        <Section title="Security">
          <SettingRow
            icon={<Lock className="h-4 w-4" />}
            label="Auto-lock Timeout"
            description="Lock vault after inactivity"
          >
            <select
              value={settings.autoLockTimeout}
              onChange={e => updateSettings({ autoLockTimeout: parseInt(e.target.value) })}
              className="h-8 px-2 rounded-lg border border-border/50 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value={0}>Never</option>
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </SettingRow>

          <SettingRow
            icon={<Clipboard className="h-4 w-4" />}
            label="Clipboard Clear"
            description="Clear clipboard after copying"
          >
            <select
              value={settings.clipboardClearTimeout}
              onChange={e => updateSettings({ clipboardClearTimeout: parseInt(e.target.value) })}
              className="h-8 px-2 rounded-lg border border-border/50 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={0}>Never</option>
            </select>
          </SettingRow>

          <SettingToggle
            icon={<Eye className="h-4 w-4" />}
            label="Re-auth to Reveal"
            description="Require password before showing passwords"
            checked={settings.requireReauthForReveal}
            onChange={v => updateSettings({ requireReauthForReveal: v })}
          />

          <SettingToggle
            icon={<Download className="h-4 w-4" />}
            label="Re-auth to Export"
            description="Require password before exporting vault"
            checked={settings.requireReauthForExport}
            onChange={v => updateSettings({ requireReauthForExport: v })}
          />
        </Section>

        {/* Biometrics */}
        <Section title="Biometric Unlock">
          <div className="p-4 rounded-xl bg-muted/30 border border-border/30 space-y-3">
            <div className="flex items-center gap-3">
              <Fingerprint className={cn('h-8 w-8', account.hasWebAuthn ? 'text-emerald-400' : 'text-muted-foreground')} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {account.hasWebAuthn ? 'Biometric enrolled' : 'Biometric not set up'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {account.hasWebAuthn ? 'Use fingerprint or Face ID to unlock' : 'Use your device biometrics to unlock'}
                </p>
              </div>
            </div>
            <button
              onClick={handleBiometricEnroll}
              disabled={isEnrollingBiometric || !isWebAuthnSupported()}
              className={cn(
                'w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-all',
                account.hasWebAuthn
                  ? 'border border-destructive/50 text-destructive hover:bg-destructive/10'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Fingerprint className="h-4 w-4" />
              {isEnrollingBiometric ? 'Enrolling…' : account.hasWebAuthn ? 'Re-enroll Biometric' : 'Set Up Biometric'}
            </button>
            {!isWebAuthnSupported() && (
              <p className="text-xs text-muted-foreground text-center">Biometric auth not available on this device</p>
            )}
          </div>
        </Section>

        {/* Generator Defaults */}
        <Section title="Password Generator Defaults">
          <div className="space-y-3">
            <SettingRow label="Default Length" icon={<Timer className="h-4 w-4" />}>
              <input
                type="number"
                min={8}
                max={128}
                value={settings.defaultGeneratorLength}
                onChange={e => updateSettings({ defaultGeneratorLength: parseInt(e.target.value) })}
                className="h-8 w-20 px-2 rounded-lg border border-border/50 bg-muted/30 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </SettingRow>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function SettingRow({ icon, label, description, children }: {
  icon?: React.ReactNode; label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SettingToggle({ icon, label, description, checked, onChange }: {
  icon?: React.ReactNode; label: string; description?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <SettingRow icon={icon} label={label} description={description}>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors',
          checked ? 'bg-primary border-primary/50' : 'bg-muted border-border/50'
        )}
      >
        <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </SettingRow>
  )
}
