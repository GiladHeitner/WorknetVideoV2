#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { chromium } from 'playwright';
import { createTutorial, WorknetEmitter } from './lib/index';
import { callPlanner, BLANK_SCREENSHOT } from './sources/agent/planner';
import { saveAuth } from './browser/auth';
import OpenAI from 'openai';

const program = new Command();

program
  .name('worknet')
  .description('AI-driven tutorial video generator')
  .version('0.1.0');

// ── Main command ────────────────────────────────────────────────────────────
program
  .argument('<prompt>', 'What to demonstrate (e.g. "walk through YouTube Studio")')
  .option('-o, --output <path>', 'Output video path', 'out/tutorial.mp4')
  .option('--headless', 'Run browser headlessly (default)', true)
  .option('--no-headless', 'Show browser window')
  .option('--chrome', 'Use installed Chrome instead of Chromium (for cookie-heavy sites like Salesforce)')
  .option('--dry-run', 'Call planner once and print the action without opening a browser')
  .option('--max-steps <n>', 'Max agent iterations', '30')
  .option('--voice <voice>', 'OpenAI TTS voice', 'nova')
  .action(async (prompt: string, opts) => {
    if (!process.env.OPENAI_API_KEY) {
      console.error('Error: OPENAI_API_KEY is not set.');
      process.exit(1);
    }

    if (opts.dryRun) {
      console.log('Dry run — calling planner with blank screenshot...\n');
      const openai = new OpenAI();
      const action = await callPlanner(openai, prompt, 'about:blank', BLANK_SCREENSHOT, []);
      console.log(JSON.stringify(action, null, 2));
      return;
    }

    const emitter = new WorknetEmitter();

    emitter.on('agent:step:start', (action) => {
      console.log(`\n→ [${action.action}] ${action.target ?? action.url ?? action.value ?? ''}`);
    });
    emitter.on('agent:step:done', (step) => {
      console.log(`  ✓ ${step.action.narration}`);
    });
    emitter.on('agent:step:healing', (attempt, error) => {
      console.log(`  ⚠ healing attempt ${attempt}: ${error}`);
    });
    emitter.on('render:start', () => console.log('\nRendering video...'));
    emitter.on('render:done', (p) => console.log(`✓ Video saved to ${p}`));
    emitter.on('error', (err) => { console.error(err); process.exit(1); });

    await createTutorial(prompt, {
      headless: opts.headless,
      useChrome: opts.chrome,
      maxSteps: parseInt(opts.maxSteps, 10),
      output: opts.output,
      recast: { voice: opts.voice },
    }, emitter);
  });

// ── Login subcommand ─────────────────────────────────────────────────────────
program
  .command('login <url>')
  .description('Open browser for manual login, then save session for future runs')
  .option('--chrome', 'Use installed Chrome')
  .action(async (url: string, opts) => {
    const hostname = new URL(url).hostname;
    console.log(`Opening browser for ${hostname}...`);
    console.log('Log in, then press Enter here to save your session.\n');

    const browser = await chromium.launch({
      channel: opts.chrome ? 'chrome' : undefined,
      headless: false,
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.goto(url);

    await new Promise<void>((resolve) => {
      process.stdin.resume();
      process.stdin.once('data', () => resolve());
    });

    const saved = await saveAuth(hostname, context);
    await browser.close();
    console.log(`\n✓ Session saved to ${saved}`);
  });

program.parse();
