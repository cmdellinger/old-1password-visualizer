import { ipcMain, dialog, app } from 'electron';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  validateKeychainPath,
  readContents,
  readEncryptionKeys,
  readItem,
  type EncryptionKeysData,
  type ContentsEntry,
} from '../lib/keychain-reader';
import { unlockKeychain, decryptItemData } from '../lib/decryptor';
import { parseWebFormFields } from '../lib/item-parser';

interface KeychainState {
  id: string;
  name: string;
  path: string;
  contents: ContentsEntry[];
  encryptionKeys: EncryptionKeysData;
  decryptedKeys: Map<string, Buffer> | null;
  importId?: string;
}

interface StoredMetadata {
  displayName: string;
  notes: string;
  importedAt: string;
  originalPath: string;
}

interface AppSettings {
  storageDir?: string;
}

const keychainStore = new Map<string, KeychainState>();

// --- Settings helpers ---

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeSettings(settings: AppSettings): Promise<void> {
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}

function getDefaultStorageDir(): string {
  return path.join(app.getPath('userData'), 'keychains');
}

// Cache settings in memory to avoid async reads on every call
let cachedStorageDir: string | null = null;

async function getStorageDir(): Promise<string> {
  if (cachedStorageDir) return cachedStorageDir;
  const settings = await readSettings();
  cachedStorageDir = settings.storageDir || getDefaultStorageDir();
  return cachedStorageDir;
}

