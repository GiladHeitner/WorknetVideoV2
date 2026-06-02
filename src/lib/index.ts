import type { TutorialOptions, TutorialResult } from './types';
import { WorknetEmitter } from './events';
import { runAgentLoop } from '../sources/agent/loop';
import { render } from '../renderer';

export async function createTutorial(
  prompt: string,
  options: TutorialOptions,
  emitter: WorknetEmitter,
): Promise<TutorialResult> {
  const source = options.source ?? 'agent';
  if (source !== 'agent') throw new Error(`Source "${source}" not yet implemented`);

  const run = await runAgentLoop(prompt, options, emitter);

  const outputPath = options.output ?? 'out/tutorial.mp4';
  emitter.emitRenderStart();
  const videoPath = await render(run, outputPath, options.recast ?? {});
  emitter.emitRenderDone(videoPath);

  const result: TutorialResult = { videoPath, run };
  emitter.emitDone(result);
  return result;
}

export { WorknetEmitter };
export * from './types';
