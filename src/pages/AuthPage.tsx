import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Eye, EyeOff, ArrowRight, Fingerprint, Lock, Key, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StrengthBadge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import { scorePassword } from '@/crypto/generator'
import { accountRepository } from '@/db/repository'
import type { PasswordStrength } from '@/types'
import { isWebAuthnSupported, authenticateBiometric } from '@/crypto/webauthn'
import { cn } from '@/utils'

type AuthMode = 'login' | 'signup'

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [hasAccount, setHasAccount] = useState<boolean | null>(null)
  const [showWebAuthn, setShowWebAuthn] = useState(false)

  useEffect(() => {
    accountRepository.exists().then(exists => {
      setHasAccount(exists)
      setMode(exists ? 'login' : 'signup')
    })
  }, [])

  if (hasAccount === null) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-auth-gradient flex items-center justify-center p-4">
      {/* Background grid pattern */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(220, 75%, 60%) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 glow-primary">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Fortress
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Enterprise-grade password manager
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'login' ? (
            <LoginForm key="login" onSwitchMode={() => setMode('signup')} hasAccount={hasAccount} />
          ) : (
            <SignupForm key="signup" onSwitchMode={() => setMode('login')} />
          )}
        </AnimatePresence>

        {/* Security badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            AES-256-GCM
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Argon2id
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Zero-knowledge
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-auth-gradient flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Shield className="h-8 w-8 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Initializing secure storage…</p>
      </div>
    </div>
  )
}

// ─── Login Form ───────────────────────────────────────────────────────────────

function LoginForm({ onSwitchMode, hasAccount }: { onSwitchMode: () => void; hasAccount: boolean }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading, error, clearError, account, lockVault } = useAuthStore()
  const { toast } = useUIStore()
  const webAuthnAvailable = isWebAuthnSupported() && account?.hasWebAuthn

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await login(password)
    } catch {
      // error already set in store
    }
  }

  const handleBiometric = async () => {
    if (!account?.webAuthnCredentialId) return
    try {
      const ok = await authenticateBiometric(account.webAuthnCredentialId)
      if (ok) {
        await login(password || '__biometric__')
      } else {
        toast({ type: 'error', title: 'Biometric failed', description: 'Please use your master password' })
      }
    } catch (err) {
      toast({ type: 'error', title: 'Biometric error', description: (err as Error).message })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="glass-card rounded-2xl p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {account ? `Welcome back, ${account.displayName}` : 'Unlock vault'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your master password to access your vault
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Master Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); clearError() }}
                autoFocus
                autoComplete="current-password"
                className={cn(
                  'flex h-10 w-full rounded-lg border border-input bg-muted/30 pl-10 pr-10 py-2 text-sm',
                  'text-foreground placeholder:text-muted-foreground/60',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                  'transition-colors duration-150',
                  error && 'border-destructive/60'
                )}
                placeholder="Enter master password…"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-destructive flex items-center gap-1"
              >
                <span>⚠</span> {error}
              </motion.p>
            )}
          </div>

          <Button type="submit" className="w-full" loading={isLoading} size="lg">
            <Lock className="h-4 w-4" />
            Unlock Vault
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>

          {webAuthnAvailable && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleBiometric}
              size="lg"
            >
              <Fingerprint className="h-4 w-4" />
              Use Biometric
            </Button>
          )}
        </form>

        {!hasAccount && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            No account yet?{' '}
            <button
              onClick={onSwitchMode}
              className="text-primary hover:underline font-medium transition-colors"
            >
              Create vault
            </button>
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Signup Form ──────────────────────────────────────────────────────────────

function SignupForm({ onSwitchMode }: { onSwitchMode: () => void }) {
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [strength, setStrength] = useState<PasswordStrength | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { signup, isLoading, error, clearError, login } = useAuthStore()
  const { toast } = useUIStore()

  const handlePasswordChange = (val: string) => {
    setPassword(val)
    clearError()
    if (val) setStrength(scorePassword(val))
    else setStrength(null)
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    if (!displayName.trim()) newErrors.displayName = 'Name is required'
    if (!email.trim() || !email.includes('@')) newErrors.email = 'Valid email required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}
    if (!password) newErrors.password = 'Password is required'
    else if (password.length < 12) newErrors.password = 'At least 12 characters required'
    else if ((strength?.score ?? 0) < 2) newErrors.password = 'Please choose a stronger password'
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return
    try {
      await signup(email, displayName, password)
      await login(password)
      toast({ type: 'success', title: 'Vault created!', description: 'Your encrypted vault is ready.' })
    } catch (err) {
      // Error shown below
    }
  }

  const requirements = [
    { label: '12+ characters', met: password.length >= 12 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[^a-zA-Z0-9]/.test(password) },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="glass-card rounded-2xl p-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map(s => (
            <React.Fragment key={s}>
              <div className={cn(
                'h-2 rounded-full transition-all duration-300 flex-1',
                s <= step ? 'bg-primary' : 'bg-muted'
              )} />
            </React.Fragment>
          ))}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {step === 1 ? 'Create your vault' : 'Set master password'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1
              ? 'Your data stays encrypted on your device'
              : 'This password encrypts your vault. Store it safely — we cannot recover it.'}
          </p>
        </div>

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext() } : handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  error={errors.displayName}
                  autoFocus
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  error={errors.email}
                />
                <Button type="submit" className="w-full" size="lg">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Master Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => handlePasswordChange(e.target.value)}
                      autoFocus
                      autoComplete="new-password"
                      className={cn(
                        'flex h-10 w-full rounded-lg border border-input bg-muted/30 pl-10 pr-10 py-2 text-sm text-foreground',
                        'placeholder:text-muted-foreground/60 transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                        errors.password && 'border-destructive/60'
                      )}
                      placeholder="Create strong password…"
                    />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {strength && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <StrengthBadge score={strength.score} label={strength.label} showBars />
                        <span className="text-xs text-muted-foreground">{strength.entropy} bits</span>
                      </div>
                    </div>
                  )}
                  {errors.password && <p className="text-xs text-destructive">⚠ {errors.password}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className={cn(
                      'flex h-10 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground',
                      'placeholder:text-muted-foreground/60 transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                      errors.confirmPassword && 'border-destructive/60'
                    )}
                    placeholder="Confirm your password…"
                  />
                  {errors.confirmPassword && <p className="text-xs text-destructive">⚠ {errors.confirmPassword}</p>}
                </div>

                {/* Requirements checklist */}
                {password && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {requirements.map(req => (
                      <div key={req.label} className={cn('flex items-center gap-1.5 text-xs', req.met ? 'text-emerald-400' : 'text-muted-foreground')}>
                        <CheckCircle2 className={cn('h-3.5 w-3.5', req.met ? 'text-emerald-400' : 'text-muted-foreground/40')} />
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}

                {(error) && (
                  <p className="text-xs text-destructive">⚠ {error}</p>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" loading={isLoading} size="default">
                    <Shield className="h-4 w-4" />
                    Create Vault
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have a vault?{' '}
          <button onClick={onSwitchMode} className="text-primary hover:underline font-medium">
            Sign in
          </button>
        </p>
      </div>
    </motion.div>
  )
}
