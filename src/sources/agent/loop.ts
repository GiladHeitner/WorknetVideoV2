import OpenAI from 'openai';
import type { CompletedStep, RecordOptions, RunResult } from '../../lib/types';
import type { WorknetEmitter } from '../../lib/events';
import { callPlanner, BLANK_SCREENSHOT } from './planner';
import { callGenerator } from './generator';
import { execute } from './executor';

const MAX_STEPS = 30;
const TRACE_PATH_STUB = 'out/trace.zip'; // real path set in spec-02

export async function runAgentLoop(
  goal: string,
  options: RecordOptions,
  emitter: WorknetEmitter,
): Promise<RunResult> {
  const openai = new OpenAI(); // reads OPENAI_API_KEY from env
  const maxSteps = options.maxSteps ?? MAX_STEPS;
  const history: CompletedStep[] = [];
  const startTime = Date.now();

  // TODO spec-02: launch real browser, start trace
  // For now, loop runs without a browser (stubs only)
  const url = 'about:blank';
  const screenshot = BLANK_SCREENSHOT;

  for (let i = 0; i < maxSteps; i++) {
    const action = await callPlanner(openai, goal, url, screenshot, history);
    emitter.emitStepStart(action);

    if (action.done) {
      console.log(`\n✓ Agent marked goal complete after ${i} step(s).`);
      break;
    }

    const code = await callGenerator(openai, action, '', url);
    const result = await execute(code);

    const step: CompletedStep = {
      index: i,
      action,
      code: code.code,
      startMs: result.startMs,
      endMs: result.endMs,
      healAttempts: 0,
    };

    history.push(step);
    emitter.emitStepDone(step);
  }

  const run: RunResult = {
    steps: history,
    tracePath: TRACE_PATH_STUB,
    totalMs: Date.now() - startTime,
  };

  emitter.emitAgentDone(run);
  return run;
}
