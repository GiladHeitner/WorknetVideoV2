import fs from 'fs';
import OpenAI from 'openai';
import type { Page } from 'playwright';
import type { AgentAction, CompletedStep, RecordOptions, RunResult } from '../../lib/types';
import type { WorknetEmitter } from '../../lib/events';
import { launchBrowser } from '../../browser/context';
import { callPlanner, BLANK_SCREENSHOT } from './planner';
import { callGenerator } from './generator';
import { callHealer } from './healer';
import { execute } from './executor';
import { extractDom } from './dom';

const MAX_HEAL_ATTEMPTS = 3;
const TRACE_PATH = 'out/trace.zip';

async function takeScreenshot(page: Page): Promise<string> {
  return (await page.screenshot({ type: 'png' })).toString('base64');
}

export async function runAgentLoop(
  goal: string,
  options: RecordOptions,
  emitter: WorknetEmitter,
): Promise<RunResult> {
  fs.mkdirSync('out', { recursive: true });

  const openai = new OpenAI();
  const maxSteps = options.maxSteps ?? 30;

  // Pre-flight planner call to determine starting URL so auth state can be loaded
  const firstAction = await callPlanner(openai, goal, 'about:blank', BLANK_SCREENSHOT, []);
  const startUrl =
    firstAction.action === 'navigate' && firstAction.url ? firstAction.url : 'about:blank';

  const { browser, context } = await launchBrowser(startUrl, options);
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  const history: CompletedStep[] = [];
  const startTime = Date.now();
  let url = 'about:blank';
  let screenshot = BLANK_SCREENSHOT;

  // firstAction is already planned — queue it so we don't call the planner twice
  let pendingAction: AgentAction | null = firstAction;

  try {
    for (let i = 0; i < maxSteps; i++) {
      const action = pendingAction ?? await callPlanner(openai, goal, url, screenshot, history);
      pendingAction = null;

      emitter.emitStepStart(action);
      if (action.done) {
        console.log(`\n✓ Agent marked goal complete after ${i} step(s).`);
        break;
      }

      const stepStart = Date.now();

      // Generator does not need a DOM snapshot for navigate actions
      const dom = action.action === 'navigate' ? '' : await extractDom(page);
      let code = await callGenerator(openai, action, dom, url);
      let result = await execute(code, page);
      let healAttempts = 0;

      if (!result.success) {
        for (let h = 1; h <= MAX_HEAL_ATTEMPTS; h++) {
          healAttempts = h;
          emitter.emitStepHealing(h, result.error ?? 'unknown error');

          const freshShot = await takeScreenshot(page);
          const freshDom = await extractDom(page);

          try {
            code = await callHealer(
              openai, code, result.error ?? '', freshShot, freshDom, page.url(), action, h,
            );
            result = await execute(code, page);
            if (result.success) break;
          } catch {
            // healer itself failed — keep trying until MAX_HEAL_ATTEMPTS
          }
        }
      }

      // Capture live state after action (success or not — planner sees what actually happened)
      screenshot = await takeScreenshot(page);
      url = page.url();

      const step: CompletedStep = {
        index: i,
        action,
        code: code.code,
        startMs: stepStart - startTime,   // relative to recording start for SRT alignment
        endMs: Date.now() - startTime,
        healAttempts,
      };
      history.push(step);
      emitter.emitStepDone(step);
    }
  } finally {
    await context.tracing.stop({ path: TRACE_PATH });
    await browser.close();
  }

  const run: RunResult = {
    steps: history,
    tracePath: TRACE_PATH,
    totalMs: Date.now() - startTime,
  };
  emitter.emitAgentDone(run);
  return run;
}
