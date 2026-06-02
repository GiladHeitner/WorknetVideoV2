import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { RecordOptions } from '../lib/types';
import { loadAuthPath } from './auth';

export interface BrowserHandle {
  browser: Browser;
  context: BrowserContext;
}

export async function launchBrowser(
  startUrl: string,
  options: RecordOptions = {},
): Promise<BrowserHandle> {
  const hostname = new URL(startUrl).hostname;
  const savedAuth = options.authPath ?? loadAuthPath(hostname);

  const browser = await chromium.launch({
    channel: options.useChrome ? 'chrome' : undefined,
    headless: options.headless ?? true,
  });

  const context = await browser.newContext({
    storageState: savedAuth ?? undefined,
    viewport: { width: 1280, height: 720 },
    // Trace recording is started in spec-02 via context.tracing.start()
  });

  return { browser, context };
}
