import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  openKeychainDialog: () => ipcRenderer.invoke('keychain:open-dialog'),
  loadKeychain: (path: string) => ipcRenderer.invoke('keychain:load-metadata', path),
  unlockKeychain: (id: string, password: string) => ipcRenderer.invoke('keychain:unlock', id, password),
  decryptItem: (keychainId: string, uuid: string) => ipcRenderer.invoke('keychain:decrypt-item', keychainId, uuid),
  lockKeychain: (id: string) => ipcRenderer.invoke('keychain:lock', id),
  removeKeychain: (id: string, importId?: string) => ipcRenderer.invoke('keychain:remove', id, importId),
  importKeychain: (sourcePath: string) => ipcRenderer.invoke('keychain:import', sourcePath),
  listImportedKeychains: () => ipcRenderer.invoke('keychain:list-imported'),
  saveKeychainMetadata: (importId: string, meta: { displayName?: string; notes?: string }) => ipcRenderer.invoke('keychain:save-metadata', importId, meta),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  pickDirectory: () => ipcRenderer.invoke('settings:pick-directory'),
  setStorageDir: (newPath: string, moveContents: boolean) => ipcRenderer.invoke('settings:set-storage-dir', newPath, moveContents),
});
