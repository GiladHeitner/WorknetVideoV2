import fs from 'fs';
import path from 'path';
import type { BrowserContext } from 'playwright';

const AUTH_DIR = path.join(process.cwd(), '.worknet', 'auth');

function authPath(hostname: string): string {
  const safe = hostname.replace(/[^a-z0-9.-]/gi, '_');
  return path.join(AUTH_DIR, `${safe}.json`);
}

export function authExists(hostname: string): boolean {
  return fs.existsSync(authPath(hostname));
}

export async function saveAuth(hostname: string, context: BrowserContext): Promise<string> {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const dest = authPath(hostname);
  await context.storageState({ path: dest });
  return dest;
}

export function loadAuthPath(hostname: string): string | null {
  const p = authPath(hostname);
  return fs.existsSync(p) ? p : null;
}