async function ensureStorageDir(): Promise<string> {
  const dir = await getStorageDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

// --- Metadata helpers ---

async function readMetadataFile(importId: string): Promise<StoredMetadata> {
  const storageDir = await getStorageDir();
  const metaPath = path.join(storageDir, importId, 'metadata.json');
  const raw = await fs.readFile(metaPath, 'utf-8');
  return JSON.parse(raw);
}

async function writeMetadataFile(importId: string, meta: StoredMetadata): Promise<void> {
  const storageDir = await getStorageDir();
  const metaPath = path.join(storageDir, importId, 'metadata.json');
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

// --- File copy helper ---

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// --- Keychain loading ---

async function loadKeychainInternal(dirPath: string, importId?: string) {
  const valid = await validateKeychainPath(dirPath);
  if (!valid) {
    throw new Error('Not a valid .agilekeychain directory. Make sure the path ends with .agilekeychain and contains data/default/contents.js');
  }

  const contents = await readContents(dirPath);
  const encKeys = await readEncryptionKeys(dirPath);
  const id = crypto.randomUUID();
  const name = path.basename(dirPath, '.agilekeychain');
  const stat = await fs.stat(dirPath);

  keychainStore.set(id, {
    id,
    name,
    path: dirPath,
    contents,
    encryptionKeys: encKeys,
    decryptedKeys: null,
    importId,
  });

  return {
    id,
    name,
    itemCount: contents.length,
    items: contents,
    filePath: dirPath,
    fileCreated: stat.birthtime.toISOString(),
    fileModified: stat.mtime.toISOString(),
    importId,
  };
}

// --- IPC Registration ---

export function registerIpcHandlers(): void {
  // --- Keychain handlers ---

  ipcMain.handle('keychain:open-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'AgileKeychain', extensions: ['agilekeychain'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      message: 'Select a .agilekeychain file',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('keychain:load-metadata', async (_event, dirPath: string) => {
    // Normalize: strip trailing slashes that macOS may add for packages
    const normalized = dirPath.replace(/\/+$/, '');
    return loadKeychainInternal(normalized);
  });

  ipcMain.handle('keychain:import', async (_event, sourcePath: string) => {
    const valid = await validateKeychainPath(sourcePath);
    if (!valid) {
      throw new Error('Not a valid .agilekeychain directory.');
    }

    const storageDir = await ensureStorageDir();
    const importId = crypto.randomUUID();
    const importDir = path.join(storageDir, importId);
    await fs.mkdir(importDir, { recursive: true });

    const keychainBasename = path.basename(sourcePath);
    const destKeychainPath = path.join(importDir, keychainBasename);
    await copyDir(sourcePath, destKeychainPath);

    const name = path.basename(sourcePath, '.agilekeychain');
    const meta: StoredMetadata = {
      displayName: name,
      notes: '',
      importedAt: new Date().toISOString(),
      originalPath: sourcePath,
    };
    await writeMetadataFile(importId, meta);

    return loadKeychainInternal(destKeychainPath, importId);
  });

  ipcMain.handle('keychain:list-imported', async () => {
    const storageDir = await getStorageDir();
    try {
      await fs.access(storageDir);
    } catch {
      return [];
    }

    const entries = await fs.readdir(storageDir, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const importId = entry.name;
      try {
        const meta = await readMetadataFile(importId);
        const subEntries = await fs.readdir(path.join(storageDir, importId));
        const keychainDir = subEntries.find(e => e.endsWith('.agilekeychain'));
        if (!keychainDir) continue;

        results.push({
          importId,
          keychainPath: path.join(storageDir, importId, keychainDir),
          metadata: meta,
        });
      } catch {
        continue;
      }
    }

    return results;
  });

  ipcMain.handle('keychain:save-metadata', async (_event, importId: string, updates: { displayName?: string; notes?: string }) => {
    const meta = await readMetadataFile(importId);
    if (updates.displayName !== undefined) meta.displayName = updates.displayName;
    if (updates.notes !== undefined) meta.notes = updates.notes;
    await writeMetadataFile(importId, meta);
  });

  ipcMain.handle('keychain:unlock', async (_event, keychainId: string, masterPassword: string) => {
    const kc = keychainStore.get(keychainId);
    if (!kc) throw new Error('Keychain not found');

    const keys = unlockKeychain(masterPassword, kc.encryptionKeys);
    kc.decryptedKeys = keys;
    return true;
  });

  ipcMain.handle('keychain:decrypt-item', async (_event, keychainId: string, uuid: string) => {
    const kc = keychainStore.get(keychainId);
    if (!kc) throw new Error('Keychain not found');
    if (!kc.decryptedKeys) throw new Error('Keychain is locked');

    const rawItem = await readItem(kc.path, uuid);
    const level = rawItem.securityLevel || 'SL5';

    let masterKey = kc.decryptedKeys.get(level);
    if (!masterKey) {
      const firstKey = kc.decryptedKeys.values().next().value;
      if (!firstKey) throw new Error(`No decryption key available for level ${level}`);
      masterKey = firstKey;
    }

    let decrypted: Record<string, unknown>;
    let fields;

    try {
      const decryptedJson = decryptItemData(rawItem.encrypted, masterKey);
      decrypted = JSON.parse(decryptedJson);

      if (rawItem.typeName.startsWith('webforms.')) {
        fields = parseWebFormFields(decrypted);
      }
    } catch (err) {
      decrypted = { _error: `Failed to decrypt: ${(err as Error).message}` };
    }

    return {
      uuid: rawItem.uuid,
      typeName: rawItem.typeName,
      title: rawItem.title,
      location: rawItem.location,
      createdAt: rawItem.createdAt,
      updatedAt: rawItem.updatedAt,
      securityLevel: rawItem.securityLevel,
      trashed: rawItem.trashed,
      decrypted,
      fields,
    };
  });

  ipcMain.handle('keychain:lock', async (_event, keychainId: string) => {
    const kc = keychainStore.get(keychainId);
    if (kc) {
      if (kc.decryptedKeys) {
        for (const buf of kc.decryptedKeys.values()) {
          buf.fill(0);
        }
      }
      kc.decryptedKeys = null;
    }
  });

  ipcMain.handle('keychain:remove', async (_event, keychainId: string, importId?: string) => {
    const kc = keychainStore.get(keychainId);
    if (kc?.decryptedKeys) {
      for (const buf of kc.decryptedKeys.values()) {
        buf.fill(0);
      }
    }
    keychainStore.delete(keychainId);

    if (importId) {
      const storageDir = await getStorageDir();
      const importDir = path.join(storageDir, importId);
      try {
        await fs.rm(importDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // --- Settings handlers ---

  ipcMain.handle('settings:get', async () => {
    const storageDir = await getStorageDir();
    return {
      storageDir,
      defaultStorageDir: getDefaultStorageDir(),
    };
  });

  ipcMain.handle('settings:pick-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      message: 'Choose storage directory for imported keychains',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('settings:set-storage-dir', async (_event, newPath: string, moveContents: boolean) => {
    const oldDir = await getStorageDir();

    if (oldDir === newPath) return;

    // Ensure new directory exists
    await fs.mkdir(newPath, { recursive: true });

    if (moveContents) {
      // Move all subdirectories from old to new
      try {
        const entries = await fs.readdir(oldDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const srcDir = path.join(oldDir, entry.name);
          const destDir = path.join(newPath, entry.name);
          // Check if destination already exists
          try {
            await fs.access(destDir);
            // Already exists at destination, skip
            continue;
          } catch {
            // Doesn't exist, proceed with copy
          }
          await copyDir(srcDir, destDir);
          await fs.rm(srcDir, { recursive: true, force: true });
        }
      } catch {
        // Old directory might not exist, that's fine
      }
    }

    // Update settings
    const settings = await readSettings();
    // If setting back to default, remove the key entirely
    if (newPath === getDefaultStorageDir()) {
      delete settings.storageDir;
    } else {
      settings.storageDir = newPath;
    }
    await writeSettings(settings);

    // Update cache
    cachedStorageDir = newPath;
  });
}
