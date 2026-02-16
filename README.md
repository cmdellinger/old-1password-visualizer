# Old 1Password Keychain Viewer

A desktop app for browsing, searching, and decrypting old 1Password `.agilekeychain` backup files — without loading them into the 1Password app.

Built for organizing and searching through multiple old keychain backups when you need to find a specific entry but don't know which file it's in.

## Features

- **Open or drag-and-drop** `.agilekeychain` directories
- **Import** keychains to persistent app storage (copies files, survives restarts)
- **Master password unlock** with full decryption (PBKDF2-SHA1 + AES-128-CBC)
- **Search** across all entries in a keychain
- **Type-specific detail views** for WebForms, Passwords, SecureNotes, Credit Cards, Identities, Software Licenses, and more
- **Copy to clipboard** and password reveal/hide
- **Editable display names and notes** per keychain (persisted for imports)
- **Configurable storage directory** with migration support
- Dark theme

## Screenshot

Three-panel layout: Sidebar (keychains) | Item List (searchable) | Detail View (decrypted fields)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm start
```

### Build

```bash
npm run package    # creates app in out/
npm run make       # creates distributable
```

## Usage

1. Click **+ Import** to copy a `.agilekeychain` file into app storage (persists across sessions), or **Open** to view one temporarily
2. Drag and drop `.agilekeychain` files onto the window to open them temporarily
3. Click the lock icon or an entry to trigger the password prompt
4. Enter the master password to unlock and decrypt entries
5. Use the search bar or `Cmd+F` to filter entries
6. Double-click a keychain name to rename it, or use the note button to add notes

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+O` | Open keychain |
| `Cmd+F` | Focus search |
| `Escape` | Close modals / cancel editing |

## How It Works

The `.agilekeychain` format stores entries as individually encrypted JSON files inside a directory bundle:

```
1Password.agilekeychain/
└── data/
    └── default/
        ├── contents.js          # Entry index (titles, types, UUIDs)
        ├── encryptionKeys.js    # Encrypted master keys
        └── *.1password          # Individual encrypted entries
```

**Decryption is two-phase:**
1. Master password → PBKDF2-SHA1 → AES key → decrypts master key from `encryptionKeys.js`
2. Master key → EVP_BytesToKey (MD5) → AES-128-CBC → decrypts individual entries

All cryptographic operations happen in the Electron main process. The renderer is fully sandboxed (`contextIsolation: true`, `nodeIntegration: false`) and communicates via IPC. No passwords or decrypted keys are ever stored to disk.

## Security Notes

- **No persistence of secrets** — master passwords and decrypted keys exist only in memory and are zeroed on lock
- **Original files untouched** — imports copy files; originals are never modified
- **Sandboxed renderer** — no direct access to filesystem or crypto from the UI
- **No network access** — the app makes no network requests

## Tech Stack

- Electron Forge + Vite
- TypeScript
- React
- Node.js `crypto` (no external crypto libraries)
- Plain CSS with custom properties

## License

MIT
