import React, { useState, useCallback } from 'react';
import type { DecryptedItem } from '../types';

interface ItemDetailProps {
  item: DecryptedItem | null;
  loading: boolean;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FieldValue({ value, isPassword }: { value: string; isPassword?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }, [value]);

  const displayValue = isPassword && !revealed
    ? '\u2022'.repeat(Math.min(value.length, 20))
    : value;

  return (
    <>
      <span className={`field-value ${isPassword ? 'password' : ''}`}>
        {displayValue || <span style={{ color: 'var(--text-muted)' }}>(empty)</span>}
      </span>
      <div className="field-actions">
        {isPassword && value && (
          <button
            className="btn-icon"
            onClick={() => setRevealed(!revealed)}
            title={revealed ? 'Hide' : 'Show'}
          >
            {revealed ? '\uD83D\uDC41\uFE0F' : '\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8\uFE0F'}
          </button>
        )}
        {value && (
          <button className="btn-icon" onClick={copy} title="Copy">
            {copied ? '\u2713' : '\uD83D\uDCCB'}
          </button>
        )}
      </div>
    </>
  );
}

function WebFormDetail({ item }: { item: DecryptedItem }) {
  const fields = item.fields || [];
  const decrypted = item.decrypted;

  // Extract notable fields
  const usernameField = fields.find(f => f.designation === 'username');
  const passwordField = fields.find(f => f.designation === 'password');
  const otherFields = fields.filter(f => f.designation !== 'username' && f.designation !== 'password' && f.value);
  const notesText = decrypted?.notesPlain as string | undefined;
  const urls = decrypted?.URLs as Array<{ url: string }> | undefined;

  return (
    <>
      <div className="detail-section">
        <h3>Credentials</h3>
        {usernameField && (
          <div className="field-row">
            <span className="field-label">Username</span>
            <FieldValue value={usernameField.value} />
          </div>
        )}
        {passwordField && (
          <div className="field-row">
            <span className="field-label">Password</span>
            <FieldValue value={passwordField.value} isPassword />
          </div>
        )}
      </div>

      {urls && urls.length > 0 && (
        <div className="detail-section">
          <h3>URLs</h3>
          {urls.map((u, i) => (
            <div className="field-row" key={i}>
              <span className="field-label">URL</span>
              <FieldValue value={u.url} />
            </div>
          ))}
        </div>
      )}

      {otherFields.length > 0 && (
        <div className="detail-section">
          <h3>Other Fields</h3>
          {otherFields.map((f, i) => (
            <div className="field-row" key={i}>
              <span className="field-label">{f.name || f.designation || `Field ${i + 1}`}</span>
              <FieldValue value={f.value} isPassword={f.type === 'P'} />
            </div>
          ))}
        </div>
      )}

      {notesText && (
        <div className="detail-section">
          <h3>Notes</h3>
          <div className="json-tree">{notesText}</div>
        </div>
      )}
    </>
  );
}

function PasswordDetail({ item }: { item: DecryptedItem }) {
  const password = item.decrypted?.password as string || '';
  const notesText = item.decrypted?.notesPlain as string || '';

  return (
    <>
      <div className="detail-section">
        <h3>Password</h3>
        <div className="field-row">
          <span className="field-label">Password</span>
          <FieldValue value={password} isPassword />
        </div>
      </div>
      {notesText && (
        <div className="detail-section">
          <h3>Notes</h3>
          <div className="json-tree">{notesText}</div>
        </div>
      )}
    </>
  );
}

function SecureNoteDetail({ item }: { item: DecryptedItem }) {
  const notesText = item.decrypted?.notesPlain as string || '';

  return (
    <div className="detail-section">
      <h3>Secure Note</h3>
      <div className="json-tree">{notesText || '(empty note)'}</div>
    </div>
  );
}

