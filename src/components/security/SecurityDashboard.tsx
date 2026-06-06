import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, AlertTriangle, RefreshCw, ExternalLink,
  ChevronRight, Eye, Key, Clock, Repeat2
} from 'lucide-react'
import { useVaultStore } from '@/store/vault.store'
import { useUIStore } from '@/store/ui.store'
import { analyzeVaultSecurity, getSecurityGrade, checkPasswordBreached } from '@/services/security.service'
import { cn, getStrengthTextColor, formatRelativeTime, getDomainFromUrl } from '@/utils'
import type { SecurityReport, VaultEntry } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function SecurityDashboard() {
  const { entries, setSelectedEntry } = useVaultStore()
  const { setActivePanel, toast } = useUIStore()
  const [report, setReport] = useState<SecurityReport | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [checkingBreaches, setCheckingBreaches] = useState(false)
  const [breachedIds, setBreachedIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'overview' | 'weak' | 'reused' | 'old'>('overview')

  useEffect(() => {
    const analysis = analyzeVaultSecurity(entries)
    setReport(analysis)
  }, [entries])

  const handleBreach = async () => {
    setCheckingBreaches(true)
    const newBreached = new Set<string>()
    for (const entry of entries) {
      if (!entry.password) continue
      const breached = await checkPasswordBreached(entry.password)
      if (breached) newBreached.add(entry.id)
    }
    setBreachedIds(newBreached)
    setCheckingBreaches(false)
    if (newBreached.size > 0) {
      toast({ type: 'warning', title: `${newBreached.size} breached passwords found`, description: 'Update these passwords immediately!' })
    } else {
      toast({ type: 'success', title: 'No breached passwords found', description: 'Your passwords are safe from known breaches' })
    }
  }

  if (!report) return null

  const grade = getSecurityGrade(report.score)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'weak', label: `Weak (${report.weakPasswords.length})` },
    { id: 'reused', label: `Reused (${report.reusedPasswords.length})` },
    { id: 'old', label: `Old (${report.oldPasswords.length})` },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Security Dashboard</h2>
            <p className="text-sm text-muted-foreground">Monitor vault health and password security</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBreach}
            loading={checkingBreaches}
          >
            <Shield className="h-3.5 w-3.5" />
            Check Breaches
          </Button>
        </div>
      </div>

      {/* Score Hero */}
      <div className="px-6 py-6 border-b border-border/50">
        <div className="flex items-center gap-6">
          {/* Circular score */}
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={report.score >= 75 ? 'hsl(142, 71%, 45%)' : report.score >= 50 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - report.score / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{report.score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>

          <div className="flex-1">
            <div className={cn('text-2xl font-bold mb-1', grade.color)}>{grade.label}</div>
            <p className="text-sm text-muted-foreground mb-3">
              {report.totalEntries} passwords analyzed
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Strong', count: report.strongCount, color: 'text-emerald-400' },
                { label: 'Fair', count: report.fairCount, color: 'text-yellow-400' },
                { label: 'Weak', count: report.weakCount, color: 'text-orange-400' },
                { label: 'Critical', count: report.veryWeakCount, color: 'text-red-400' },
              ].map(({ label, count, color }) => (
                <div key={label} className="text-center p-2 rounded-lg bg-muted/30 border border-border/30">
                  <div className={cn('text-xl font-bold', color)}>{count}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50 px-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              'py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {report.weakPasswords.length > 0 && (
                  <SecurityIssueCard
                    icon={<AlertTriangle className="h-4 w-4 text-orange-400" />}
                    title={`${report.weakPasswords.length} weak passwords`}
                    description="These passwords are easy to guess"
                    severity="warning"
                    onClick={() => setActiveTab('weak')}
                  />
                )}
                {report.reusedPasswords.length > 0 && (
                  <SecurityIssueCard
                    icon={<Repeat2 className="h-4 w-4 text-yellow-400" />}
                    title={`${report.reusedPasswords.length} reused passwords`}
                    description="Same password used across multiple sites"
                    severity="warning"
                    onClick={() => setActiveTab('reused')}
                  />
                )}
                {report.oldPasswords.length > 0 && (
                  <SecurityIssueCard
                    icon={<Clock className="h-4 w-4 text-blue-400" />}
                    title={`${report.oldPasswords.length} old passwords`}
                    description="Not changed in over 90 days"
                    severity="info"
                    onClick={() => setActiveTab('old')}
                  />
                )}
                {breachedIds.size > 0 && (
                  <SecurityIssueCard
                    icon={<Shield className="h-4 w-4 text-red-400" />}
                    title={`${breachedIds.size} passwords found in breaches`}
                    description="These passwords have been exposed in data breaches"
                    severity="danger"
                    onClick={() => {}}
                  />
                )}
                {report.weakPasswords.length === 0 && report.reusedPasswords.length === 0 && (
                  <div className="py-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                      <Shield className="h-8 w-8 text-emerald-400" />
                    </div>
                    <p className="text-emerald-400 font-semibold">Excellent security!</p>
                    <p className="text-sm text-muted-foreground mt-1">No major issues detected</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'weak' && (
            <motion.div key="weak" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {report.weakPasswords.length === 0 ? (
                <EmptyTabState icon={<Key />} message="No weak passwords found" />
              ) : report.weakPasswords.map(entry => (
                <EntrySecurityRow
                  key={entry.id}
                  entry={entry}
                  tag={<Badge variant="warning">{entry.strength.label}</Badge>}
                  onClick={() => { setSelectedEntry(entry.id); setActivePanel('detail') }}
                  isBreached={breachedIds.has(entry.id)}
                />
              ))}
            </motion.div>
          )}

          {activeTab === 'reused' && (
            <motion.div key="reused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {report.reusedPasswords.length === 0 ? (
                <EmptyTabState icon={<Repeat2 />} message="No reused passwords found" />
              ) : report.reusedPasswords.map(({ password, entries: group }, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs text-muted-foreground px-1">
                    Same password used in {group.length} places:
                  </p>
                  {group.map(entry => (
                    <EntrySecurityRow
                      key={entry.id}
                      entry={entry}
                      tag={<Badge variant="warning">Reused</Badge>}
                      onClick={() => { setSelectedEntry(entry.id); setActivePanel('detail') }}
                    />
                  ))}
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'old' && (
            <motion.div key="old" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {report.oldPasswords.length === 0 ? (
                <EmptyTabState icon={<Clock />} message="All passwords are up to date" />
              ) : report.oldPasswords.map(entry => {
                const ageDays = Math.floor((Date.now() - entry.passwordChangedAt) / (1000 * 60 * 60 * 24))
                return (
                  <EntrySecurityRow
                    key={entry.id}
                    entry={entry}
                    tag={<Badge variant="secondary">{ageDays}d old</Badge>}
                    onClick={() => { setSelectedEntry(entry.id); setActivePanel('detail') }}
                  />
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SecurityIssueCard({ icon, title, description, severity, onClick }: {
  icon: React.ReactNode; title: string; description: string;
  severity: 'danger' | 'warning' | 'info'; onClick: () => void
}) {
  const colors = {
    danger: 'border-red-500/20 bg-red-500/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
    info: 'border-blue-500/20 bg-blue-500/5',
  }
  return (
    <button
      onClick={onClick}
      className={cn('w-full flex items-center gap-3 p-4 rounded-xl border text-left hover:opacity-80 transition-opacity', colors[severity])}
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  )
}

function EntrySecurityRow({ entry, tag, onClick, isBreached }: {
  entry: VaultEntry; tag: React.ReactNode; onClick: () => void; isBreached?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/30 text-left transition-all group"
    >
      <div className="w-9 h-9 rounded-xl bg-muted border border-border/50 flex items-center justify-center text-base shrink-0">
        🔑
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {entry.name}
          {isBreached && <span className="ml-2 text-xs text-red-400">⚠ Breached</span>}
        </p>
        <p className="text-xs text-muted-foreground truncate">{entry.username || entry.email}</p>
      </div>
      {tag}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

function EmptyTabState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-400">
        {icon}
      </div>
      <p className="text-sm text-emerald-400 font-medium">{message}</p>
    </div>
  )
}
