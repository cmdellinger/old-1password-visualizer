import React, { useMemo } from 'react';
import type { ContentsEntry } from '../types';
import TypeIcon from './TypeIcon';

interface ItemListProps {
  items: ContentsEntry[];
  searchQuery: string;
  selectedUuid: string | null;
  isUnlocked: boolean;
  onSelect: (uuid: string) => void;
  onUnlockRequest: () => void;
}

function getTypeLabel(typeName: string): string {
  if (typeName.startsWith('webforms.')) return 'Login';
  if (typeName.startsWith('passwords.')) return 'Password';
  if (typeName.startsWith('securenotes.')) return 'Note';
  if (typeName.includes('CreditCard')) return 'Card';
  if (typeName.includes('License')) return 'License';
  if (typeName.startsWith('identities.')) return 'Identity';
  if (typeName.includes('BankAccount')) return 'Bank';
  const parts = typeName.split('.');
  return parts[parts.length - 1] || typeName;
}

export default function ItemList({
  items,
  searchQuery,
  selectedUuid,
  isUnlocked,
  onSelect,
  onUnlockRequest,
}: ItemListProps) {
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let result = items.filter(item => !item.trashed);

    if (query) {
      result = result.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.typeName.toLowerCase().includes(query)
      );
    }

    // Sort by title
    result.sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, [items, searchQuery]);

  if (items.length === 0) {
    return (
      <div className="item-list">
        <div className="empty-state">
          <p>No items in this keychain</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="item-list">
        <div className="empty-state">
          <div className="empty-icon">{'\uD83D\uDD12'}</div>
          <h3>Keychain Locked</h3>
          <p>Unlock this keychain to view and search items</p>
          <button className="btn btn-primary" onClick={onUnlockRequest} style={{ marginTop: 12 }}>
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="item-list">
      {filteredItems.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px' }}>
          <p>No items match "{searchQuery}"</p>
        </div>
      ) : (
        filteredItems.map(item => (
          <div
            key={item.uuid}
            className={`item-row ${selectedUuid === item.uuid ? 'selected' : ''} ${item.trashed ? 'trashed' : ''}`}
            onClick={() => onSelect(item.uuid)}
          >
            <TypeIcon typeName={item.typeName} />
            <div className="item-info">
              <div className="item-title">{item.title || '(Untitled)'}</div>
              {item.location && <div className="item-subtitle">{item.location}</div>}
            </div>
            <span className="item-type-badge">{getTypeLabel(item.typeName)}</span>
          </div>
        ))
      )}
    </div>
  );
}
