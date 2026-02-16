import { useReducer, useCallback } from 'react';
import type { KeychainMeta, ContentsEntry, DecryptedItem } from '../types';

export interface KeychainData extends KeychainMeta {
  items: ContentsEntry[];
}

interface State {
  keychains: KeychainData[];
  selectedKeychainId: string | null;
  selectedItemUuid: string | null;
  decryptedItemCache: Record<string, DecryptedItem>;
  passwordPromptTarget: string | null;
  searchQuery: string;
  error: string | null;
  loading: boolean;
}

type Action =
  | { type: 'ADD_KEYCHAIN'; payload: KeychainData }
  | { type: 'UNLOCK_KEYCHAIN'; payload: string }
  | { type: 'LOCK_KEYCHAIN'; payload: string }
  | { type: 'SELECT_KEYCHAIN'; payload: string | null }
  | { type: 'SELECT_ITEM'; payload: string | null }
  | { type: 'CACHE_DECRYPTED'; payload: { uuid: string; data: DecryptedItem } }
  | { type: 'REMOVE_KEYCHAIN'; payload: string }
  | { type: 'SHOW_PASSWORD_PROMPT'; payload: string | null }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_CACHE_FOR_KEYCHAIN'; payload: string }
  | { type: 'UPDATE_KEYCHAIN'; payload: { id: string; displayName?: string; notes?: string } };

const initialState: State = {
  keychains: [],
  selectedKeychainId: null,
  selectedItemUuid: null,
  decryptedItemCache: {},
  passwordPromptTarget: null,
  searchQuery: '',
  error: null,
  loading: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_KEYCHAIN': {
      // Prevent duplicate imports
      if (action.payload.importId) {
        const existing = state.keychains.find(
          kc => kc.importId === action.payload.importId
        );
        if (existing) return state;
      }
      return {
        ...state,
        keychains: [...state.keychains, action.payload],
        selectedKeychainId: action.payload.id,
        error: null,
      };
    }
    case 'UNLOCK_KEYCHAIN':
      return {
        ...state,
        keychains: state.keychains.map(kc =>
          kc.id === action.payload ? { ...kc, isUnlocked: true } : kc
        ),
        passwordPromptTarget: null,
      };
    case 'LOCK_KEYCHAIN': {
      const keychainItems = state.keychains.find(kc => kc.id === action.payload)?.items ?? [];
      const uuids = new Set(keychainItems.map(i => i.uuid));
      const newCache = { ...state.decryptedItemCache };
      for (const uuid of uuids) {
        delete newCache[uuid];
      }
      return {
        ...state,
        keychains: state.keychains.map(kc =>
          kc.id === action.payload ? { ...kc, isUnlocked: false } : kc
        ),
        decryptedItemCache: newCache,
        selectedItemUuid: state.selectedKeychainId === action.payload ? null : state.selectedItemUuid,
      };
    }
    case 'SELECT_KEYCHAIN':
      return { ...state, selectedKeychainId: action.payload, selectedItemUuid: null };
    case 'SELECT_ITEM':
      return { ...state, selectedItemUuid: action.payload };
    case 'CACHE_DECRYPTED':
      return {
        ...state,
        decryptedItemCache: {
          ...state.decryptedItemCache,
          [action.payload.uuid]: action.payload.data,
        },
        loading: false,
      };
    case 'REMOVE_KEYCHAIN': {
      const remaining = state.keychains.filter(kc => kc.id !== action.payload);
      return {
        ...state,
        keychains: remaining,
        selectedKeychainId: state.selectedKeychainId === action.payload
          ? (remaining[0]?.id ?? null)
          : state.selectedKeychainId,
        selectedItemUuid: state.selectedKeychainId === action.payload ? null : state.selectedItemUuid,
      };
    }
    case 'SHOW_PASSWORD_PROMPT':
      return { ...state, passwordPromptTarget: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'CLEAR_CACHE_FOR_KEYCHAIN': {
      const items = state.keychains.find(kc => kc.id === action.payload)?.items ?? [];
      const ids = new Set(items.map(i => i.uuid));
      const cache = { ...state.decryptedItemCache };
      for (const id of ids) delete cache[id];
      return { ...state, decryptedItemCache: cache };
    }
    case 'UPDATE_KEYCHAIN':
      return {
        ...state,
        keychains: state.keychains.map(kc =>
          kc.id === action.payload.id
            ? {
                ...kc,
                ...(action.payload.displayName !== undefined && { displayName: action.payload.displayName }),
                ...(action.payload.notes !== undefined && { notes: action.payload.notes }),
              }
            : kc
        ),
      };
    default:
      return state;
  }
}

