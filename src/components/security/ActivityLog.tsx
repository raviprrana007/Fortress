import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Shield, Lock, Key, Copy, Download, Upload, Settings, Search, ChevronLeft } from 'lucide-react'
import { activityLogRepository } from '@/db/repository'
import type { ActivityLog } from '@/types'
import { formatRelativeTime } from '@/utils'
import { cn } from '@/utils'
import { useUIStore } from '@/store/ui.store'

const ACTION_ICONS: Record<string, React.ReactNode> = {
  vault_unlocked: <Lock className="h-3.5 w-3.5 text-emerald-400" />,
  vault_locked: <Lock className="h-3.5 w-3.5 text-muted-foreground" />,
  entry_created: <Key className="h-3.5 w-3.5 text-blue-400" />,
  entry_updated: <Key className="h-3.5 w-3.5 text-yellow-400" />,
  entry_deleted: <Key className="h-3.5 w-3.5 text-red-400" />,
  entry_viewed: <Search className="h-3.5 w-3.5 text-muted-foreground" />,
  password_copied: <Copy className="h-3.5 w-3.5 text-primary" />,
  password_revealed: <Shield className="h-3.5 w-3.5 text-yellow-400" />,
  vault_exported: <Download className="h-3.5 w-3.5 text-orange-400" />,
  vault_imported: <Upload className="h-3.5 w-3.5 text-green-400" />,
  settings_changed: <Settings className="h-3.5 w-3.5 text-muted-foreground" />,
}

const ACTION_LABELS: Record<string, string> = {
  vault_unlocked: 'Vault unlocked',
  vault_locked: 'Vault locked',
  entry_created: 'Entry created',
  entry_updated: 'Entry updated',
  entry_deleted: 'Entry deleted',
  entry_viewed: 'Entry viewed',
  password_copied: 'Password copied',
  password_revealed: 'Password revealed',
  password_generated: 'Password generated',
  vault_exported: 'Vault exported',
  vault_imported: 'Vault imported',
  settings_changed: 'Settings changed',
  biometric_enrolled: 'Biometric enrolled',
  biometric_authenticated: 'Biometric auth',
}

export function ActivityLogPanel() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const { setActivePanel } = useUIStore()

  useEffect(() => {
    activityLogRepository.getRecent(90).then(data => {
      setLogs(data)
      setLoading(false)
    })
  }, [])

  const filtered = filter
    ? logs.filter(log => (ACTION_LABELS[log.action] || log.action).toLowerCase().includes(filter.toLowerCase())
        || (log.entryName || '').toLowerCase().includes(filter.toLowerCase()))
    : logs

  // Group by date
  const grouped = filtered.reduce<Record<string, ActivityLog[]>>((acc, log) => {
    const date = new Date(log.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActivePanel('list')} 
              className="md:hidden p-2 -ml-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Activity Log
              </h2>
              <p className="text-sm text-muted-foreground">Last 90 days of vault activity</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">{logs.length} events</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter activity…"
            className="flex h-8 w-full rounded-lg border border-input bg-muted/30 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg skeleton" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No activity recorded yet</p>
          </div>
        ) : Object.entries(grouped).map(([date, dayLogs]) => (
          <div key={date} className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">{date}</h3>
            <div className="space-y-1">
              {dayLogs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-muted/50 border border-border/30 flex items-center justify-center shrink-0">
                    {ACTION_ICONS[log.action] || <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{ACTION_LABELS[log.action] || log.action}</p>
                    {log.entryName && (
                      <p className="text-xs text-muted-foreground truncate">{log.entryName}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
