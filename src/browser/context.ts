import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { RecordOptions } from '../lib/types';
import { loadAuthPath } from './auth';

export interface BrowserHandle {
  browser: Browser;
  context: BrowserContext;
}

function hostnameOrEmpty(url: string): string {
  try { return new URL(url).hostname; } catch { return ''; }
}

export async function launchBrowser(
  startUrl: string,
  options: RecordOptions = {},
): Promise<BrowserHandle> {
  const hostname = hostnameOrEmpty(startUrl);
  const savedAuth = hostname ? (options.authPath ?? loadAuthPath(hostname)) : null;

  const browser = await chromium.launch({
    channel: options.useChrome ? 'chrome' : undefined,
    headless: options.headless ?? true,
  });

  const context = await browser.newContext({
    storageState: savedAuth ?? undefined,
    viewport: { width: 1280, height: 720 },
  });

  return { browser, context };
}
