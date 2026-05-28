import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 64;

function getEncryptionKey(keyString?: string): Buffer {
  const secret = keyString || process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('Encryption key is not configured.');
  }
  // Hash the secret to ensure it is always exactly 32 bytes
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts cleartext using AES-256-GCM.
 */
export function encrypt(text: string, keyString?: string): string {
  const key = getEncryptionKey(keyString);
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    tag: tag.toString('hex'),
    encrypted: encrypted.toString('hex'),
  });
}

/**
 * Decrypts a JSON GCM encrypted payload back to cleartext.
 */
export function decrypt(cipherTextJson: string, keyString?: string): string {
  try {
    const payload = JSON.parse(cipherTextJson);
    const key = getEncryptionKey(keyString);
    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');
    const encrypted = Buffer.from(payload.encrypted, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(
      `Failed to decrypt parameter: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