function buildKeychainPayload(
  result: Awaited<ReturnType<typeof window.api.loadKeychain>>,
  dirPath: string,
  overrides?: { displayName?: string; notes?: string; importId?: string },
): KeychainData {
  return {
    id: result.id,
    name: result.name,
    displayName: overrides?.displayName || result.name,
    path: dirPath,
    isUnlocked: false,
    itemCount: result.itemCount,
    fileCreated: result.fileCreated,
    fileModified: result.fileModified,
    notes: overrides?.notes || '',
    importId: overrides?.importId ?? result.importId,
    items: result.items,
  };
}

export function useKeychains() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const openKeychain = useCallback(async () => {
    try {
      const dirPath = await window.api.openKeychainDialog();
      if (!dirPath) return;
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await window.api.loadKeychain(dirPath);
      dispatch({ type: 'ADD_KEYCHAIN', payload: buildKeychainPayload(result, dirPath) });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loadKeychainFromPath = useCallback(async (dirPath: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await window.api.loadKeychain(dirPath);
      dispatch({ type: 'ADD_KEYCHAIN', payload: buildKeychainPayload(result, dirPath) });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const importKeychain = useCallback(async () => {
    try {
      const dirPath = await window.api.openKeychainDialog();
      if (!dirPath) return;
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await window.api.importKeychain(dirPath);
      dispatch({ type: 'ADD_KEYCHAIN', payload: buildKeychainPayload(result, result.filePath) });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loadImportedKeychains = useCallback(async () => {
    try {
      const imported = await window.api.listImportedKeychains();
      for (const entry of imported) {
        try {
          const result = await window.api.loadKeychain(entry.keychainPath);
          const payload = buildKeychainPayload(result, entry.keychainPath, {
            displayName: entry.metadata.displayName,
            notes: entry.metadata.notes,
            importId: entry.importId,
          });
          dispatch({ type: 'ADD_KEYCHAIN', payload });
        } catch {
          // Skip keychains that fail to load
        }
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
    }
  }, []);

  const unlockKeychain = useCallback(async (id: string, password: string) => {
    await window.api.unlockKeychain(id, password);
    dispatch({ type: 'UNLOCK_KEYCHAIN', payload: id });
    return true;
  }, []);

  const lockKeychain = useCallback(async (id: string) => {
    await window.api.lockKeychain(id);
    dispatch({ type: 'LOCK_KEYCHAIN', payload: id });
  }, []);

  const removeKeychain = useCallback(async (id: string) => {
    const kc = state.keychains.find(k => k.id === id);
    await window.api.removeKeychain(id, kc?.importId);
    dispatch({ type: 'REMOVE_KEYCHAIN', payload: id });
  }, [state.keychains]);

  const updateKeychain = useCallback((id: string, updates: { displayName?: string; notes?: string }) => {
    dispatch({ type: 'UPDATE_KEYCHAIN', payload: { id, ...updates } });

    // Persist to disk for imported keychains
    const kc = state.keychains.find(k => k.id === id);
    if (kc?.importId) {
      window.api.saveKeychainMetadata(kc.importId, updates).catch(() => {
        // Silently ignore save errors
      });
    }
  }, [state.keychains]);

  const selectItem = useCallback(async (keychainId: string, uuid: string) => {
    dispatch({ type: 'SELECT_ITEM', payload: uuid });

    if (state.decryptedItemCache[uuid]) return;

    const kc = state.keychains.find(k => k.id === keychainId);
    if (!kc?.isUnlocked) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const decrypted = await window.api.decryptItem(keychainId, uuid);
      dispatch({ type: 'CACHE_DECRYPTED', payload: { uuid, data: decrypted } });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
    }
  }, [state.decryptedItemCache, state.keychains]);

  return {
    state,
    dispatch,
    openKeychain,
    loadKeychainFromPath,
    importKeychain,
    loadImportedKeychains,
    unlockKeychain,
    lockKeychain,
    removeKeychain,
    updateKeychain,
    selectItem,
  };
}
