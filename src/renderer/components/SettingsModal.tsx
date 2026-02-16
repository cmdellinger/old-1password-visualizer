import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [storageDir, setStorageDir] = useState('');
  const [defaultDir, setDefaultDir] = useState('');
  const [newDir, setNewDir] = useState<string | null>(null);
  const [moveContents, setMoveContents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    window.api.getSettings().then(settings => {
      setStorageDir(settings.storageDir);
      setDefaultDir(settings.defaultStorageDir);
    });
  }, []);

  const handlePickDirectory = async () => {
    const picked = await window.api.pickDirectory();
    if (picked) {
      setNewDir(picked);
      setError(null);
      setSuccess(false);
    }
  };

  const handleSave = async () => {
    if (!newDir || newDir === storageDir) return;
    setSaving(true);
    setError(null);
    try {
      await window.api.setStorageDir(newDir, moveContents);
      setStorageDir(newDir);
      setNewDir(null);
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    if (defaultDir !== storageDir) {
      setNewDir(defaultDir);
      setError(null);
      setSuccess(false);
    }
  };

  const displayPath = newDir ?? storageDir;
  const hasChanges = newDir !== null && newDir !== storageDir;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <h2>Settings</h2>

        <div className="settings-section">
          <label className="settings-label">Storage Directory</label>
          <p className="settings-description">
            Where imported keychains are stored on disk.
          </p>
          <div className="settings-path-row">
            <code className="settings-path">{displayPath}</code>
            <button className="btn btn-sm" onClick={handlePickDirectory}>
              Change...
            </button>
          </div>
          {storageDir !== defaultDir && (
            <button
              className="btn btn-sm settings-reset"
              onClick={handleResetDefault}
            >
              Reset to default
            </button>
          )}
        </div>

        {hasChanges && (
          <div className="settings-section">
            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={moveContents}
                onChange={e => setMoveContents(e.target.checked)}
              />
              Move existing keychains to new location
            </label>
          </div>
        )}

        {error && <div className="settings-error">{error}</div>}
        {success && <div className="settings-success">Storage directory updated.</div>}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            {hasChanges ? 'Cancel' : 'Close'}
          </button>
          {hasChanges && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
