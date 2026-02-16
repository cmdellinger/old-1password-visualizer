export interface KeychainMeta {
  id: string;
  name: string;
  displayName: string;
  path: string;
  isUnlocked: boolean;
  itemCount: number;
  fileCreated: string;
  fileModified: string;
  notes: string;
  importId?: string;
}

export interface EncryptionKeyEntry {
  identifier: string;
  level: string;
  data: string;
  validation: string;
  iterations: number;
}

export interface ContentsEntry {
  uuid: string;
  typeName: string;
  title: string;
  location: string;
  updatedAt: number;
  folderUuid: string;
  trashed: boolean;
}

export interface RawItem {
  uuid: string;
  typeName: string;
  title: string;
  location: string;
  locationKey: string;
  createdAt: number;
  updatedAt: number;
  encrypted: string;
  securityLevel: string;
  trashed: boolean;
}

export interface DecryptedItem {
  uuid: string;
  typeName: string;
  title: string;
  location: string;
  createdAt: number;
  updatedAt: number;
  securityLevel: string;
  trashed: boolean;
  decrypted: Record<string, unknown>;
  fields?: WebFormField[];
}

export interface WebFormField {
  name: string;
  value: string;
  type: string;
  designation: string;
}

export interface KeychainLoadResult {
  id: string;
  name: string;
  itemCount: number;
  items: ContentsEntry[];
  filePath: string;
  fileCreated: string;
  fileModified: string;
  importId?: string;
}

export interface ImportedKeychainInfo {
  importId: string;
  keychainPath: string;
  metadata: {
    displayName: string;
    notes: string;
    importedAt: string;
    originalPath: string;
  };
}

export interface ElectronAPI {
  openKeychainDialog: () => Promise<string | null>;
  loadKeychain: (path: string) => Promise<KeychainLoadResult>;
  unlockKeychain: (id: string, password: string) => Promise<boolean>;
  decryptItem: (keychainId: string, uuid: string) => Promise<DecryptedItem>;
  lockKeychain: (id: string) => Promise<void>;
  removeKeychain: (id: string, importId?: string) => Promise<void>;
  importKeychain: (sourcePath: string) => Promise<KeychainLoadResult>;
  listImportedKeychains: () => Promise<ImportedKeychainInfo[]>;
  saveKeychainMetadata: (importId: string, meta: { displayName?: string; notes?: string }) => Promise<void>;
  getSettings: () => Promise<{ storageDir: string; defaultStorageDir: string }>;
  pickDirectory: () => Promise<string | null>;
  setStorageDir: (newPath: string, moveContents: boolean) => Promise<void>;
  getPathForFile: (file: File) => string;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
