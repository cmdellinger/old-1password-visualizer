import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { useKeychains } from './hooks/useKeychains';
import DropZone from './components/DropZone';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import ItemList from './components/ItemList';
import ItemDetail from './components/ItemDetail';
import PasswordPrompt from './components/PasswordPrompt';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const {
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
  } = useKeychains();

  const selectedKeychain = useMemo(
    () => state.keychains.find(kc => kc.id === state.selectedKeychainId) ?? null,
    [state.keychains, state.selectedKeychainId]
  );

  const promptKeychain = useMemo(
    () => state.keychains.find(kc => kc.id === state.passwordPromptTarget) ?? null,
    [state.keychains, state.passwordPromptTarget]
  );

  const [showSettings, setShowSettings] = useState(false);

  const selectedDecryptedItem = state.selectedItemUuid
    ? state.decryptedItemCache[state.selectedItemUuid] ?? null
    : null;

  const handleDrop = useCallback((path: string) => {
    loadKeychainFromPath(path);
  }, [loadKeychainFromPath]);

  const handleSelectKeychain = useCallback((id: string) => {
    dispatch({ type: 'SELECT_KEYCHAIN', payload: id });
  }, [dispatch]);

  const handleUnlockRequest = useCallback((id: string) => {
    dispatch({ type: 'SHOW_PASSWORD_PROMPT', payload: id });
  }, [dispatch]);

  const handleUnlockSubmit = useCallback(async (password: string) => {
    if (!state.passwordPromptTarget) return;
    await unlockKeychain(state.passwordPromptTarget, password);
  }, [state.passwordPromptTarget, unlockKeychain]);

  const handleCancelPrompt = useCallback(() => {
    dispatch({ type: 'SHOW_PASSWORD_PROMPT', payload: null });
  }, [dispatch]);

  const handleSelectItem = useCallback((uuid: string) => {
    if (!state.selectedKeychainId) return;
    selectItem(state.selectedKeychainId, uuid);
  }, [state.selectedKeychainId, selectItem]);

  const handleSearch = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH', payload: query });
  }, [dispatch]);

  // Auto-load imported keychains on startup
  useEffect(() => {
    loadImportedKeychains();
  }, [loadImportedKeychains]);

  // Keyboard shortcut: Cmd+O to open keychain
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        openKeychain();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openKeychain]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => dispatch({ type: 'SET_ERROR', payload: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error, dispatch]);

  return (
    <>
      <DropZone onDrop={handleDrop} />

      <div className="app-layout">
        <Sidebar
          keychains={state.keychains}
          selectedId={state.selectedKeychainId}
          onSelect={handleSelectKeychain}
          onOpen={openKeychain}
          onImport={importKeychain}
          onOpenSettings={() => setShowSettings(true)}
          onUnlockRequest={handleUnlockRequest}
          onLock={lockKeychain}
          onRemove={removeKeychain}
          onUpdate={updateKeychain}
        />

        <div className="item-list-panel">
          <SearchBar
            value={state.searchQuery}
            onChange={handleSearch}
          />
          {selectedKeychain ? (
            <ItemList
              items={selectedKeychain.items}
              searchQuery={state.searchQuery}
              selectedUuid={state.selectedItemUuid}
              isUnlocked={selectedKeychain.isUnlocked}
              onSelect={handleSelectItem}
              onUnlockRequest={() => handleUnlockRequest(selectedKeychain.id)}
            />
          ) : (
            <div className="item-list">
              <div className="empty-state">
                <div className="empty-icon">{'\uD83D\uDCC2'}</div>
                <h3>No keychain selected</h3>
                <p>
                  Open a .agilekeychain folder or drag one into this window
                </p>
                <button className="btn btn-primary" onClick={openKeychain} style={{ marginTop: 12 }}>
                  Open Keychain ({'\u2318'}O)
                </button>
              </div>
            </div>
          )}
        </div>

        <ItemDetail
          item={selectedDecryptedItem}
          loading={state.loading && state.selectedItemUuid !== null}
        />
      </div>

      {promptKeychain && (
        <PasswordPrompt
          keychainName={promptKeychain.name}
          onSubmit={handleUnlockSubmit}
          onCancel={handleCancelPrompt}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {state.error && (
        <div className="toast">{state.error}</div>
      )}
    </>
  );
}
