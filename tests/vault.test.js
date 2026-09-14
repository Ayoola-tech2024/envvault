import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { encrypt, decrypt, hashPassword, verifyPassword } from '../src/crypto.js';
import {
  initVault,
  setSecret,
  getSecret,
  listSecrets,
  deleteSecret,
  exportSecrets,
  getDecryptedEnv,
  auditSecurity,
  VAULT_FILE,
} from '../src/vault.js';

test('Crypto Module - Encryption & Decryption Roundtrip', () => {
  const secret = 'postgres://admin:secret123@localhost:5432/mydb';
  const masterPassword = 'super-secret-password-123';

  const encrypted = encrypt(secret, masterPassword);
  assert.ok(typeof encrypted === 'string');
  assert.ok(encrypted.includes('ciphertext'));

  const decrypted = decrypt(encrypted, masterPassword);
  assert.equal(decrypted, secret);
});

test('Crypto Module - Rejects Decryption with Wrong Password', () => {
  const secret = 'API_KEY_998877';
  const masterPassword = 'correct-password';
  const wrongPassword = 'wrong-password';

  const encrypted = encrypt(secret, masterPassword);
  assert.throws(
    () => decrypt(encrypted, wrongPassword),
    /Authentication failed/
  );
});

test('Crypto Module - Password Hashing & Verification', () => {
  const password = 'my-vault-pass';
  const hash = hashPassword(password);

  assert.ok(verifyPassword(password, hash));
  assert.equal(verifyPassword('incorrect-pass', hash), false);
});

test('Vault Storage Lifecycle Integration', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envvault-test-'));
  const masterPassword = 'test-master-password';

  try {
    // 1. Init
    const vaultPath = initVault(masterPassword, tempDir);
    assert.ok(fs.existsSync(vaultPath));

    // 2. Set
    setSecret('DATABASE_URL', 'postgres://localhost:5432/db', masterPassword, tempDir);
    setSecret('PORT', '3000', masterPassword, tempDir);

    // 3. Get
    const dbUrl = getSecret('DATABASE_URL', masterPassword, tempDir);
    assert.equal(dbUrl, 'postgres://localhost:5432/db');

    // 4. List
    const secrets = listSecrets(masterPassword, tempDir);
    assert.equal(secrets.length, 2);
    assert.equal(secrets[0].key, 'DATABASE_URL');

    // 5. Decrypted Env
    const envObj = getDecryptedEnv(masterPassword, tempDir);
    assert.deepEqual(envObj, {
      DATABASE_URL: 'postgres://localhost:5432/db',
      PORT: '3000',
    });

    // 6. Exports
    const envExport = exportSecrets('env', masterPassword, tempDir);
    assert.ok(envExport.includes('DATABASE_URL=postgres://localhost:5432/db'));

    const jsonExport = exportSecrets('json', masterPassword, tempDir);
    assert.ok(jsonExport.includes('"PORT": "3000"'));

    const ghExport = exportSecrets('github-actions', masterPassword, tempDir);
    assert.ok(ghExport.includes('echo "::add-mask::3000"'));

    // 7. Delete
    deleteSecret('PORT', masterPassword, tempDir);
    const updatedSecrets = listSecrets(masterPassword, tempDir);
    assert.equal(updatedSecrets.length, 1);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Security Audit Feature', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envvault-audit-test-'));
  try {
    initVault('password123', tempDir);
    fs.writeFileSync(path.join(tempDir, '.env'), 'SECRET=123');

    const audit = auditSecurity(tempDir);
    assert.equal(audit.vaultExists, true);
    assert.equal(audit.isVaultGitignored, true);
    assert.equal(audit.foundUnencrypted.length, 1);
    assert.equal(audit.foundUnencrypted[0].filename, '.env');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
