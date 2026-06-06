/**
 * Import/Export Service
 * Supports multiple formats: Fortress JSON, CSV, Bitwarden JSON,
 * LastPass CSV, 1Password CSV, Chrome CSV
 */

import type { VaultEntry, ImportResult, ExportFormat, ImportFormat } from '@/types';
import { createEntry } from './vault.service';
import { scorePassword } from '@/crypto/generator';

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportVault(entries: VaultEntry[], format: ExportFormat): string {
  switch (format) {
    case 'fortress-json':
      return exportFortressJson(entries);
    case 'csv':
      return exportCSV(entries);
    case 'bitwarden-json':
      return exportBitwardenJson(entries);
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

function exportFortressJson(entries: VaultEntry[]): string {
  return JSON.stringify(
    {
      version: 1,
      exported_at: new Date().toISOString(),
      app: 'Fortress Password Manager',
      entries: entries.map(e => ({ ...e })),
    },
    null,
    2
  );
}

function exportCSV(entries: VaultEntry[]): string {
  const headers = ['name', 'username', 'email', 'password', 'url', 'notes', 'category', 'tags', 'favorite'];
  const rows = entries.map(e => [
    csvEscape(e.name),
    csvEscape(e.username),
    csvEscape(e.email),
    csvEscape(e.password),
    csvEscape(e.url),
    csvEscape(e.notes),
    csvEscape(e.category),
    csvEscape(e.tags.join(';')),
    e.isFavorite ? 'true' : 'false',
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function csvEscape(value: string): string {
  if (!value) return '""';
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function exportBitwardenJson(entries: VaultEntry[]): string {
  const items = entries.map(e => ({
    id: e.id,
    organizationId: null,
    folderId: null,
    type: 1,
    reprompt: 0,
    name: e.name,
    notes: e.notes,
    favorite: e.isFavorite,
    login: {
      uris: e.url ? [{ match: null, uri: e.url }] : [],
      username: e.username || e.email,
      password: e.password,
      totp: e.twoFactorSecret || null,
    },
  }));

  return JSON.stringify({ encrypted: false, items }, null, 2);
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importVault(
  content: string,
  format: ImportFormat,
  existingEntries: VaultEntry[]
): Promise<ImportResult> {
  try {
    switch (format) {
      case 'fortress-json':
        return importFortressJson(content, existingEntries);
      case 'bitwarden-json':
        return importBitwardenJson(content, existingEntries);
      case 'csv':
      case 'chrome-csv':
        return importCSV(content, existingEntries);
      case 'lastpass-csv':
        return importLastPassCSV(content, existingEntries);
      case '1password-csv':
        return importOnePasswordCSV(content, existingEntries);
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  } catch (err) {
    return { imported: 0, skipped: 0, errors: [(err as Error).message], entries: [] };
  }
}

function importFortressJson(content: string, existing: VaultEntry[]): ImportResult {
  const data = JSON.parse(content);
  if (!data.entries || !Array.isArray(data.entries)) {
    throw new Error('Invalid Fortress JSON format');
  }

  const result: ImportResult = { imported: 0, skipped: 0, errors: [], entries: [...existing] };
  const existingIds = new Set(existing.map(e => e.id));

  for (const raw of data.entries) {
    if (existingIds.has(raw.id)) { result.skipped++; continue; }
    const entry = createEntry(raw);
    result.entries.push(entry);
    result.imported++;
  }
  return result;
}

function importBitwardenJson(content: string, existing: VaultEntry[]): ImportResult {
  const data = JSON.parse(content);
  if (!data.items || !Array.isArray(data.items)) {
    throw new Error('Invalid Bitwarden JSON format');
  }

  const result: ImportResult = { imported: 0, skipped: 0, errors: [], entries: [...existing] };

  for (const item of data.items) {
    try {
      const entry = createEntry({
        name: item.name || 'Imported Entry',
        username: item.login?.username || '',
        email: '',
        password: item.login?.password || '',
        url: item.login?.uris?.[0]?.uri || '',
        notes: item.notes || '',
        category: 'login',
        isFavorite: item.favorite || false,
        twoFactorSecret: item.login?.totp || undefined,
      });
      result.entries.push(entry);
      result.imported++;
    } catch (e) {
      result.errors.push(`Failed to import "${item.name}": ${(e as Error).message}`);
    }
  }
  return result;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

function importCSV(content: string, existing: VaultEntry[]): ImportResult {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV file is empty or has only headers');

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const result: ImportResult = { imported: 0, skipped: 0, errors: [], entries: [...existing] };

  // Chrome CSV: name,url,username,password
  // Generic: name,username,email,password,url,notes,...
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      const entry = createEntry({
        name: row.name || row.title || row.site || `Import ${i}`,
        username: row.username || row.user || row.login || '',
        email: row.email || '',
        password: row.password || row.pass || '',
        url: row.url || row.website || row.site_url || '',
        notes: row.notes || row.note || row.comment || '',
        category: 'login',
      });
      result.entries.push(entry);
      result.imported++;
    } catch (e) {
      result.errors.push(`Row ${i + 1}: ${(e as Error).message}`);
    }
  }
  return result;
}

function importLastPassCSV(content: string, existing: VaultEntry[]): ImportResult {
  // LastPass: url,username,password,extra,name,grouping,fav
  return importCSV(content, existing);
}

function importOnePasswordCSV(content: string, existing: VaultEntry[]): ImportResult {
  // 1Password: Title,Username,Password,URL,Notes,Type
  return importCSV(content, existing);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
