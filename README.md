# 🔐 Fortress — Enterprise Password Manager

A production-grade, commercially deployable password manager with **zero-knowledge architecture**, **AES-256-GCM encryption**, and a premium enterprise UX inspired by 1Password, Linear, and Stripe.

---

## ✨ Features

### 🔒 Security-First Architecture
- **AES-256-GCM** encryption for all vault data
- **Argon2id** key derivation (64MB memory, 3 iterations) with PBKDF2-SHA256 fallback
- **Zero plaintext storage** — decrypted vault lives only in memory
- **Zero-knowledge** — master password never stored or transmitted
- Random 32-byte salt + 96-bit IV per encryption operation
- Clipboard auto-clear after 30 seconds
- Auto-lock on idle (configurable 1min–1hr)

### 🗄️ Vault Management
- Add, edit, delete vault entries with full metadata
- Categories: Login, Card, Identity, Note, SSH Key, API Key, Banking, Crypto
- Custom fields, tags, favorites, notes
- Fuzzy search (Fuse.js) across all fields
- Sort by name, date, strength, last accessed
- List and grid view modes
- Favicon auto-fetching for websites

### 🔑 Password Generator
- **Password mode**: configurable length (8–128), character sets
- **Passphrase mode**: word list-based, separator control
- **PIN mode**: numeric codes
- Entropy analysis (bits)
- Crack time estimation
- Ambiguous character exclusion (0, O, l, I)

### 🛡️ Security Dashboard
- Overall vault security score (0–100)
- Weak password detection and listing
- Reused password detection
- Old password tracking (90+ days)
- **HIBP breach checking** via k-anonymity API
- Security grade (Excellent/Good/Fair/Poor/Critical)

### 🔍 Activity Log
- Complete 90-day audit trail
- Tracks: unlock, lock, create, update, delete, copy, reveal, export, import
- Grouped by date with time display
- Searchable and filterable

### 📤 Import / Export
- **Export**: Fortress JSON, CSV, Bitwarden JSON
- **Import**: Fortress JSON, Bitwarden JSON, LastPass CSV, 1Password CSV, Chrome CSV, Generic CSV
- Drag-and-drop import interface
- Duplicate detection and skipping

### 🌐 PWA & Offline
- Installable Progressive Web App
- Full offline vault access
- Service worker (Workbox)
- Works without internet connection

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Command palette |
| `Ctrl/Cmd + N` | New entry |
| `Escape` | Close modal |
| `Ctrl/Cmd + Shift + L` | Lock vault |

### 🎨 Premium UX
- Dark mode by default with light/system options
- Glass morphism design language
- Framer Motion animations throughout
- Radix UI accessible primitives
- Command palette (Cmd+K)
- Toast notifications
- Responsive layout

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
```bash
git clone <repo>
cd "Password manager"
npm install
```

### Development
```bash
npm run dev
```
Open http://localhost:5173

### Production Build
```bash
npm run build
npm run preview
```

---

## 🏗️ Architecture

```
src/
├── crypto/         # AES-GCM, Argon2id, Generator, WebAuthn
├── db/             # IndexedDB repository layer (idb)
├── store/          # Zustand state management
│   ├── auth.store  # Auth, session, brute-force protection
│   ├── vault.store # In-memory decrypted vault + Fuse search
│   ├── ui.store    # Modals, toasts, panels
├── services/       # Business logic
│   ├── auth.service
│   ├── vault.service
│   ├── security.service  # HIBP, score analysis
│   └── import-export.service
├── components/
│   ├── ui/         # Design system (Button, Input, Modal, Toast, Command)
│   ├── vault/      # Entry list, detail, forms, import/export
│   ├── generator/  # Password generator modal
│   ├── security/   # Dashboard, activity log
│   ├── auth/       # Login, signup, reauth
│   ├── settings/   # Settings panel
│   └── layout/     # Sidebar
├── pages/          # AuthPage, VaultPage
├── hooks/          # useAutoLock
├── types/          # TypeScript interfaces
└── utils/          # cn(), formatting, clipboard
```

---

## 🔐 Security Details

### Encryption Flow
1. User enters master password
2. `Argon2id` derives a 256-bit key from password + random salt
3. Vault entries serialized to JSON
4. `AES-GCM-256` encrypts with random 96-bit IV
5. `salt || iv || ciphertext` stored in IndexedDB as base64
6. Derived key discarded; plaintext only in Zustand memory

### Never Stored
- Master password (plaintext)
- Derived encryption key
- Decrypted vault data (persisted)

### Brute-force Protection
- 5 attempt limit before lockout
- Exponential backoff (30s → 60s → 120s → ... → 1hr max)
- Lockout persisted across sessions

---

## 📦 Tech Stack

| Category | Library |
|----------|---------|
| Frontend | React 18 + TypeScript |
| Build | Vite 5 + vite-plugin-pwa |
| Styling | Tailwind CSS v3 |
| Animations | Framer Motion |
| UI Primitives | Radix UI |
| State | Zustand |
| Crypto | Web Crypto API + argon2-browser |
| Database | IndexedDB (idb) |
| Search | Fuse.js |
| Commands | cmdk |

---

## 📄 License

MIT — See LICENSE file for details.

Built as a production-quality reference implementation of a secure, offline-first password manager.
