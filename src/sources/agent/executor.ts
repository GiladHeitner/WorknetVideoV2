import type { GeneratedCode } from '../../lib/types';

export interface ExecuteResult {
  success: boolean;
  error?: string;
  startMs: number;
  endMs: number;
}

export async function execute(
  _code: GeneratedCode,
  // page: Page — added in spec-02
): Promise<ExecuteResult> {
  // TODO spec-02: eval code against live Playwright page
  const startMs = Date.now();
  console.log(`  [executor stub] would run: ${_code.code}`);
  return { success: true, startMs, endMs: Date.now() };
}
