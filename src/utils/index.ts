import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp))
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 30) return formatDate(timestamp)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export function getFaviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
  } catch {
    return ''
  }
}

export function copyToClipboard(text: string, clearAfterMs = 30000): void {
  navigator.clipboard.writeText(text).then(() => {
    if (clearAfterMs > 0) {
      setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {})
      }, clearAfterMs)
    }
  })
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    login: '🔑',
    card: '💳',
    identity: '🪪',
    note: '📝',
    'ssh-key': '🔐',
    'api-key': '⚙️',
    bank: '🏦',
    crypto: '₿',
    other: '📦',
  }
  return icons[category] || '📦'
}

export function getStrengthColor(score: number): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-emerald-500',
  ]
  return colors[score] || colors[0]
}

export function getStrengthTextColor(score: number): string {
  const colors = [
    'text-red-400',
    'text-orange-400',
    'text-yellow-400',
    'text-green-400',
    'text-emerald-400',
  ]
  return colors[score] || colors[0]
}
