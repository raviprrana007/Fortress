import * as React from 'react'
import { cn } from '@/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary/15 text-primary border border-primary/20',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground border border-border/50',
        variant === 'success' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
        variant === 'warning' && 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
        variant === 'danger' && 'bg-red-500/15 text-red-400 border border-red-500/20',
        variant === 'outline' && 'border border-border text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}

// Strength Badge
interface StrengthBadgeProps {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  showBars?: boolean
}

export function StrengthBadge({ score, label, showBars = false }: StrengthBadgeProps) {
  const variants = [
    { bg: 'bg-red-500/15 text-red-400 border-red-500/20' },
    { bg: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
    { bg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
    { bg: 'bg-green-500/15 text-green-400 border-green-500/20' },
    { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  ]
  const barColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500']

  const { bg } = variants[score]

  return (
    <div className="flex items-center gap-2">
      {showBars && (
        <div className="flex gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 w-5 rounded-full transition-all duration-300',
                i < score + 1 ? barColors[score] : 'bg-muted'
              )}
            />
          ))}
        </div>
      )}
      <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium border', bg)}>
        {label}
      </span>
    </div>
  )
}

// Category Badge
export function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    login: 'Login',
    card: 'Card',
    identity: 'Identity',
    note: 'Secure Note',
    'ssh-key': 'SSH Key',
    'api-key': 'API Key',
    bank: 'Banking',
    crypto: 'Crypto',
    other: 'Other',
  }

  return (
    <Badge variant="secondary" className="gap-1">
      {labels[category] || category}
    </Badge>
  )
}
