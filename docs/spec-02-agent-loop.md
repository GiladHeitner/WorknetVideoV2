# Spec 02 — Agent Loop

## Goal

Wire up a real browser loop: launch Playwright, take live screenshots, run the planner → generator → executor → healer cycle, record a trace, and save `out/trace.zip`. No video rendering yet — the renderer stub stays. By end of this spec `worknet "<prompt>"` opens a real browser and navigates the site autonomously.

## Deliverables

- [ ] `src/sources/agent/dom.ts` — extract simplified DOM snapshot from live page
- [ ] `src/sources/agent/prompts/generator.ts` — generator system prompt
- [ ] `src/sources/agent/prompts/healer.ts` — healer system prompt
- [ ] `src/sources/agent/generator.ts` — real GPT-4o-mini call → `GeneratedCode`
- [ ] `src/sources/agent/healer.ts` — real GPT-4o call → corrected `GeneratedCode`
- [ ] `src/sources/agent/executor.ts` — run generated code against live `page`
- [ ] `src/sources/agent/loop.ts` — full planner → generator → executor → healer cycle with trace
- [ ] `.gitignore` update — add `out/`

## Acceptance Test

```bash
node dist/cli.js "go to npmjs.com and search for playwright" --no-headless
```

Expected behaviour:
1. Browser opens (visible — `--no-headless`)
2. Navigates to `https://npmjs.com`
3. Clicks the search box
4. Types "playwright"
5. Presses Enter
6. Agent marks `done: true` when search results appear
7. `out/trace.zip` is saved
8. Renderer stub logs "would render" and exits cleanly

---

## Implementation Notes

### 1. DOM Snapshot — `src/sources/agent/dom.ts`

The generator needs to know what's on the page without seeing the full HTML. Extract a concise JSON list of visible, interactive elements:

```typescript
export async function extractDom(page: Page): Promise<string> {
  const elements = await page.evaluate(() => {
    const sel = [
      'a', 'button', 'input', 'select', 'textarea',
      '[role="button"]', '[role="link"]', '[role="tab"]',
      '[role="menuitem"]', '[role="combobox"]', '[role="searchbox"]',
    ].join(',');

    return Array.from(document.querySelectorAll(sel))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0; // visible only
      })
      .slice(0, 60) // cap at 60 elements
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        type: (el as HTMLInputElement).type || null,
        id: el.id || null,
        name: el.getAttribute('name'),
        text: el.textContent?.trim().slice(0, 80) || null,
        placeholder: el.getAttribute('placeholder'),
        ariaLabel: el.getAttribute('aria-label'),
        testId: el.getAttribute('data-testid'),
        href: el instanceof HTMLAnchorElement ? el.href : null,
      }));
  });
  return JSON.stringify(elements, null, 2);
}
```

Send this JSON string to the generator. It gives it enough signal to choose a reliable selector without processing the full DOM.

### 2. Generator — `src/sources/agent/generator.ts`

**Model:** `gpt-4o-mini` (text-only, no screenshot needed → cheaper)

**Input:** `AgentAction` + DOM snapshot JSON + current URL

**Output:** `GeneratedCode` via OpenAI structured output

