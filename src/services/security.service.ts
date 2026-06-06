/**
 * Security Analysis Service
 * Analyzes vault entries for security issues and computes an overall score.
 */

import type { VaultEntry, SecurityReport, ReusedPassword } from '@/types';

const WEAK_SCORE_THRESHOLD = 2;
const OLD_PASSWORD_DAYS = 90;

// ─── HIBP Breach Check (k-anonymity) ─────────────────────────────────────────

export async function checkPasswordBreached(password: string): Promise<boolean> {
  try {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });

    if (!response.ok) return false;

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [lineSuffix, count] = line.split(':');
      if (lineSuffix.trim().toUpperCase() === suffix && parseInt(count) > 0) {
        return true;
      }
    }
    return false;
  } catch {
    return false; // Fail safe — don't block on network error
  }
}

// ─── Security Analysis ────────────────────────────────────────────────────────

export function analyzeVaultSecurity(entries: VaultEntry[]): SecurityReport {
  if (!entries.length) {
    return {
      score: 100,
      weakPasswords: [],
      reusedPasswords: [],
      oldPasswords: [],
      compromisedPasswords: [],
      totalEntries: 0,
      strongCount: 0,
      fairCount: 0,
      weakCount: 0,
      veryWeakCount: 0,
      lastAnalyzedAt: Date.now(),
    };
  }

  const weakPasswords = entries.filter(e => e.strength.score <= WEAK_SCORE_THRESHOLD);
  const reusedPasswords = findReusedPasswords(entries);
  const oldPasswords = entries.filter(e => {
    const ageDays = (Date.now() - e.passwordChangedAt) / (1000 * 60 * 60 * 24);
    return ageDays > OLD_PASSWORD_DAYS;
  });

  const strongCount = entries.filter(e => e.strength.score >= 4).length;
  const fairCount = entries.filter(e => e.strength.score === 3).length;
  const weakCount = entries.filter(e => e.strength.score === 2).length;
  const veryWeakCount = entries.filter(e => e.strength.score <= 1).length;

  // Score calculation
  let score = 100;

  // Deduct for weak passwords (up to 40 points)
  const weakPct = weakPasswords.length / entries.length;
  score -= Math.round(weakPct * 40);

  // Deduct for reused passwords (up to 25 points)
  const reusedCount = reusedPasswords.reduce((acc, r) => acc + r.entries.length, 0);
  const reusedPct = Math.min(reusedCount / entries.length, 1);
  score -= Math.round(reusedPct * 25);

  // Deduct for old passwords (up to 15 points)
  const oldPct = oldPasswords.length / entries.length;
  score -= Math.round(oldPct * 15);

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    weakPasswords,
    reusedPasswords,
    oldPasswords,
    compromisedPasswords: [],
    totalEntries: entries.length,
    strongCount,
    fairCount,
    weakCount,
    veryWeakCount,
    lastAnalyzedAt: Date.now(),
  };
}

function findReusedPasswords(entries: VaultEntry[]): ReusedPassword[] {
  const passwordMap = new Map<string, VaultEntry[]>();

  for (const entry of entries) {
    if (!entry.password) continue;
    if (!passwordMap.has(entry.password)) {
      passwordMap.set(entry.password, []);
    }
    passwordMap.get(entry.password)!.push(entry);
  }

  return Array.from(passwordMap.entries())
    .filter(([, list]) => list.length > 1)
    .map(([password, entries]) => ({ password, entries }))
    .sort((a, b) => b.entries.length - a.entries.length);
}

export function getSecurityGrade(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent', color: 'text-emerald-400' };
  if (score >= 75) return { label: 'Good', color: 'text-green-400' };
  if (score >= 60) return { label: 'Fair', color: 'text-yellow-400' };
  if (score >= 40) return { label: 'Poor', color: 'text-orange-400' };
  return { label: 'Critical', color: 'text-red-400' };
}
