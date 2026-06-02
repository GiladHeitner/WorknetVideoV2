# Worknet Video Documentation

## Purpose

A CLI/programmatic tool that takes a natural-language prompt, autonomously navigates a website using a Playwright agent loop (planner → generator → healer), records a trace, then renders a narrated tutorial video via playwright-recast.

**Example:**
```
worknet "walk through the YouTube Studio dashboard"
```
→ produces `out/youtube-dashboard-tutorial.mp4` with screen recording, cursor overlay, zoom effects, and spoken narration.

---

## Architecture

```
User Prompt + starting URL
    │
    ▼
┌──────────────────────────────────────────────────────┐
│                  Agent Loop                           │
│               src/sources/agent/                      │
│                                                       │
│  ┌──────────┐   screenshot + goal + history          │
│  │          │◄─────────────────────────────────┐     │
│  │ Planner  │  "What is the next action?"       │     │
│  │  gpt-4o  │  → AgentAction (what + narration) │     │
│  └────┬─────┘                                   │     │
│       │ AgentAction                              │     │
│       ▼                                         │     │
│  ┌──────────┐                                   │     │
│  │Generator │  "Write Playwright code for       │     │
│  │gpt-4o-mini  this action on this page"        │     │
│  │          │  → playwright code string          │     │
│  └────┬─────┘                                   │     │
│       │ code                                    │     │
│       ▼                                         │     │
│  ┌──────────┐  success ──────────────────────► │     │
│  │ Executor │                                   │     │
│  │Playwright│  failure                          │     │
│  │ + trace  │──────────┐                        │     │
│  └──────────┘          │                        │     │
│                        ▼                        │     │
│                   ┌──────────┐                  │     │
│                   │  Healer  │  corrected code  │     │
│                   │  gpt-4o  │─────────────────►│     │
│                   └──────────┘  (max 3 retries) │     │
│                                                 │     │
│  Loop until Planner returns { done: true }      │     │
└──────────────────────────────────────────────────────┘
    │
    │  trace.zip  +  CompletedStep[] (with narration strings + timings)
    ▼
┌──────────────────────────────────────────────────────┐
│              Renderer  src/renderer/                  │
│                                                       │
│  1. Build narration.srt from CompletedStep timings   │
│                                                       │
│  2. playwright-recast fluent pipeline:               │
│                                                       │
│     Recast.from(trace.zip)                           │
│       .parse()                                        │
│       .speedUp({ duringIdle: 3, duringUserAction: 1})│
│       .subtitlesFromSrt(narration.srt)                │
│       .cursorOverlay()          ← built into recast  │
│       .clickEffect()            ← built into recast  │
│       .autoZoom()               ← built into recast  │
│       .voiceover(OpenAIProvider({ voice }))           │
│       .render({ burnSubtitles: true, ... })           │
│       .toFile(output.mp4)                             │
└──────────────────────────────────────────────────────┘
    ▼
out/tutorial.mp4
```

---

## What playwright-recast handles (no custom code needed)

playwright-recast is a complete fluent pipeline. We do **not** need to implement these ourselves:

| Feature | playwright-recast API |
|---|---|
| Trace → video frames | `.parse()` |
| Speed up idle/navigation | `.speedUp({ duringIdle, duringUserAction })` |
| TTS narration (OpenAI) | `.voiceover(OpenAIProvider({ voice, speed }))` |
| Subtitle generation from SRT | `.subtitlesFromSrt(path)` |
| Subtitle burn-in with styling | `.render({ burnSubtitles: true, subtitleStyle: { ... } })` |
| Cursor overlay animation | `.cursorOverlay()` |
| Click ripple effect | `.clickEffect()` |
| Auto-zoom to actions | `.autoZoom()` |
| Frame interpolation | `.interpolate()` |
| Background music | `.backgroundMusic({ path, volume })` |
| Intro / outro clips | `.intro()` / `.outro()` |

Our renderer (`src/renderer/`) is thin: build the SRT from agent step timings, then call the recast pipeline.

---

## Extensibility Architecture

### 1. Recording Sources — `src/sources/`

The AI agent loop is one `RecordingSource`. Human recording is another. Both produce the same `RunResult`.

```typescript
interface RecordingSource {
  record(goal: string, options: RecordOptions): Promise<RunResult>;
}
```

| Source | Path | Status |
|---|---|---|
| AI agent (planner/generator/healer) | `src/sources/agent/` | spec-02 |
| Human screen recording | `src/sources/human/` | future |

