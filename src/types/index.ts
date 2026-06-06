// Core vault entry type
export interface VaultEntry {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  url: string;
  notes: string;
  category: EntryCategory;
  tags: string[];
  isFavorite: boolean;
  customFields: CustomField[];
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  passwordChangedAt: number;
  strength: PasswordStrength;
  twoFactorSecret?: string;
}

export type EntryCategory =
  | 'login'
  | 'card'
  | 'identity'
  | 'note'
  | 'ssh-key'
  | 'api-key'
  | 'bank'
  | 'crypto'
  | 'other';

export interface CustomField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'password' | 'url' | 'email' | 'phone';
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  entropy: number;
  crackTime: string;
  suggestions: string[];
}

// Encrypted vault blob stored in IndexedDB
export interface EncryptedVault {
  id: string; // always 'primary'
  blob: string; // base64(salt || iv || ciphertext)
  algorithm: 'AES-GCM-256';
  kdf: 'argon2id' | 'pbkdf2';
  version: number;
  createdAt: number;
  updatedAt: number;
}

// Auth types
export interface AuthAccount {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string;
  createdAt: number;
  hasWebAuthn: boolean;
  webAuthnCredentialId?: string;
  failedAttempts: number;
  lockedUntil?: number;
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  autoLockTimeout: number; // minutes, 0 = never
  clipboardClearTimeout: number; // seconds
  defaultGeneratorLength: number;
  defaultGeneratorOptions: GeneratorOptions;
  requireReauthForReveal: boolean;
  requireReauthForCopy: boolean;
  requireReauthForExport: boolean;
  language: string;
  twoFactorEnabled: boolean;
}

export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  customSymbols: string;
  mode: 'password' | 'passphrase' | 'pin';
  passphraseWords: number;
  passphraseSeparator: string;
  passphraseCapitalize: boolean;
}

// Activity log
export interface ActivityLog {
  id: string;
  action: ActivityAction;
  entryId?: string;
  entryName?: string;
  timestamp: number;
  metadata?: Record<string, string>;
}

export type ActivityAction =
  | 'vault_unlocked'
  | 'vault_locked'
  | 'entry_created'
  | 'entry_updated'
  | 'entry_deleted'
  | 'entry_viewed'
  | 'password_copied'
  | 'password_revealed'
  | 'password_generated'
  | 'vault_exported'
  | 'vault_imported'
  | 'settings_changed'
  | 'biometric_enrolled'
  | 'biometric_authenticated';

// Security analysis
export interface SecurityReport {
  score: number; // 0-100
  weakPasswords: VaultEntry[];
  reusedPasswords: ReusedPassword[];
  oldPasswords: VaultEntry[];
  compromisedPasswords: string[]; // entry IDs
  totalEntries: number;
  strongCount: number;
  fairCount: number;
  weakCount: number;
  veryWeakCount: number;
  lastAnalyzedAt: number;
}

export interface ReusedPassword {
  password: string;
  entries: VaultEntry[];
}

// Import/Export
export type ExportFormat = 'fortress-json' | 'csv' | 'bitwarden-json';
export type ImportFormat = 'fortress-json' | 'csv' | 'bitwarden-json' | 'lastpass-csv' | '1password-csv' | 'chrome-csv' | 'keepass-xml';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  entries: VaultEntry[];
}

// UI types
export type ModalType =
  | 'add-entry'
  | 'edit-entry'
  | 'delete-entry'
  | 'view-entry'
  | 'generator'
  | 'import'
  | 'export'
  | 'settings'
  | 'reauth'
  | 'change-master-password'
  | 'bulk-delete'
  | 'onboarding';

export interface ModalState {
  type: ModalType;
  props?: Record<string, unknown>;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

export type SortField = 'name' | 'updatedAt' | 'createdAt' | 'strength' | 'lastAccessedAt';
export type SortDirection = 'asc' | 'desc';

export interface VaultFilter {
  search: string;
  category: EntryCategory | 'all';
  tag: string | null;
  showFavoritesOnly: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
}
