/**
 * Auth Service — manages account creation, authentication,
 * vault initialization, session handling, and brute-force protection.
 */

import { v4 as uuidv4 } from 'uuid';
import { hashMasterPassword, verifyMasterPassword, generateSecureToken } from '@/crypto/vault';
import { accountRepository } from '@/db/repository';
import type { AuthAccount, UserSettings } from '@/types';
import { DEFAULT_GENERATOR_OPTIONS } from '@/crypto/generator';

const SESSION_KEY = 'fortress_session';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_BASE_MS = 30_000; // 30s base, doubles each time

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  autoLockTimeout: 15,
  clipboardClearTimeout: 30,
  defaultGeneratorLength: 20,
  defaultGeneratorOptions: DEFAULT_GENERATOR_OPTIONS,
  requireReauthForReveal: true,
  requireReauthForCopy: false,
  requireReauthForExport: true,
  language: 'en',
  twoFactorEnabled: false,
};

const AVATAR_COLORS = [
  'hsl(220, 75%, 52%)', 'hsl(270, 75%, 52%)', 'hsl(340, 75%, 52%)',
  'hsl(10, 75%, 52%)', 'hsl(160, 75%, 42%)', 'hsl(195, 75%, 42%)',
];

// ─── Account Management ───────────────────────────────────────────────────────

export async function createAccount(
  email: string,
  displayName: string,
  masterPassword: string
): Promise<{ account: AuthAccount; passwordHash: string; passwordSalt: string; usedArgon2: boolean }> {
  const existing = await accountRepository.exists();
  if (existing) throw new Error('An account already exists on this device');

  const { hash, salt, usedArgon2 } = await hashMasterPassword(masterPassword);

  const account: AuthAccount = {
    id: uuidv4(),
    email,
    displayName,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    createdAt: Date.now(),
    hasWebAuthn: false,
    failedAttempts: 0,
    settings: DEFAULT_SETTINGS,
  };

  await accountRepository.save(account);
  return { account, passwordHash: hash, passwordSalt: salt, usedArgon2 };
}

export async function getAccount(): Promise<AuthAccount | null> {
  return (await accountRepository.get()) ?? null;
}

export async function updateAccount(updates: Partial<AuthAccount>): Promise<AuthAccount> {
  const account = await accountRepository.get();
  if (!account) throw new Error('No account found');
  const updated = { ...account, ...updates };
  await accountRepository.save(updated);
  return updated;
}

// ─── Brute-force Protection ───────────────────────────────────────────────────

export async function recordFailedAttempt(): Promise<{ attemptsLeft: number; lockedUntil?: number }> {
  const account = await accountRepository.get();
  if (!account) return { attemptsLeft: MAX_FAILED_ATTEMPTS };

  const attempts = account.failedAttempts + 1;
  let lockedUntil: number | undefined;

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutMs = LOCKOUT_BASE_MS * Math.pow(2, attempts - MAX_FAILED_ATTEMPTS);
    lockedUntil = Date.now() + Math.min(lockoutMs, 3_600_000); // max 1 hour
  }

  await accountRepository.save({ ...account, failedAttempts: attempts, lockedUntil });
  return { attemptsLeft: MAX_FAILED_ATTEMPTS - attempts, lockedUntil };
}

export async function clearFailedAttempts(): Promise<void> {
  const account = await accountRepository.get();
  if (!account) return;
  await accountRepository.save({ ...account, failedAttempts: 0, lockedUntil: undefined });
}

export async function isAccountLocked(): Promise<boolean> {
  const account = await accountRepository.get();
  if (!account?.lockedUntil) return false;
  if (Date.now() > account.lockedUntil) {
    // Auto-unlock after lockout expires
    await accountRepository.save({ ...account, lockedUntil: undefined, failedAttempts: 0 });
    return false;
  }
  return true;
}

// ─── Session Management ───────────────────────────────────────────────────────

export function createSession(): string {
  const token = generateSecureToken();
  sessionStorage.setItem(SESSION_KEY, token);
  return token;
}

export function getSession(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function destroySession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function hasActiveSession(): boolean {
  return !!getSession();
}

// ─── Password Verification Wrapper ───────────────────────────────────────────

export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
  usedArgon2: boolean
): Promise<boolean> {
  return verifyMasterPassword(password, storedHash, storedSalt, usedArgon2);
}
