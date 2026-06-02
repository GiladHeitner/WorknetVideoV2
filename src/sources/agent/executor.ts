import type { Page } from 'playwright';
import type { GeneratedCode } from '../../lib/types';

export interface ExecuteResult {
  success: boolean;
  error?: string;
  startMs: number;
  endMs: number;
}

export async function execute(code: GeneratedCode, page: Page): Promise<ExecuteResult> {
  const startMs = Date.now();
  try {
    const fn = new Function('page', `return (async () => {\n${code.code}\n})()`) as
      (page: Page) => Promise<unknown>;
    await fn(page);
    // Let network settle after the action before the next screenshot
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    return { success: true, startMs, endMs: Date.now() };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      startMs,
      endMs: Date.now(),
    };
  }
}
