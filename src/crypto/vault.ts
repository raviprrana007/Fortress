/**
 * Cryptographic module — AES-GCM-256 vault encryption
 * 
 * Key derivation: PBKDF2-SHA256 (600,000 iterations — NIST 2023)
 * with optional Argon2id enhancement when available.
 * 
 * Vault blob format: base64(salt[32] || iv[12] || ciphertext || authTag[16])
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const SALT_LENGTH = 32;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 600_000;

// ─── PBKDF2 Key Derivation (Primary) ─────────────────────────────────────────

async function deriveKeyPBKDF2(
  masterPassword: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── Argon2id Enhancement (Optional — loaded dynamically) ────────────────────

let argon2Available = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let argon2Module: any = null;

async function tryLoadArgon2(): Promise<boolean> {
  if (argon2Available && argon2Module) return true;
  // argon2-browser can be loaded via CDN script tag as window.argon2
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  if (win.argon2) {
    argon2Module = win.argon2;
    argon2Available = true;
    return true;
  }
  return false;
}

async function deriveKeyArgon2(
  masterPassword: string,
  salt: Uint8Array
): Promise<CryptoKey | null> {
  if (!await tryLoadArgon2() || !argon2Module) return null;
  try {
    const result = await argon2Module.hash({
      pass: masterPassword,
      salt,
      time: 3,
      mem: 65536,
      parallelism: 4,
      hashLen: 32,
      type: argon2Module.ArgonType.Argon2id,
    });
    const hashBuf = result.hash instanceof Uint8Array
      ? result.hash.buffer as ArrayBuffer
      : result.hash as ArrayBuffer;
    return crypto.subtle.importKey(
      'raw',
      hashBuf,
      { name: 'AES-GCM', length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  } catch {
    return null;
  }
}

// ─── Unified Key Derivation ───────────────────────────────────────────────────

export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array,
  preferArgon2 = true
): Promise<{ key: CryptoKey; kdf: 'argon2id' | 'pbkdf2' }> {
  if (preferArgon2) {
    const argon2Key = await deriveKeyArgon2(masterPassword, salt);
    if (argon2Key) {
      return { key: argon2Key, kdf: 'argon2id' };
    }
  }
  const pbkdf2Key = await deriveKeyPBKDF2(masterPassword, salt);
  return { key: pbkdf2Key, kdf: 'pbkdf2' };
}

// ─── Random Bytes ─────────────────────────────────────────────────────────────

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// ─── Vault Encryption ─────────────────────────────────────────────────────────

export async function encryptVault(
  data: object,
  masterPassword: string
): Promise<{ blob: string; kdf: 'argon2id' | 'pbkdf2' }> {
  const salt = generateSalt();
  const iv = generateIV();
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));

  const { key, kdf } = await deriveKey(masterPassword, salt, true);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintext
  );

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return { blob: bufferToBase64(combined), kdf };
}

// ─── Vault Decryption ─────────────────────────────────────────────────────────

export async function decryptVault<T>(
  blob: string,
  masterPassword: string,
  kdf: 'argon2id' | 'pbkdf2' = 'pbkdf2'
): Promise<T> {
  const combined = base64ToBuffer(blob);

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  let key: CryptoKey;
  if (kdf === 'argon2id') {
    const argon2Key = await deriveKeyArgon2(masterPassword, salt);
    key = argon2Key ?? await deriveKeyPBKDF2(masterPassword, salt);
  } else {
    key = await deriveKeyPBKDF2(masterPassword, salt);
  }

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext
    );
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(plaintext)) as T;
  } catch {
    throw new Error('Incorrect master password');
  }
}

// ─── Password Verification ────────────────────────────────────────────────────

export async function hashMasterPassword(
  password: string
): Promise<{ hash: string; salt: string; usedArgon2: boolean }> {
  const salt = generateSalt();

  if (await tryLoadArgon2() && argon2Module) {
    try {
      const result = await argon2Module.hash({
        pass: password,
        salt,
        time: 2,
        mem: 32768,
        parallelism: 2,
        hashLen: 32,
        type: argon2Module.ArgonType.Argon2id,
      });
      const hashBuf = result.hash instanceof Uint8Array ? result.hash : new Uint8Array(result.hash as ArrayBuffer);
      return { hash: bufferToBase64(hashBuf), salt: bufferToBase64(salt), usedArgon2: true };
    } catch { /* fallthrough */ }
  }

  // PBKDF2 fallback
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return { hash: bufferToBase64(new Uint8Array(bits)), salt: bufferToBase64(salt), usedArgon2: false };
}

export async function verifyMasterPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
  usedArgon2: boolean
): Promise<boolean> {
  try {
    const salt = base64ToBuffer(storedSalt);

    if (usedArgon2 && await tryLoadArgon2() && argon2Module) {
      const result = await argon2Module.hash({
        pass: password,
        salt,
        time: 2,
        mem: 32768,
        parallelism: 2,
        hashLen: 32,
        type: argon2Module.ArgonType.Argon2id,
      });
      const hashBuf = result.hash instanceof Uint8Array ? result.hash : new Uint8Array(result.hash as ArrayBuffer);
      return bufferToBase64(hashBuf) === storedHash;
    }

    // PBKDF2
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100_000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return bufferToBase64(new Uint8Array(bits)) === storedHash;
  } catch {
    return false;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function bufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateSecureToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
