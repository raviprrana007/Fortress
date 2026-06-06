/**
 * Auth Store — manages authentication state, session, and account.
 * Sensitive data (master password) is NEVER stored here.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthAccount } from '@/types';
import {
  createAccount as createAccountService,
  getAccount,
  updateAccount,
  createSession,
  destroySession,
  hasActiveSession,
  isAccountLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  verifyPassword,
} from '@/services/auth.service';
import {
  initializeVault,
  unlockVault,
  persistVault,
} from '@/services/vault.service';
import { useVaultStore } from './vault.store';
import { activityLogRepository } from '@/db/repository';
import { v4 as uuidv4 } from 'uuid';

// ─── Stored Auth Data (persisted in localStorage — no sensitive data) ─────────

interface StoredAuthData {
  passwordHash: string;
  passwordSalt: string;
  usedArgon2: boolean;
}

interface AuthState {
  account: AuthAccount | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  isLoading: boolean;
  error: string | null;
  // Stored separately from account for lookup
  _authData: StoredAuthData | null;
}

interface AuthActions {
  signup: (email: string, displayName: string, masterPassword: string) => Promise<void>;
  login: (masterPassword: string) => Promise<void>;
  logout: () => void;
  lockVault: () => void;
  unlockWithPassword: (masterPassword: string) => Promise<boolean>;
  loadAccount: () => Promise<void>;
  updateAccount: (updates: Partial<AuthAccount>) => Promise<void>;
  clearError: () => void;
  setMasterPassword: (password: string) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      account: null,
      isAuthenticated: false,
      isLocked: false,
      isLoading: false,
      error: null,
      _authData: null,

      signup: async (email, displayName, masterPassword) => {
        set({ isLoading: true, error: null });
        try {
          const { account, passwordHash, passwordSalt, usedArgon2 } =
            await createAccountService(email, displayName, masterPassword);

          await initializeVault(masterPassword);

          set({
            account,
            isAuthenticated: false,
            _authData: { passwordHash, passwordSalt, usedArgon2 },
          });

          await activityLogRepository.add({
            id: uuidv4(),
            action: 'vault_unlocked',
            timestamp: Date.now(),
          });
        } catch (err) {
          set({ error: (err as Error).message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (masterPassword) => {
        set({ isLoading: true, error: null });
        try {
          const locked = await isAccountLocked();
          if (locked) {
            const account = await getAccount();
            const lockedUntil = account?.lockedUntil;
            const waitMs = lockedUntil ? lockedUntil - Date.now() : 30000;
            const waitSec = Math.ceil(waitMs / 1000);
            throw new Error(`Account locked. Try again in ${waitSec} seconds.`);
          }

          const { _authData } = get();
          if (!_authData) throw new Error('No account found. Please sign up first.');

          const valid = await verifyPassword(
            masterPassword,
            _authData.passwordHash,
            _authData.passwordSalt,
            _authData.usedArgon2
          );

          if (!valid) {
            const { attemptsLeft } = await recordFailedAttempt();
            throw new Error(
              attemptsLeft > 0
                ? `Incorrect password. ${attemptsLeft} attempts remaining.`
                : 'Account locked due to too many failed attempts.'
            );
          }

          await clearFailedAttempts();

          // Unlock the vault into memory
          const vaultData = await unlockVault(masterPassword);
          useVaultStore.getState().loadEntries(vaultData.entries, masterPassword);

          createSession();

          const account = await getAccount();
          set({ account, isAuthenticated: true, isLocked: false, error: null });

          await activityLogRepository.add({
            id: uuidv4(),
            action: 'vault_unlocked',
            timestamp: Date.now(),
          });
        } catch (err) {
          set({ error: (err as Error).message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      unlockWithPassword: async (masterPassword) => {
        const { _authData } = get();
        if (!_authData) return false;

        const valid = await verifyPassword(
          masterPassword,
          _authData.passwordHash,
          _authData.passwordSalt,
          _authData.usedArgon2
        );

        if (valid) {
          const vaultData = await unlockVault(masterPassword);
          useVaultStore.getState().loadEntries(vaultData.entries, masterPassword);
          set({ isLocked: false, isAuthenticated: true });

          await activityLogRepository.add({
            id: uuidv4(),
            action: 'vault_unlocked',
            timestamp: Date.now(),
          });
        }
        return valid;
      },

      logout: () => {
        destroySession();
        useVaultStore.getState().clearVault();
        set({ isAuthenticated: false, isLocked: false, account: null, error: null });
      },

      lockVault: () => {
        useVaultStore.getState().clearVault();
        set({ isAuthenticated: false, isLocked: true });
        activityLogRepository.add({
          id: uuidv4(),
          action: 'vault_locked',
          timestamp: Date.now(),
        });
      },

      loadAccount: async () => {
        const account = await getAccount();
        set({ account });
      },

      updateAccount: async (updates) => {
        const updated = await updateAccount(updates);
        set({ account: updated });
      },

      setMasterPassword: () => {
        // intentionally empty — master password is never stored in state
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'fortress-auth',
      partialize: (state) => ({
        _authData: state._authData,
        isLocked: state.isLocked,
      }),
    }
  )
);
