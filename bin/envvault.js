#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'node:fs';

import {
  initVault,
  setSecret,
  getSecret,
  listSecrets,
  deleteSecret,
  exportSecrets,
  auditSecurity,
  isVaultInitialized,
  VAULT_FILE,
} from '../src/vault.js';
import { runWithSecrets } from '../src/runner.js';

const BANNER = `
${chalk.cyan('  ███████╗███╗   ██╗██╗   ██╗██╗   ██╗██████╗  ██████╗ ██╗     ████████╗')}
${chalk.cyan('  ██╔════╝████╗  ██║██║   ██║██║   ██║██╔══██╗██╔═══██╗██║     ╚══██╔══╝')}
${chalk.blue('  █████╗  ██╔██╗ ██║██║   ██║██║   ██║██████╔╝██║   ██║██║        ██║   ')}
${chalk.blue('  ██╔══╝  ██║╚██╗██║╚██╗ ██╔╝██║   ██║██╔══██╗██║   ██║██║        ██║   ')}
${chalk.magenta('  ███████╗██║ ╚████║ ╚████╔╝ ╚██████╔╝██████╔╝╚██████╔╝███████╗   ██║   ')}
${chalk.magenta('  ╚══════╝╚═╝  ╚═══╝  ╚═══╝   ╚═════╝ ╚═════╝  ╚═════╝ ╚══════╝   ╚═╝   ')}
${chalk.gray('      🔐 AES-256-GCM Encrypted Secret Manager by Ayoola Damisile')}
`;

const program = new Command();

program
  .name('envvault')
  .description('🔐 Secure, encrypted environment variable manager with AES-256-GCM & zero external crypto')
  .version('1.1.0')
  .addHelpText('before', BANNER);

/**
 * Prompt for master password if ENVVAULT_PASSWORD is not set.
 */
async function getMasterPassword(promptMsg = 'Enter master password:') {
  if (process.env.ENVVAULT_PASSWORD) {
    return process.env.ENVVAULT_PASSWORD;
  }
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'password',
      message: promptMsg,
      mask: '*',
      validate: (input) => (input ? true : 'Master password cannot be empty.'),
    },
  ]);
  return answers.password;
}

/**
 * Command: init
 */
program
  .command('init')
  .description('Initialize a new encrypted .envvault in the current directory')
  .action(async () => {
    try {
      console.log(BANNER);

      if (isVaultInitialized()) {
        console.log(chalk.yellow(`\n⚠️  Vault already exists at '${VAULT_FILE}'.`));
        return;
      }

      let password = process.env.ENVVAULT_PASSWORD;
      if (!password) {
        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'password',
            message: 'Create a master password for this vault:',
            mask: '*',
            validate: (input) => (input.length >= 4 ? true : 'Password must be at least 4 characters.'),
          },
          {
            type: 'password',
            name: 'confirmPassword',
            message: 'Confirm master password:',
            mask: '*',
            validate: (input, answers) =>
              input === answers.password ? true : 'Passwords do not match.',
          },
        ]);
        password = answers.password;
      }

      const spinner = ora('Creating encrypted vault & updating .gitignore...').start();
      const vaultPath = initVault(password);
      spinner.succeed(chalk.green(`Vault successfully initialized at ${chalk.bold(vaultPath)}`));
      console.log(chalk.gray(`\n💡 Tip: Keep your master password safe. Run ${chalk.cyan('envvault set KEY VALUE')} to add your first secret.\n`));
    } catch (err) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

/**
 * Command: set <key> [value]
 */
program
  .command('set')
  .argument('<key>', 'Environment variable key name (e.g. DATABASE_URL)')
  .argument('[value]', 'Environment variable secret value')
  .description('Set an encrypted secret variable in the vault')
  .action(async (key, value) => {
    try {
      if (!value) {
        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'val',
            message: `Enter value for secret '${key}':`,
            mask: '*',
            validate: (input) => (input !== undefined ? true : 'Value cannot be empty.'),
          },
        ]);
        value = answers.val;
      }

      const password = await getMasterPassword();
      const spinner = ora(`Encrypting and storing '${key}'...`).start();
      setSecret(key, value, password);
      spinner.succeed(chalk.green(`Secret '${chalk.bold(key)}' saved & encrypted in vault!`));
    } catch (err) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

/**
 * Command: get <key>
 */
