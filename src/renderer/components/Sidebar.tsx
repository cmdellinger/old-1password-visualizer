import React, { useState } from 'react';
import type { KeychainData } from '../hooks/useKeychains';

function formatDate(iso: string): string {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

interface SidebarProps {
  keychains: KeychainData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: () => void;
  onImport: () => void;
  onOpenSettings: () => void;
  onUnlockRequest: (id: string) => void;
  onLock: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: { displayName?: string; notes?: string }) => void;
}

function KeychainEntry({
  kc,
  isSelected,
  onSelect,
  onUnlockRequest,
  onLock,
  onRemove,
  onUpdate,
}: {
  kc: KeychainData;
  isSelected: boolean;
  onSelect: () => void;
  onUnlockRequest: () => void;
  onLock: () => void;
  onRemove: () => void;
  onUpdate: (updates: { displayName?: string; notes?: string }) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [nameValue, setNameValue] = useState(kc.displayName);
  const [notesValue, setNotesValue] = useState(kc.notes);

  const saveName = () => {
    onUpdate({ displayName: nameValue.trim() || kc.name });
    setEditingName(false);
  };

  const saveNotes = () => {
    onUpdate({ notes: notesValue });
    setEditingNotes(false);
  };

  return (
    <div
      className={`keychain-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="keychain-item-header">
        <span className="lock-icon">
          {kc.isUnlocked ? '\uD83D\uDD13' : '\uD83D\uDD12'}
        </span>
        {kc.importId && <span className="imported-badge" title="Imported">{'*'}</span>}
        <div className="keychain-item-main">
          {editingName ? (
            <input
              className="keychain-name-input"
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameValue(kc.displayName); setEditingName(false); } }}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span
              className="name"
              onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }}
              title="Double-click to rename"
            >
              {kc.displayName}
            </span>
          )}
          <div className="keychain-dates">
            <span title="File created">Created: {formatDate(kc.fileCreated)}</span>
            <span title="File modified">Modified: {formatDate(kc.fileModified)}</span>
          </div>
          {(kc.notes || editingNotes) && (
            editingNotes ? (
              <textarea
                className="keychain-notes-input"
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                onBlur={saveNotes}
                onKeyDown={e => { if (e.key === 'Escape') { setNotesValue(kc.notes); setEditingNotes(false); } }}
                onClick={e => e.stopPropagation()}
                placeholder="Notes about this keychain..."
                autoFocus
                rows={2}
              />
            ) : (
              <div
                className="keychain-notes"
                onDoubleClick={(e) => { e.stopPropagation(); setEditingNotes(true); }}
                title="Double-click to edit"
              >
                {kc.notes}
              </div>
            )
          )}
        </div>
        <span className="count">{kc.itemCount}</span>
      </div>
      <div className="keychain-item-actions">
        {kc.isUnlocked ? (
          <button className="btn-icon" title="Lock" onClick={(e) => { e.stopPropagation(); onLock(); }}>
            {'\uD83D\uDD12'}
          </button>
        ) : (
          <button className="btn-icon" title="Unlock" onClick={(e) => { e.stopPropagation(); onUnlockRequest(); }}>
            {'\uD83D\uDD11'}
          </button>
        )}
        <button
          className="btn-icon"
          title="Add note"
          onClick={(e) => { e.stopPropagation(); setEditingNotes(true); }}
        >
          {'\uD83D\uDCDD'}
        </button>
        <button className="btn-icon btn-danger" title="Remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          {'\u00D7'}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({
  keychains,
  selectedId,
  onSelect,
  onOpen,
  onImport,
  onOpenSettings,
  onUnlockRequest,
  onLock,
  onRemove,
  onUpdate,
}: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Keychains</h2>
        <button className="btn btn-sm" onClick={onOpen} title="Open temporarily">
          + Open
        </button>
      </div>
      <div className="sidebar-list">
        {keychains.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <p style={{ fontSize: '12px' }}>
              Open or drag a .agilekeychain folder to get started
            </p>
          </div>
        ) : (
          keychains.map(kc => (
            <KeychainEntry
              key={kc.id}
              kc={kc}
              isSelected={selectedId === kc.id}
              onSelect={() => onSelect(kc.id)}
              onUnlockRequest={() => onUnlockRequest(kc.id)}
              onLock={() => onLock(kc.id)}
              onRemove={() => onRemove(kc.id)}
              onUpdate={(updates) => onUpdate(kc.id, updates)}
            />
          ))
        )}
      </div>
      <div className="sidebar-footer">
        <button className="btn btn-sm btn-primary" onClick={onImport} title="Import (copy to app storage)">
          + Import
        </button>
        <button className="btn-icon" onClick={onOpenSettings} title="Settings">
          {'\u2699'}
        </button>
      </div>
    </div>
  );
}
