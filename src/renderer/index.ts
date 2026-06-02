import type { RunResult, RecastOptions } from '../lib/types';

export async function render(
  run: RunResult,
  outputPath: string,
  _options: RecastOptions,
): Promise<string> {
  // TODO spec-03: buildSrt(run.steps) → recast fluent pipeline → outputPath
  console.log(`[renderer stub] would render ${run.steps.length} steps → ${outputPath}`);
  return outputPath;
}