program
  .command('get')
  .argument('<key>', 'Environment variable key name')
  .option('-r, --raw', 'Output raw decrypted secret value without formatting (great for shell piping)', false)
  .description('Retrieve and decrypt a specific secret value')
  .action(async (key, options) => {
    try {
      const password = await getMasterPassword();
      const value = getSecret(key, password);

      if (options.raw) {
        process.stdout.write(value);
      } else {
        console.log(`\n${chalk.bold.cyan(key)} = ${chalk.green(value)}\n`);
      }
    } catch (err) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

/**
 * Command: list
 */
program
  .command('list')
  .option('-s, --show-values', 'Display decrypted values in terminal output', false)
  .description('List all stored secret keys in the vault')
  .action(async (options) => {
    try {
      const password = await getMasterPassword();
      const secrets = listSecrets(password);

      if (secrets.length === 0) {
        console.log(chalk.yellow('\n📭 Vault is empty. Add a secret with `envvault set KEY VALUE`.\n'));
        return;
      }

      console.log(chalk.bold.cyan(`\n🔐 Stored Secrets (${secrets.length}):\n`));
      secrets.forEach(({ key, value, masked }) => {
        const valDisplay = options.showValues ? chalk.green(value) : chalk.gray(masked);
        console.log(`  ${chalk.bold(key.padEnd(25))} : ${valDisplay}`);
      });
      console.log('');
    } catch (err) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

/**
 * Command: delete <key>
 */
program
  .command('delete')
  .argument('<key>', 'Environment variable key name to delete')
  .alias('rm')
  .description('Delete a secret from the vault')
  .action(async (key) => {
    try {
      const password = await getMasterPassword();
      const spinner = ora(`Deleting '${key}'...`).start();
      deleteSecret(key, password);
      spinner.succeed(chalk.green(`Secret '${chalk.bold(key)}' deleted from vault.`));
    } catch (err) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

/**
 * Command: run -- <command...>
 */
program
  .command('run')
  .argument('<command...>', 'Command to run with decrypted secrets injected into environment')
  .description('Run any command with vault secrets injected into process.env')
  .allowUnknownOption()
  .action(async (commandArgs) => {
    try {
      const password = await getMasterPassword('Enter master password to unlock vault:');
      const code = await runWithSecrets(commandArgs, password);
      process.exit(code);
    } catch (err) {
      console.error(chalk.red(`\n❌ Execution Error: ${err.message}`));
      process.exit(1);
    }
  });

/**
 * Command: export
 */
program
  .command('export')
  .option('-f, --format <type>', 'Export format: env, json, or github-actions', 'env')
  .option('-o, --output <filepath>', 'Save exported secrets to file path')
  .description('Export vault secrets to .env, JSON, or GitHub Actions format')
  .action(async (options) => {
    try {
      const password = await getMasterPassword();
      const outputStr = exportSecrets(options.format, password);

      if (options.output) {
        fs.writeFileSync(options.output, outputStr, 'utf8');
        console.log(chalk.green(`\n✅ Secrets exported to '${chalk.bold(options.output)}' (${options.format} format)\n`));
      } else {
        console.log(`\n${outputStr}\n`);
      }
    } catch (err) {
      console.error(chalk.red(`\n❌ Export Error: ${err.message}`));
      process.exit(1);
    }
  });

/**
 * Command: audit
 */
program
  .command('audit')
  .description('Audit project directory for unencrypted .env leaks & git security risks')
  .action(() => {
    console.log(BANNER);
    console.log(chalk.bold.cyan('\n🛡️  Running EnvVault Security Audit...\n'));

    const audit = auditSecurity();

    if (audit.vaultExists) {
      console.log(chalk.green('  ✅ Encrypted .envvault storage detected.'));
    } else {
      console.log(chalk.yellow('  ⚠️  No .envvault initialized yet. Run `envvault init` to create one.'));
    }

    if (audit.isVaultGitignored) {
      console.log(chalk.green('  ✅ .envvault is properly listed in .gitignore.'));
    } else if (audit.vaultExists) {
      console.log(chalk.red('  ❌ CRITICAL: .envvault is NOT in .gitignore! Add it immediately to avoid committing key files.'));
    }

    if (audit.foundUnencrypted.length > 0) {
      console.log(chalk.yellow(`\n  ⚠️  Found ${audit.foundUnencrypted.length} unencrypted plaintext .env file(s) on disk:`));
      audit.foundUnencrypted.forEach(f => {
        const status = f.isIgnored ? chalk.gray('(GitIgnored)') : chalk.red('⚠️ EXPOSED IN GIT!');
        console.log(`     - ${chalk.bold(f.filename)} ${status}`);
      });
      console.log(chalk.cyan('\n  💡 Recommendation: Move these secrets into EnvVault with `envvault set KEY VALUE` and delete plain .env files!\n'));
    } else {
      console.log(chalk.green('  ✅ No plain text .env files exposed on disk.\n'));
    }
  });

program.parse(process.argv);
