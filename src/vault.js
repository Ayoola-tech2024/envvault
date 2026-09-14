import fs from 'node:fs';
import path from 'node:path';
import { encrypt, decrypt, hashPassword, verifyPassword } from './crypto.js';

export const VAULT_FILE = '.envvault';

/**
 * Ensures the target file/folder exists and updates .gitignore
 */
function updateGitignore(dir) {
  const gitignorePath = path.join(dir, '.gitignore');
  const entry = '.envvault';
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes(entry)) {
      fs.appendFileSync(gitignorePath, `\n# EnvVault Encrypted File\n${entry}\n`);
    }
  } else {
    fs.writeFileSync(gitignorePath, `# EnvVault Encrypted File\n${entry}\n`);
  }
}

/**
 * Returns absolute path to vault file.
 */
export function getVaultPath(dir = process.cwd()) {
  return path.join(dir, VAULT_FILE);
}

/**
 * Checks if vault file exists in target directory.
 */
export function isVaultInitialized(dir = process.cwd()) {
  return fs.existsSync(getVaultPath(dir));
}

/**
 * Initializes a new vault with master password protection.
 */
export function initVault(password, dir = process.cwd()) {
  const vaultPath = getVaultPath(dir);
  if (fs.existsSync(vaultPath)) {
    throw new Error(`Vault file '${VAULT_FILE}' already exists in ${dir}`);
  }

  const initialData = {
    verifier: hashPassword(password),
    createdAt: new Date().toISOString(),
    payload: encrypt(JSON.stringify({}), password),
  };

  fs.writeFileSync(vaultPath, JSON.stringify(initialData, null, 2), 'utf8');
  updateGitignore(dir);
  return vaultPath;
}

/**
 * Reads, verifies password, and decrypts secrets map.
 */
export function readSecrets(password, dir = process.cwd()) {
  const vaultPath = getVaultPath(dir);
  if (!fs.existsSync(vaultPath)) {
    throw new Error(`No '${VAULT_FILE}' found. Run 'envvault init' first.`);
  }

  const raw = fs.readFileSync(vaultPath, 'utf8');
  let vault;
  try {
    vault = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Corrupted '${VAULT_FILE}' JSON format.`);
  }

  if (vault.verifier && !verifyPassword(password, vault.verifier)) {
    throw new Error('Invalid master password.');
  }

  const decryptedJson = decrypt(vault.payload, password);
  return { vault, secrets: JSON.parse(decryptedJson) };
}

/**
 * Saves updated secrets map back into encrypted vault file.
 */
function saveSecrets(vault, secrets, password, dir = process.cwd()) {
  const vaultPath = getVaultPath(dir);
  const updatedVault = {
    ...vault,
    updatedAt: new Date().toISOString(),
    payload: encrypt(JSON.stringify(secrets), password),
  };
  fs.writeFileSync(vaultPath, JSON.stringify(updatedVault, null, 2), 'utf8');
}

/**
 * Sets or updates a secret key-value pair.
 */
export function setSecret(key, value, password, dir = process.cwd()) {
  if (!key || typeof key !== 'string') {
    throw new TypeError('Secret key must be a valid non-empty string');
  }
  const cleanKey = key.trim();
  const { vault, secrets } = readSecrets(password, dir);
  secrets[cleanKey] = String(value);
  saveSecrets(vault, secrets, password, dir);
  return { key: cleanKey, value: String(value) };
}

/**
 * Retrieves a single secret value by key.
 */
export function getSecret(key, password, dir = process.cwd()) {
  const { secrets } = readSecrets(password, dir);
  if (!(key in secrets)) {
    throw new Error(`Secret '${key}' not found in vault.`);
  }
  return secrets[key];
}

/**
 * Lists all secret keys and masked values.
 */
export function listSecrets(password, dir = process.cwd()) {
  const { secrets } = readSecrets(password, dir);
  return Object.entries(secrets).map(([key, val]) => {
    const strVal = String(val);
    const masked = strVal.length > 6
      ? strVal.substring(0, 3) + '•'.repeat(Math.min(strVal.length - 4, 12)) + strVal.slice(-1)
      : '•'.repeat(strVal.length || 6);
    return { key, value: strVal, masked };
  });
}

/**
 * Deletes a secret from the vault.
 */
export function deleteSecret(key, password, dir = process.cwd()) {
  const { vault, secrets } = readSecrets(password, dir);
  if (!(key in secrets)) {
    throw new Error(`Secret '${key}' not found in vault.`);
  }
  delete secrets[key];
  saveSecrets(vault, secrets, password, dir);
  return true;
}

/**
 * Returns plain object of all decrypted environment variables.
 */
export function getDecryptedEnv(password, dir = process.cwd()) {
  const { secrets } = readSecrets(password, dir);
  return secrets;
}

/**
 * Exports vault secrets into various formatted outputs (.env, json, github-actions).
 */
export function exportSecrets(format = 'env', password, dir = process.cwd()) {
  const secrets = getDecryptedEnv(password, dir);
  const normalizedFormat = format.toLowerCase();

  if (normalizedFormat === 'json') {
    return JSON.stringify(secrets, null, 2);
  }

  if (normalizedFormat === 'github-actions') {
    const lines = [];
    for (const [k, v] of Object.entries(secrets)) {
      lines.push(`echo "::add-mask::${v}"`);
      lines.push(`echo "${k}=${v}" >> $GITHUB_ENV`);
    }
    return lines.join('\n');
  }

  // Default: .env format
  const lines = Object.entries(secrets).map(([k, v]) => {
    const needsQuotes = /[\s#="']/.test(v);
    const escaped = v.replace(/"/g, '\\"');
    return `${k}=${needsQuotes ? `"${escaped}"` : v}`;
  });
  return lines.join('\n');
}
