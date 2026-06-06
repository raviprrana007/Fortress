import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/utils'
import { useUIStore } from '@/store/ui.store'

const icons = {
  success: <CheckCircle className="h-4 w-4 text-emerald-400" />,
  error: <AlertCircle className="h-4 w-4 text-red-400" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
  info: <Info className="h-4 w-4 text-blue-400" />,
}

const borderColors = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  warning: 'border-l-yellow-500',
  info: 'border-l-blue-500',
}

export function ToastProvider() {
  const { toasts, dismissToast } = useUIStore()

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastPrimitive.Root
            key={toast.id}
            asChild
            open={true}
            onOpenChange={() => dismissToast(toast.id)}
          >
            <motion.div
              initial={{ opacity: 0, x: 64, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 64, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                'flex items-start gap-3 w-[360px] rounded-xl border border-border/50',
                'bg-card/90 backdrop-blur-xl shadow-xl px-4 py-3.5',
                'border-l-4',
                borderColors[toast.type]
              )}
            >
              <div className="mt-0.5 shrink-0">{icons[toast.type]}</div>
              <div className="flex-1 min-w-0">
                <ToastPrimitive.Title className="text-sm font-semibold text-foreground">
                  {toast.title}
                </ToastPrimitive.Title>
                {toast.description && (
                  <ToastPrimitive.Description className="text-xs text-muted-foreground mt-0.5">
                    {toast.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </ToastPrimitive.Close>
            </motion.div>
          </ToastPrimitive.Root>
        ))}
      </AnimatePresence>
      <ToastPrimitive.Viewport
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 outline-none"
      />
    </ToastPrimitive.Provider>
  )
}