```typescript
const GeneratedCodeSchema = z.object({
  code: z.string().describe(
    'One or more awaited Playwright expressions. Use page as the variable name. No imports.'
  ),
  selector: z.string().describe(
    'The primary selector or locator used, e.g. `text=Submit` or `#search-input`'
  ),
});
```

**Key rule in the system prompt:** prefer selectors in this order:
1. `getByRole` / `getByText` / `getByPlaceholder` (most resilient)
2. `data-testid` attribute
3. `id` or `name` attribute
4. CSS class (last resort)

For `navigate` actions, skip the DOM snapshot — just generate `await page.goto('${action.url}')`.

### 3. Executor — `src/sources/agent/executor.ts`

Run the generated code string against the live Playwright `page` using `new Function`:

```typescript
export async function execute(code: GeneratedCode, page: Page): Promise<ExecuteResult> {
  const startMs = Date.now();
  try {
    const fn = new Function('page', `return (async () => {\n${code.code}\n})()`);
    await fn(page);
    // Wait for network to settle after action
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
```

The `networkidle` wait after each action gives the page time to settle before the next screenshot.

### 4. Healer — `src/sources/agent/healer.ts`

**Model:** `gpt-4o` (needs vision — takes a fresh screenshot of the failure state)

**When called:** executor returns `success: false`

**Input:** original `GeneratedCode`, error message, fresh screenshot, fresh DOM snapshot, original `AgentAction`

**Output:** corrected `GeneratedCode` (same schema as generator)

The healer prompt should instruct it to:
- Diagnose whether the selector is wrong, the element isn't visible, or the page state changed
- Try a different selector strategy
- Add a `page.waitForSelector(...)` if the element needs time to appear
- Add `page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))` if the element might be off-screen

**Max attempts:** 3. After 3 failures, the executor error is recorded in `CompletedStep` history and the planner is called again — it will see the failed step and choose a different approach.

### 5. Loop — `src/sources/agent/loop.ts`

Full updated loop with real browser:

```typescript
export async function runAgentLoop(goal, options, emitter): Promise<RunResult> {
  fs.mkdirSync('out', { recursive: true });

  const { browser, context } = await launchBrowser(startUrl, options);
  await context.tracing.start({ screenshots: true, snapshots: true });

  const page = await context.newPage();
  const tracePath = 'out/trace.zip';
  const startTime = Date.now();
  const history: CompletedStep[] = [];

  // Extract starting URL from first planner call
  // (planner will navigate there as step 1)
  let url = 'about:blank';
  let screenshot = BLANK_SCREENSHOT;

  try {
    for (let i = 0; i < maxSteps; i++) {
      const action = await callPlanner(openai, goal, url, screenshot, history);
      emitter.emitStepStart(action);
      if (action.done) break;

      const stepStart = Date.now();
      const dom = action.action === 'navigate' ? '' : await extractDom(page);
      let code = await callGenerator(openai, action, dom, url);

      let result = await execute(code, page);
      let healAttempts = 0;

      if (!result.success) {
        for (let h = 1; h <= 3; h++) {
          healAttempts = h;
          emitter.emitStepHealing(h, result.error!);
          const freshShot = (await page.screenshot()).toString('base64');
          const freshDom = await extractDom(page);
          try {
            code = await callHealer(openai, code, result.error!, freshShot, freshDom, action, h);
            result = await execute(code, page);
            if (result.success) break;
          } catch { break; }
        }
      }

      // Take fresh screenshot + URL after action (success or not)
      screenshot = (await page.screenshot()).toString('base64');
      url = page.url();

      const step: CompletedStep = { index: i, action, code: code.code,
        startMs: stepStart, endMs: Date.now(), healAttempts };
      history.push(step);
      emitter.emitStepDone(step);
    }
  } finally {
    await context.tracing.stop({ path: tracePath });
    await browser.close();
  }

  const run: RunResult = { steps: history, tracePath, totalMs: Date.now() - startTime };
  emitter.emitAgentDone(run);
  return run;
}
```

### 6. Starting URL

The planner's first action is always a `navigate`. The loop should extract the starting URL from the prompt context rather than passing `about:blank` forever. Two options:
- Extract the URL from the first planner `navigate` action and use it as `startUrl` for `launchBrowser`
- Or: always start at `about:blank` and let the planner's navigate action drive the first `page.goto()`

**Use option B** — simpler. The executor handles `navigate` actions via `page.goto()` like any other action. No special-casing in the loop.

### 7. Generator prompt (`src/sources/agent/prompts/generator.ts`)

```
You are a Playwright code generator. Given a browser action and a list of visible DOM elements, write the minimal Playwright code to perform it.

Rules:
- Use `page` as the page variable. Never import anything.
- Prefer: getByRole > getByText > getByPlaceholder > data-testid > id/name > CSS
- For navigate actions: await page.goto('<url>')
- For fill actions: clear then fill — await page.locator(...).clear(); await page.locator(...).fill('<value>')
- For key actions: await page.keyboard.press('<key>')
- Output only executable statements. No comments, no variable declarations unless needed.
- Keep it short — usually 1-3 lines.
```

### 8. Healer prompt (`src/sources/agent/prompts/healer.ts`)

```
You are a Playwright debugging expert. A Playwright action failed. Diagnose the problem and write corrected code.

Given:
- The original code that failed
- The error message
- A fresh screenshot of the current page state
- A fresh list of visible DOM elements
- The original intent

Common fixes:
- Wrong selector → pick a better one from the DOM list
- Element not yet visible → prepend await page.waitForSelector('...', { timeout: 5000 })
- Element off-screen → prepend await page.evaluate(() => window.scrollTo(0, 500))
- Modal/overlay blocking → dismiss it first (e.g. await page.keyboard.press('Escape'))

Output corrected Playwright code only.
```

---

## Acceptance Test Detail

Running against npmjs.com (public, no login required):

```bash
node dist/cli.js "go to npmjs.com and search for playwright" --no-headless
```

The terminal should show something like:

```
→ [navigate] https://npmjs.com
  ✓ Let's start by navigating to the npm registry.

→ [click] the search input field
  ✓ Now we'll click on the search bar to start our search.

→ [fill] the search input field
  ✓ We'll type "playwright" to search for the package.

→ [key] Enter
  ✓ Pressing Enter to submit the search.

✓ Agent marked goal complete after 4 step(s).

[renderer stub] would render 4 steps → out/tutorial.mp4
```

And `out/trace.zip` exists on disk.

## Next Spec

spec-03: Renderer — buildSrt() + playwright-recast pipeline → final .mp4