### 2. Recast Pipeline Config — `RecastOptions`

Instead of a custom `VideoStage` abstraction, expose a typed `RecastOptions` that maps directly to playwright-recast's pipeline methods. This keeps the familiar fluent API while letting callers enable/disable stages.

```typescript
interface RecastOptions {
  // TTS
  voice?: string;              // OpenAI TTS voice (default: 'nova')
  ttsModel?: string;           // default: 'gpt-4o-mini-tts'
  ttsSpeed?: number;           // default: 1.0
  ttsCacheDir?: string;        // disk cache for synthesized audio — saves cost on re-renders

  // Speed
  speedIdle?: number;          // default: 4.0
  speedAction?: number;        // default: 1.0
  speedNavigation?: number;    // default: 2.0
  speedNetworkWait?: number;   // default: 2.0

  // Overlays
  cursorOverlay?: boolean;     // default: true — animated cursor at clicks
  clickEffect?: boolean;       // default: true — ripple animation at clicks
  autoZoom?: boolean;          // default: true — zoom into fill/type actions

  // Output
  interpolate?: boolean;       // default: false — smooth choppy frames via ffmpeg minterpolate
  burnSubtitles?: boolean;     // default: true
  subtitleStyle?: SubtitleStyle;
  resolution?: '720p' | '1080p' | '1440p' | '4k';  // default: '1080p'
  fps?: number;                // default: 60

  // Extras
  backgroundMusic?: string;    // path to audio file
  intro?: string;              // path to video clip
  outro?: string;              // path to video clip
}
```

Adding a new recast feature = add a field to `RecastOptions` + one line in `src/renderer/index.ts`. No new abstraction layers needed.

### 3. Library-First Core — `src/lib/`

All business logic in the library. CLI and future UI are thin consumers.

```typescript
// src/lib/index.ts
export async function createTutorial(
  prompt: string,
  options: TutorialOptions,
  emitter: WorknetEmitter,
): Promise<TutorialResult>;
```

### 4. Event Emitter — `src/lib/events.ts`

Typed event emitter. CLI prints to stdout; future UI subscribes over IPC or WebSocket.

```typescript
interface WorknetEvents {
  'agent:step:start':     (action: AgentAction) => void;
  'agent:step:done':      (step: CompletedStep) => void;
  'agent:step:healing':   (attempt: number, error: string) => void;
  'agent:done':           (result: RunResult) => void;
  'render:start':         () => void;
  'render:done':          (outputPath: string) => void;
  'done':                 (result: TutorialResult) => void;
  'error':                (err: Error) => void;
}
```

### 5. Project Structure

```
src/
  lib/
    index.ts          ← createTutorial() — public API
    events.ts         ← WorknetEmitter (typed EventEmitter)
    types.ts          ← all shared interfaces + Zod schemas
  sources/
    agent/            ← AI-driven source
      planner.ts
      generator.ts
      healer.ts
      executor.ts
      loop.ts
      prompts/
        planner.ts
        generator.ts
        healer.ts
    human/            ← future: screen recording source
  browser/
    context.ts        ← browser launch + auth state management
    auth.ts           ← save/load storageState per domain
  renderer/
    index.ts          ← buildSrt() + recast pipeline call
  cli.ts              ← thin CLI consumer (commander)
  ui/                 ← future: thin UI consumer
.worknet/
  auth/               ← gitignored — storageState JSON per domain
    youtube.com.json
    salesforce.com.json
out/                  ← default output directory (gitignored)
```

---

## Authentication & Session Persistence

Sites like Salesforce, YouTube Studio, and any other login-required product need persistent auth. The program never handles credentials — the user logs in manually once, and the session is saved for all future runs.

### Login Flow

```
worknet login https://salesforce.com
```

1. Opens a **headed** browser (visible, not headless) at the target URL
2. Waits for the user to complete login (pauses with a prompt)
3. Saves the full browser auth state (cookies + localStorage + sessionStorage) to `.worknet/auth/<hostname>.json`
4. Closes the browser

On the next `worknet "..."` run against the same domain, the saved state is loaded automatically.

### Auth State Storage

Playwright's `storageState` saves the complete session:
```typescript
await context.storageState({ path: `.worknet/auth/${hostname}.json` });
```

Loading it on subsequent runs:
```typescript
const context = await browser.newContext({ storageState: authPath });
```

`.worknet/auth/` is gitignored — session tokens never enter version control.

### Chrome vs Chromium

