import fs from 'node:fs/promises';
import path from 'node:path';

export interface EncryptionKeyEntry {
  identifier: string;
  level: string;
  data: string;
  validation: string;
  iterations: number;
}

export interface EncryptionKeysData {
  keys: EncryptionKeyEntry[];
  sl3Identifier: string;
  sl5Identifier: string;
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

function stripJSPrefix(raw: string): string {
  const firstBracket = raw.indexOf('[');
  const firstBrace = raw.indexOf('{');
  const starts: number[] = [];
  if (firstBracket !== -1) starts.push(firstBracket);
  if (firstBrace !== -1) starts.push(firstBrace);
  if (starts.length === 0) throw new Error('No JSON found in file');
  return raw.slice(Math.min(...starts));
}

// Strip trailing semicolons or JS artifacts after the JSON
function cleanJSON(raw: string): string {
  let cleaned = stripJSPrefix(raw).trim();
  // Remove trailing semicolons
  while (cleaned.endsWith(';')) {
    cleaned = cleaned.slice(0, -1).trim();
  }
  return cleaned;
}

export async function validateKeychainPath(dirPath: string): Promise<boolean> {
  try {
    if (!dirPath.endsWith('.agilekeychain')) return false;
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) return false;

    const dataDefault = path.join(dirPath, 'data', 'default');
    await fs.stat(dataDefault);

    const contentsPath = path.join(dataDefault, 'contents.js');
    await fs.stat(contentsPath);

    // Check for encryptionKeys.js or 1password.keys
    try {
      await fs.stat(path.join(dataDefault, 'encryptionKeys.js'));
    } catch {
      await fs.stat(path.join(dataDefault, '1password.keys'));
    }

    return true;
  } catch {
    return false;
  }
}

export async function readContents(dirPath: string): Promise<ContentsEntry[]> {
  const contentsPath = path.join(dirPath, 'data', 'default', 'contents.js');
  const raw = await fs.readFile(contentsPath, 'utf-8');
  const json = JSON.parse(cleanJSON(raw));

  if (!Array.isArray(json)) {
    throw new Error('contents.js does not contain an array');
  }

  // Format: [uuid, typeName, title, location, updatedAt, folderUuid, ?, trashed]
  return json.map((entry: unknown[]) => ({
    uuid: String(entry[0] ?? ''),
    typeName: String(entry[1] ?? ''),
    title: String(entry[2] ?? ''),
    location: String(entry[3] ?? ''),
    updatedAt: Number(entry[4] ?? 0),
    folderUuid: String(entry[5] ?? ''),
    trashed: entry[7] === 'Y' || entry[7] === true,
  }));
}

export async function readEncryptionKeys(dirPath: string): Promise<EncryptionKeysData> {
  const encKeysPath = path.join(dirPath, 'data', 'default', 'encryptionKeys.js');
  const raw = await fs.readFile(encKeysPath, 'utf-8');
  const json = JSON.parse(cleanJSON(raw));

  const keys: EncryptionKeyEntry[] = (json.list || []).map((entry: Record<string, unknown>) => ({
    identifier: String(entry.identifier ?? ''),
    level: String(entry.level ?? 'SL5'),
    // Strip null bytes that some versions of 1Password leave in the base64 data
    data: String(entry.data ?? '').replace(/\0/g, ''),
    validation: String(entry.validation ?? '').replace(/\0/g, ''),
    iterations: Number(entry.iterations ?? 1000),
  }));

  return {
    keys,
    sl3Identifier: String(json.SL3 ?? ''),
    sl5Identifier: String(json.SL5 ?? ''),
  };
}

export async function readItem(dirPath: string, uuid: string): Promise<RawItem> {
  // Sanitize uuid to prevent path traversal
  const safeUuid = path.basename(uuid);
  const itemPath = path.join(dirPath, 'data', 'default', `${safeUuid}.1password`);
  const raw = await fs.readFile(itemPath, 'utf-8');
  const json = JSON.parse(cleanJSON(raw));

  return {
    uuid: String(json.uuid ?? safeUuid),
    typeName: String(json.typeName ?? ''),
    title: String(json.title ?? ''),
    location: String(json.location ?? ''),
    locationKey: String(json.locationKey ?? ''),
    createdAt: Number(json.createdAt ?? 0),
    updatedAt: Number(json.updatedAt ?? 0),
    encrypted: String(json.encrypted ?? ''),
    securityLevel: String(json.securityLevel ?? json.openContents?.securityLevel ?? 'SL5'),
    trashed: Boolean(json.trashed ?? false),
  };
}

export async function listItemFiles(dirPath: string): Promise<string[]> {
  const dataDefault = path.join(dirPath, 'data', 'default');
  const files = await fs.readdir(dataDefault);
  return files
    .filter(f => f.endsWith('.1password'))
    .map(f => f.replace('.1password', ''));
}
