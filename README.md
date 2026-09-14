<div align="center">

# 🔐 EnvVault

**Secure, encrypted environment variable manager with process injection & zero external crypto dependencies.**

[![npm version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://www.npmjs.com/package/envvault)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Security: AES--256--GCM](https://img.shields.io/badge/security-AES--256--GCM-success.svg)]()

Never share plaintext `.env` files over Slack, email, or accidentally commit API secrets to Git again.

[Quick Start](#-quick-start) • [Features](#-features) • [CLI Commands](#-cli-commands) • [Comparison](#-why-envvault) • [Security](#-security-architecture)

</div>

---

## 🚀 The Problem

How many times have you done this?
1. A developer asks for a staging database password.
2. You copy it from your local text editor.
3. You paste it in Slack or Microsoft Teams.
4. It is now saved in chat search history forever.
5. Or worse... someone forgets `.env` in `.gitignore` and pushes secrets to GitHub.

---

## ✨ Why EnvVault?

**EnvVault** is a lightweight, offline-first CLI tool that encrypts your secrets locally using **AES-256-GCM** and injects them directly into your running processes without writing plaintext secrets to disk.

| Feature | Plain `.env` | HashiCorp Vault | AWS Secrets Manager | **EnvVault** |
| :--- | :---: | :---: | :---: | :---: |
| **Encryption** | ❌ | ✅ | ✅ | **✅ (AES-256-GCM)** |
| **Setup Time** | 1 min | 2+ hours | 30 mins | **30 seconds** |
| **Offline First** | ✅ | ✅ | ❌ | **✅** |
| **Zero Cost / No Cloud** | ✅ | ✅ | ❌ | **✅** |
| **Git Leak Protection** | ❌ | ✅ | ✅ | **✅ (Auto .gitignore)** |
| **Process Environment Injection** | ❌ | ⚠️ Complex | ⚠️ Complex | **✅ (`envvault run`)** |

---

## 📦 Quick Start

### 1. Installation

```bash
npm install -g envvault
```

### 2. Initialize Vault

Initialize a password-protected `.envvault` storage file in your project:

```bash
envvault init
```

### 3. Add Secrets

```bash
envvault set DATABASE_URL "postgresql://admin:pass@localhost:5432/mydb"
envvault set STRIPE_SECRET_KEY "sk_test_51Mz..."
```

### 4. Run Application with Injected Secrets

Run your app without creating a plain `.env` file on disk:

```bash
envvault run -- npm start
```

---

## 🛠️ CLI Commands

```bash
# Initialize encrypted vault in current directory
envvault init

# Add or update a secret variable
envvault set DATABASE_URL "postgres://..."

# Retrieve a single secret
envvault get DATABASE_URL

# List all stored keys (masked output)
envvault list

# List all keys with unmasked values
envvault list --show-values

# Delete a secret
envvault delete DATABASE_URL

# Execute any process with injected secrets
envvault run -- node server.js

# Export secrets to .env, JSON, or GitHub Actions CI/CD format
envvault export --format=env
envvault export --format=json
envvault export --format=github-actions
```

---

## 🛡️ Security Architecture

1. **AES-256-GCM Authenticated Encryption**: Every vault payload is encrypted using Galois/Counter Mode (GCM), providing confidentiality and tamper-proof authentication.
2. **PBKDF2 Key Derivation**: 100,000 iterations of SHA-512 derive a 256-bit cryptographic key from your master password and a 32-byte cryptographically secure random salt.
3. **Zero External Crypto Dependencies**: Uses Node.js native `node:crypto` engine for maximal security, speed, and auditability.
4. **Git Protection**: Automatically detects or creates `.gitignore` and appends `.envvault` entry to ensure encrypted files and keys are handled safely.

---

## 🤖 CI/CD Integration

Set the `ENVVAULT_PASSWORD` environment variable in your GitHub Actions, GitLab CI, or Docker environment to automate secret decryption:

```yaml
# GitHub Actions Example (.github/workflows/deploy.yml)
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '20'
  
  - run: npm install -g envvault
  - run: envvault run -- npm run build
    env:
      ENVVAULT_PASSWORD: ${{ secrets.ENVVAULT_MASTER_PASSWORD }}
```

---

## 📄 License

MIT © Martins Udek
