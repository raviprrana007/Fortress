/**
 * Auto-lock hook — tracks user activity and locks the vault after timeout.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/auth.store'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']

export function useAutoLock() {
  const { account, isAuthenticated, lockVault } = useAuthStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const timeout = account?.settings.autoLockTimeout ?? 15
    if (timeout === 0 || !isAuthenticated) return

    timerRef.current = setTimeout(() => {
      lockVault()
    }, timeout * 60 * 1000)
  }, [account?.settings.autoLockTimeout, isAuthenticated, lockVault])

  useEffect(() => {
    if (!isAuthenticated) return

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true })
    })
    resetTimer()

    // Lock on tab/window hidden
    const handleVisibilityChange = () => {
      if (document.hidden && account?.settings.autoLockTimeout === 1) {
        lockVault()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, resetTimer))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isAuthenticated, resetTimer, lockVault, account?.settings.autoLockTimeout])
}
