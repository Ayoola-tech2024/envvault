import { spawn } from 'node:child_process';
import { getDecryptedEnv } from './vault.js';

/**
 * Spawns a child process with decrypted secrets injected into process.env.
 * @param {string[]} commandArgs Command and arguments array, e.g. ['npm', 'start']
 * @param {string} password Master password
 * @param {string} dir Directory containing .envvault
 * @returns {Promise<number>} Exit code of child process
 */
export function runWithSecrets(commandArgs, password, dir = process.cwd()) {
  return new Promise((resolve, reject) => {
    if (!commandArgs || commandArgs.length === 0) {
      return reject(new Error('No command specified to run. Usage: envvault run -- <command>'));
    }

    let secrets;
    try {
      secrets = getDecryptedEnv(password, dir);
    } catch (err) {
      return reject(err);
    }

    const mergedEnv = {
      ...process.env,
      ...secrets,
    };

    const [cmd, ...args] = commandArgs;
    
    // Support Windows command execution seamlessly
    const isWin = process.platform === 'win32';
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env: mergedEnv,
      shell: true,
      cwd: dir,
    });

    const cleanup = () => {
      process.removeListener('SIGINT', handleSignal);
      process.removeListener('SIGTERM', handleSignal);
    };

    const handleSignal = (signal) => {
      if (child && !child.killed) {
        child.kill(signal);
      }
    };

    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);

    child.on('error', (err) => {
      cleanup();
      reject(err);
    });

    child.on('exit', (code, signal) => {
      cleanup();
      if (code !== null) {
        resolve(code);
      } else {
        resolve(1);
      }
    });
  });
}
