import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LEN = 32; // 256 bits
const IV_LEN = 12;  // 96 bits for GCM
const SALT_LEN = 32; // 256 bits
const AUTH_TAG_LEN = 16;
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_DIGEST = 'sha512';

/**
 * Derives a 256-bit key from password + salt using PBKDF2.
 */
export function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LEN, PBKDF2_DIGEST);
}

/**
 * Encrypts a string using AES-256-GCM and PBKDF2 key derivation.
 * @param {string} text Plaintext to encrypt
 * @param {string} password Master password
 * @returns {string} Encrypted payload formatted as JSON string
 */
export function encrypt(text, password) {
  if (typeof text !== 'string') {
    throw new TypeError('Plaintext must be a string');
  }
  if (!password || typeof password !== 'string') {
    throw new TypeError('Password must be a non-empty string');
  }

  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LEN });
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  const payload = {
    v: 1,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted,
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts an AES-256-GCM payload string using the master password.
 * @param {string} encryptedJson JSON string payload
 * @param {string} password Master password
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedJson, password) {
  if (!encryptedJson || typeof encryptedJson !== 'string') {
    throw new TypeError('Encrypted payload must be a JSON string');
  }
  if (!password || typeof password !== 'string') {
    throw new TypeError('Password must be a non-empty string');
  }

  let payload;
  try {
    payload = JSON.parse(encryptedJson);
  } catch (err) {
    throw new Error('Invalid vault payload format: Corrupted or tampered data');
  }

  const { salt, iv, authTag, ciphertext } = payload;
  if (!salt || !iv || !authTag || !ciphertext) {
    throw new Error('Malformed vault payload structure');
  }

  const saltBuf = Buffer.from(salt, 'hex');
  const ivBuf = Buffer.from(iv, 'hex');
  const authTagBuf = Buffer.from(authTag, 'hex');
  const key = deriveKey(password, saltBuf);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf, { authTagLength: AUTH_TAG_LEN });
  decipher.setAuthTag(authTagBuf);

  try {
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    throw new Error('Authentication failed: Invalid master password or data corrupted');
  }
}

/**
 * Creates a salted hash for verifying master password correctness.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a salted hash.
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}
