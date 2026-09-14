<div align="center">

```
  ███████╗███╗   ██╗██╗   ██╗██╗   ██╗██████╗  ██████╗ ██╗     ████████╗
  ██╔════╝████╗  ██║██║   ██║██║   ██║██╔══██╗██╔═══██╗██║     ╚══██╔══╝
  █████╗  ██╔██╗ ██║██║   ██║██║   ██║██████╔╝██║   ██║██║        ██║   
  ██╔══╝  ██║╚██╗██║╚██╗ ██╔╝██║   ██║██╔══██╗██║   ██║██║        ██║   
  ███████╗██║ ╚████║ ╚████╔╝ ╚██████╔╝██████╔╝╚██████╔╝███████╗   ██║   
  ╚══════╝╚═╝  ╚═══╝  ╚═══╝   ╚═════╝ ╚═════╝  ╚═════╝ ╚══════╝   ╚═╝   
```

### 🔐 Secure, Encrypted Environment Variable Manager

*Zero-dependency AES-256-GCM encryption, sub-process injection, & security auditing for Node.js applications.*

Created by **[Ayoola Damisile](https://github.com/Ayoola-tech2024)**

[![npm version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://www.npmjs.com/package/@ayoola-tech2024/envvault)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Security: AES--256--GCM](https://img.shields.io/badge/security-AES--256--GCM-success.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Quick Start](#-quick-start) • [Why EnvVault](#-why-envvault) • [Comparison](#-feature-comparison-matrix) • [CLI Commands](#-cli-command-reference) • [Security Audit](#-security-audit--linters) • [CI/CD Workflow](#-cicd-integration) • [License](#-license)

</div>

---

## 😱 Stop Sharing Passwords on Slack!

How many times have you done this?
1. A teammate asks for the staging database connection string.
2. You copy it from your local text editor.
3. You paste it into Slack or Teams.
4. It is now saved in chat search history forever.
5. Or worse... someone forgets `.env` in `.gitignore` and pushes production secrets to GitHub.

---

## ✨ Why EnvVault?

**EnvVault** is a lightweight, offline-first CLI tool built by **Ayoola Damisile** that encrypts project secrets locally using **AES-256-GCM** and injects them directly into running sub-processes without leaving plaintext `.env` files on disk.

### ⚔️ Competitive Edge: How EnvVault Compares

Unlike other tools that force complex setup or dump plain text files on disk:

1. **Zero External Servers / 100% Offline**: Unlike `@iserp/envvault`, there are no remote hubs (`https://YOUR_HUB`), dashboard signups, or monthly cloud costs. It works 100% offline out of the box.
2. **Zero Web App / PAT Token Friction**: Unlike `@env-vault/cli`, you don't need to visit a web app (`env-locker.vercel.app`), manage Age keys, store TOTP secrets, or create GitHub Personal Access Tokens.
3. **Memory-Only Subprocess Injection (`envvault run`)**: Tools that pull plaintext `.env` files onto your disk leave passwords vulnerable to malware or accidental `git add .` leaks. EnvVault injects secrets **directly into process memory (`process.env`)**.
4. **Built-in Security Linter (`envvault audit`)**: Includes an automated scanner to detect plaintext file leaks and un-ignored secrets before pushing to Git.

---

### Feature Comparison Matrix

| Feature | Plain `.env` | HashiCorp Vault | `@iserp/envvault` | `@env-vault/cli` | **EnvVault (`@ayoola-tech2024`)** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **AES-256 Encryption** | ❌ | ✅ | ⚠️ Basic | ✅ Age | **✅ AES-256-GCM** |
| **Setup Time** | 1 min | 2+ hours | 30 mins | 15 mins | **30 seconds** |
| **Offline First** | ✅ | ✅ | ❌ Hub Req | ❌ Web Req | **✅ 100% Offline** |
| **No External Tokens / PATs** | ✅ | ❌ | ❌ | ❌ Required | **✅ Zero Tokens Needed** |
| **Direct Memory Injection** | ❌ | ⚠️ Complex | ❌ Disk pull | ❌ Disk pull | **✅ `envvault run`** |
| **Git Leak Auditor** | ❌ | ❌ | ❌ | ❌ | **✅ `envvault audit`** |

---

## 🚀 Quick Start

### 1. Installation

```bash
npm install -g @ayoola-tech2024/envvault
```

### 2. Initialize Vault

Initialize a password-protected `.envvault` storage file in your project directory:

```bash
envvault init
```

### 3. Add Encrypted Secrets

```bash
envvault set DATABASE_URL "postgresql://admin:secret@localhost:5432/mydb"
envvault set STRIPE_SECRET_KEY "sk_test_51Mz..."
```

### 4. Run Application with Injected Secrets

Execute your app without ever creating plain text `.env` files on disk:

```bash
envvault run -- npm start
```

---

## 🛠️ CLI Command Reference

```bash
# Initialize encrypted vault in current project
envvault init

# Add or update an encrypted secret variable
envvault set DATABASE_URL "postgres://..."

# Retrieve a single decrypted secret
envvault get DATABASE_URL

# Output raw secret for shell scripts & piping (e.g. export DB=$(envvault get DB --raw))
envvault get DATABASE_URL --raw

# List all stored keys (masked output by default)
envvault list

# List all keys with unmasked values
envvault list --show-values

# Delete a secret
envvault delete DATABASE_URL

# Audit current directory for plaintext .env leaks & git safety
envvault audit

# Execute any command with injected secrets
envvault run -- node server.js

# Export secrets to .env, JSON, or GitHub Actions CI/CD format
envvault export --format=env
envvault export --format=json
envvault export --format=github-actions
```

---

## 🛡️ Security Audit & Linters

EnvVault comes with a built-in security auditor to inspect your codebase for security vulnerabilities:

```bash
envvault audit
```

**What it checks:**
- ✅ Validates `.envvault` is present and encrypted.
- 🔍 Detects leftover plaintext files (`.env`, `.env.local`, `.env.production`).
- 🚨 Alerts if unencrypted `.env` files are tracked in Git.

---

## 🛡️ Cryptographic Security Architecture

1. **AES-256-GCM Authenticated Encryption**: Every vault payload is encrypted using Galois/Counter Mode (GCM), providing confidentiality and tamper-proof authentication.
2. **PBKDF2 Key Derivation**: 100,000 iterations of SHA-512 derive a 256-bit cryptographic key from your master password and a 32-byte cryptographically secure random salt.
3. **Zero External Crypto Dependencies**: Uses Node.js native `node:crypto` engine for maximum performance, security, and auditability.
4. **Git Protection**: Automatically detects or creates `.gitignore` and appends `.envvault` to ensure secret vaults are handled safely.

---

## 🤖 CI/CD Integration

Set the `ENVVAULT_PASSWORD` environment variable in your GitHub Actions, GitLab CI, or Docker container to automate secret decryption in pipelines:

```yaml
# GitHub Actions Example (.github/workflows/deploy.yml)
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '20'
  
  - run: npm install -g @ayoola-tech2024/envvault
  - run: envvault run -- npm run build
    env:
      ENVVAULT_PASSWORD: ${{ secrets.ENVVAULT_MASTER_PASSWORD }}
```

---

## 💬 Community & Social Copy Reference

Sharing **EnvVault** on Twitter/X, LinkedIn, or Reddit? Check out our ready-to-post announcements in the project repository or tweet your feedback tag **[@Ayoola-tech2024](https://github.com/Ayoola-tech2024)**!

---

## 📄 License

MIT © 2026 [Ayoola Damisile](https://github.com/Ayoola-tech2024)
