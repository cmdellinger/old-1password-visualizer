import crypto from 'node:crypto';
import type { EncryptionKeyEntry, EncryptionKeysData } from './keychain-reader';

/**
 * OpenSSL-compatible EVP_BytesToKey (MD5-based key derivation).
 * Used for item-level decryption with the decrypted master key.
 */
function evpBytesToKey(keyMaterial: Buffer, salt: Buffer): { key: Buffer; iv: Buffer } {
  const data = Buffer.concat([keyMaterial, salt]);
  const hash1 = crypto.createHash('md5').update(data).digest();
  const hash2 = crypto.createHash('md5').update(Buffer.concat([hash1, data])).digest();
  return { key: hash1, iv: hash2 };
}

/**
 * Extracts salt and ciphertext from an OpenSSL "Salted__" formatted buffer.
 */
function parseOpenSSLEncrypted(data: Buffer): { salt: Buffer; ciphertext: Buffer } {
  const magic = data.subarray(0, 8).toString('utf8');
  if (magic !== 'Salted__') {
    throw new Error('Invalid encrypted data: missing Salted__ prefix');
  }
  return {
    salt: data.subarray(8, 16),
    ciphertext: data.subarray(16),
  };
}

/**
 * Phase 1: Decrypt a master key entry using the master password.
 * Uses PBKDF2-SHA1 for key derivation.
 */
function decryptMasterKey(masterPassword: string, encKeyEntry: EncryptionKeyEntry): Buffer {
  const encData = Buffer.from(encKeyEntry.data, 'base64');
  const { salt, ciphertext } = parseOpenSSLEncrypted(encData);

  // PBKDF2 with SHA-1 to derive AES key + IV
  const derived = crypto.pbkdf2Sync(
    masterPassword,
    salt,
    encKeyEntry.iterations,
    32, // 16 bytes key + 16 bytes IV
    'sha1'
  );

  const aesKey = derived.subarray(0, 16);
  const aesIV = derived.subarray(16, 32);

  const decipher = crypto.createDecipheriv('aes-128-cbc', aesKey, aesIV);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Validate that a decrypted key is correct by decrypting the validation blob
 * and checking it matches the decrypted key.
 */
function validateDecryptedKey(decryptedKey: Buffer, validationBase64: string): boolean {
  try {
    const valData = Buffer.from(validationBase64, 'base64');
    const { salt, ciphertext } = parseOpenSSLEncrypted(valData);
    const { key, iv } = evpBytesToKey(decryptedKey, salt);

    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    const result = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return result.equals(decryptedKey);
  } catch {
    return false;
  }
}

/**
 * Phase 2: Decrypt an individual item's encrypted field using the decrypted master key.
 * Uses EVP_BytesToKey (MD5-based) for key derivation.
 */
export function decryptItemData(encryptedBase64: string, decryptedMasterKey: Buffer): string {
  const encData = Buffer.from(encryptedBase64, 'base64');
  const { salt, ciphertext } = parseOpenSSLEncrypted(encData);
  const { key, iv } = evpBytesToKey(decryptedMasterKey, salt);

  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Unlock a keychain by deriving all master keys from the master password.
 * Returns a map of security level (e.g. "SL5") to decrypted key buffer.
 */
export function unlockKeychain(
  masterPassword: string,
  encryptionKeys: EncryptionKeysData
): Map<string, Buffer> {
  const keyMap = new Map<string, Buffer>();

  for (const entry of encryptionKeys.keys) {
    let decrypted: Buffer;
    try {
      decrypted = decryptMasterKey(masterPassword, entry);
    } catch {
      throw new Error('Incorrect master password');
    }

    if (!validateDecryptedKey(decrypted, entry.validation)) {
      throw new Error('Incorrect master password');
    }

    keyMap.set(entry.level, decrypted);
    // Also map by identifier for direct lookup
    keyMap.set(entry.identifier, decrypted);
  }

  return keyMap;
}