Chromium (Playwright's default bundled browser) has a **smaller per-domain cookie limit** (~180 cookies) than the full Google Chrome binary. Enterprise sites like Salesforce can exceed this, causing silent auth failures.

By default, `worknet` uses **`channel: 'chromium'`**. For sites that hit cookie limits, pass `--chrome` to use the locally installed Google Chrome:

```typescript
const browser = await chromium.launch({
  channel: options.useChrome ? 'chrome' : undefined,  // 'chrome' = real Chrome binary
  headless: options.headless,
});
```

The `--chrome` flag is also auto-suggested when a session fails to stay authenticated after loading a valid `storageState`.

### `RecordOptions` additions

```typescript
interface RecordOptions {
  headless?: boolean;
  maxSteps?: number;
  useChrome?: boolean;      // use installed Chrome instead of Chromium (for cookie-heavy sites)
  authPath?: string;        // override auto-detected auth state path
}
```

### CLI commands

```bash
# Save auth state for a domain
worknet login https://salesforce.com

# Run with auto-loaded auth (detects from starting URL)
worknet "walk through the Salesforce opportunities dashboard"

# Force Chrome binary for cookie-heavy sites
worknet "..." --chrome

# Explicit auth file
worknet "..." --auth .worknet/auth/salesforce.com.json
```

---

## Agent Loop — Planner / Generator / Healer

### LLM Roles

| Role | Model | Why |
|---|---|---|
| Planner | `gpt-4o` | Needs vision (screenshot) + reasoning |
| Generator | `gpt-4o-mini` | Text-only (DOM + intent), cheaper |
| Healer | `gpt-4o` | Needs vision (post-failure screenshot) + debugging |

All three use the `openai` SDK. One `OPENAI_API_KEY`. playwright-recast uses the same key for TTS via `OpenAIProvider`.

### Planner

Reactive, per-iteration. Sees current screenshot + history, returns one `AgentAction`.

```typescript
interface AgentAction {
  done: boolean;
  action: 'navigate' | 'click' | 'scroll' | 'fill' | 'hover' | 'wait' | 'key';
  target?: string;      // natural language: "the Upload button"
  value?: string;       // for fill/key
  url?: string;         // for navigate
  narration: string;    // voice-over text for this step
  reasoning: string;    // internal scratchpad for generator
}
```

### Generator

Turns the planner's intent into executable Playwright code using the DOM snapshot.

```typescript
interface GeneratedCode {
  code: string;     // e.g. `await page.click('#upload-btn')`
  selector: string; // primary selector, for healer context
}
```

### Healer

Called only on execution failure. Attempts corrected code up to 3 times before returning control to the planner.

---

## Data Contracts

```typescript
interface CompletedStep {
  index: number;
  action: AgentAction;
  code: string;
  startMs: number;
  endMs: number;
  healAttempts: number;
}

interface RunResult {
  steps: CompletedStep[];
  tracePath: string;
  totalMs: number;
}

interface TutorialResult {
  videoPath: string;
  run: RunResult;
}

interface RecordOptions {
  headless?: boolean;
  maxSteps?: number;
}

interface TutorialOptions extends RecordOptions {
  output?: string;
  source?: 'agent' | 'human';
  recast?: RecastOptions;
}
```

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `openai` | GPT-4o — planner, generator, healer |
| `playwright` | Browser automation + trace recording |
| `playwright-recast` | Full render pipeline: trace → TTS → cursor → zoom → subtitles → mp4 |
| `commander` | CLI argument parsing |
| `zod` | Runtime schema validation for all LLM outputs |
| `zod-to-json-schema` | Zod schemas → OpenAI structured output schemas |
| `eventemitter3` | Typed event emitter |
| `dotenv` | Env var loading |

`fluent-ffmpeg` removed — playwright-recast handles ffmpeg internally.

---

## Specs

- [spec-01: bootstrap](docs/spec-01-bootstrap.md) — scaffold, types, lib API, events, planner stub
- [spec-02: agent loop](docs/spec-02-agent-loop.md) — planner + generator + healer + executor + trace
- [spec-03: renderer](docs/spec-03-renderer.md) — SRT generation + recast pipeline wiring
- [spec-04: integration](docs/spec-04-integration.md) — end-to-end test on YouTube Studio

---

## Open Questions

- Should the DOM snapshot sent to the generator be a full ARIA tree or simplified HTML? (ARIA is cheaper)
- Max iterations default: 30? Configurable via `--max-steps`
- OpenAI TTS voice default: `nova`