function GenericDetail({ item }: { item: DecryptedItem }) {
  const decrypted = item.decrypted;

  if ('_error' in decrypted) {
    return (
      <div className="detail-section">
        <h3>Error</h3>
        <div className="json-tree" style={{ color: 'var(--danger)' }}>
          {String(decrypted._error)}
        </div>
      </div>
    );
  }

  // Show notes if available
  const notesText = decrypted?.notesPlain as string | undefined;

  // Collect all string/number fields for display
  const displayFields: Array<{ key: string; value: string; isPassword: boolean }> = [];
  const skipKeys = new Set(['notesPlain', 'URLs', 'fields', 'sections', 'htmlForm', 'htmlMethod', 'htmlAction', 'htmlID']);

  // Handle sections (common in newer item types)
  const sections = decrypted?.sections as Array<{ title: string; fields: Array<{ t: string; v: string; k: string; n: string }> }> | undefined;
  if (sections) {
    for (const section of sections) {
      for (const field of section.fields || []) {
        if (field.v !== undefined && field.v !== '') {
          displayFields.push({
            key: field.t || field.n || 'Field',
            value: String(field.v),
            isPassword: field.k === 'concealed',
          });
        }
      }
    }
  }

  for (const [key, value] of Object.entries(decrypted)) {
    if (skipKeys.has(key) || key === 'sections') continue;
    if (typeof value === 'string' || typeof value === 'number') {
      displayFields.push({
        key,
        value: String(value),
        isPassword: key.toLowerCase().includes('password') || key.toLowerCase().includes('secret'),
      });
    }
  }

  return (
    <>
      {displayFields.length > 0 && (
        <div className="detail-section">
          <h3>Fields</h3>
          {displayFields.map((f, i) => (
            <div className="field-row" key={i}>
              <span className="field-label">{f.key}</span>
              <FieldValue value={f.value} isPassword={f.isPassword} />
            </div>
          ))}
        </div>
      )}

      {notesText && (
        <div className="detail-section">
          <h3>Notes</h3>
          <div className="json-tree">{notesText}</div>
        </div>
      )}

      <div className="detail-section">
        <h3>Raw Data</h3>
        <div className="json-tree">{JSON.stringify(decrypted, null, 2)}</div>
      </div>
    </>
  );
}

export default function ItemDetail({ item, loading }: ItemDetailProps) {
  if (loading) {
    return (
      <div className="detail-panel empty">
        <div className="loading">Decrypting...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="detail-panel empty">
        <div className="empty-state">
          <div className="empty-icon">{'\uD83D\uDD0D'}</div>
          <h3>Select an item</h3>
          <p>Click an item from the list to view its details</p>
        </div>
      </div>
    );
  }

  const typeLabel = (() => {
    if (item.typeName.startsWith('webforms.')) return 'Login';
    if (item.typeName.startsWith('passwords.')) return 'Password';
    if (item.typeName.startsWith('securenotes.')) return 'Secure Note';
    if (item.typeName.includes('CreditCard')) return 'Credit Card';
    if (item.typeName.includes('License')) return 'Software License';
    if (item.typeName.startsWith('identities.')) return 'Identity';
    return item.typeName;
  })();

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <h1>{item.title || '(Untitled)'}</h1>
        <div className="detail-meta">
          <span>Type: {typeLabel}</span>
          {item.location && <span>URL: {item.location}</span>}
          <span>Created: {formatDate(item.createdAt)}</span>
          <span>Modified: {formatDate(item.updatedAt)}</span>
        </div>
      </div>

      {item.typeName.startsWith('webforms.') && <WebFormDetail item={item} />}
      {item.typeName.startsWith('passwords.') && <PasswordDetail item={item} />}
      {item.typeName.startsWith('securenotes.') && <SecureNoteDetail item={item} />}
      {!item.typeName.startsWith('webforms.') &&
       !item.typeName.startsWith('passwords.') &&
       !item.typeName.startsWith('securenotes.') &&
       <GenericDetail item={item} />}
    </div>
  );
}
