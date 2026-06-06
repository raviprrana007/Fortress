/**
 * UI Store — modal system, toast notifications, command palette,
 * and global UI state.
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ModalState, ModalType, ToastMessage } from '@/types';

interface UIState {
  modal: ModalState | null;
  toasts: ToastMessage[];
  commandPaletteOpen: boolean;
  sidebarCollapsed: boolean;
  isReauthPending: boolean;
  reauthCallback: (() => void) | null;
  theme: 'dark' | 'light' | 'system';
  activePanel: 'list' | 'detail' | 'generator' | 'security' | 'settings' | 'activity';
}

interface UIActions {
  openModal: (type: ModalType, props?: Record<string, unknown>) => void;
  closeModal: () => void;
  toast: (msg: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  requestReauth: (callback: () => void) => void;
  resolveReauth: () => void;
  cancelReauth: () => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setActivePanel: (panel: UIState['activePanel']) => void;
}

export const useUIStore = create<UIState & UIActions>()((set, get) => ({
  modal: null,
  toasts: [],
  commandPaletteOpen: false,
  sidebarCollapsed: false,
  isReauthPending: false,
  reauthCallback: null,
  theme: 'dark',
  activePanel: 'list',

  openModal: (type, props) => set({ modal: { type, props } }),
  closeModal: () => set({ modal: null }),

  toast: (msg) => {
    const id = uuidv4();
    const toast: ToastMessage = { id, duration: 4000, ...msg };
    set(state => ({ toasts: [...state.toasts, toast] }));
    setTimeout(() => get().dismissToast(id), toast.duration || 4000);
  },

  dismissToast: (id) => set(state => ({
    toasts: state.toasts.filter(t => t.id !== id),
  })),

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  requestReauth: (callback) => set({
    isReauthPending: true,
    reauthCallback: callback,
    modal: { type: 'reauth' },
  }),

  resolveReauth: () => {
    const { reauthCallback } = get();
    set({ isReauthPending: false, reauthCallback: null, modal: null });
    reauthCallback?.();
  },

  cancelReauth: () => set({
    isReauthPending: false,
    reauthCallback: null,
    modal: null,
  }),

  setTheme: (theme) => {
    set({ theme });
    const root = document.documentElement;
    let isDark = theme === 'dark';
    if (theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    localStorage.setItem('fortress-theme', theme);
  },

  setActivePanel: (panel) => set({ activePanel: panel }),
}));
