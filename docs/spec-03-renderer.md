# Spec 03 — Renderer

## Goal

Replace the renderer stub with a real playwright-recast pipeline. By end of this spec `worknet "<prompt>"` produces a fully rendered `.mp4` with narration audio, subtitles, cursor overlay, click effects, and auto-zoom — driven entirely by the agent's `CompletedStep[]` output.

## Deliverables

- [ ] `src/renderer/srt.ts` — build `.srt` file from `CompletedStep[]`
- [ ] `src/renderer/index.ts` — replace stub with playwright-recast fluent pipeline
- [ ] `src/sources/agent/loop.ts` — store step timestamps relative to loop start (needed for SRT alignment)
- [ ] `src/lib/types.ts` — note that `startMs`/`endMs` are relative ms from recording start

## Acceptance Test

```bash
node dist/cli.js "go to npmjs.com and search for playwright" --no-headless
```

After the browser closes:
1. `out/trace.zip` exists (from spec-02)
2. `out/tutorial.mp4` exists and is playable
3. Video has narration voice-over audio
4. Subtitles are burned in
5. Cursor and click effects are visible on clicks

---

## Implementation Notes

### 1. Relative timestamps in loop.ts

Currently `CompletedStep.startMs` and `endMs` store absolute `Date.now()` values. playwright-recast's trace starts at `t=0`, so the SRT needs timestamps relative to recording start.

Change the loop to compute offsets from `startTime`:

```typescript
const step: CompletedStep = {
  startMs: stepStart - startTime,   // was: stepStart
  endMs: Date.now() - startTime,    // was: Date.now()
  ...
};
```

This makes `startMs=0` for the first step and all subsequent steps grow from there — matching the trace's own timeline.

### 2. SRT generation — `src/renderer/srt.ts`

SRT format:
```
1
00:00:00,500 --> 00:00:04,200
Let's start by navigating to npmjs.com.

2
00:00:04,200 --> 00:00:08,000
Now we'll click on the search bar to find the package.
```

```typescript
function msToSrtTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const f = ms % 1_000;
  return `${pad(h)}:${pad(m)}:${pad(s)},${padMs(f)}`;
}

export function buildSrt(steps: CompletedStep[]): string {
  return steps
    .filter((s) => s.action.narration.trim().length > 0)
    .map((s, i) => {
      const start = msToSrtTime(s.startMs);
      // Give each subtitle at least 2s, cap at its actual duration
      const duration = Math.max(s.endMs - s.startMs, 2000);
      const end = msToSrtTime(s.startMs + duration);
      return `${i + 1}\n${start} --> ${end}\n${s.action.narration.trim()}`;
    })
    .join('\n\n');
}
```

Edge cases:
- Filter steps with empty narration (healer-only steps etc.)
- Minimum 2s per subtitle so fast actions aren't invisible
- Once `.voiceover()` is in the pipeline, playwright-recast uses TTS audio duration to drive actual timing — the SRT timestamps become rough anchors, not precise cuts

### 3. Renderer pipeline — `src/renderer/index.ts`

```typescript
import path from 'path';
import fs from 'fs';
import { Recast } from 'playwright-recast';
import { OpenAIProvider } from 'playwright-recast/providers/openai';
import type { RunResult, RecastOptions } from '../lib/types';
import { buildSrt } from './srt';

export async function render(
  run: RunResult,
  outputPath: string,
  options: RecastOptions,
): Promise<string> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Write SRT alongside the trace
  const srtPath = run.tracePath.replace('.zip', '.srt');
  fs.writeFileSync(srtPath, buildSrt(run.steps), 'utf-8');

  const provider = OpenAIProvider({
    voice: (options.voice ?? 'nova') as Parameters<typeof OpenAIProvider>[0]['voice'],
    model: (options.ttsModel ?? 'gpt-4o-mini-tts') as Parameters<typeof OpenAIProvider>[0]['model'],
    speed: options.ttsSpeed,
    cacheDir: options.ttsCacheDir ?? '.recast-cache/tts',
  });

  let pipeline = Recast
    .from(run.tracePath)
    .parse()
    .subtitlesFromSrt(srtPath);

  if (options.cursorOverlay !== false) pipeline = pipeline.cursorOverlay();
  if (options.clickEffect    !== false) pipeline = pipeline.clickEffect();
  if (options.autoZoom       !== false) pipeline = pipeline.autoZoom({ inputLevel: 1.4 });
  if (options.interpolate)              pipeline = pipeline.interpolate({ fps: 60 });

  pipeline = pipeline.voiceover(provider);

  await pipeline
    .render({
      format:         'mp4',
      resolution:     options.resolution ?? '1080p',
      fps:            options.fps ?? 60,
      burnSubtitles:  options.burnSubtitles ?? true,
      subtitleStyle:  options.subtitleStyle,
    })
    .toFile(outputPath);

  return outputPath;
}
```

### 4. Why no `.speedUp()` in spec-03

`.speedUp()` remaps the video timeline — idle gaps are compressed. But our SRT timestamps are in **original trace time**. If speedUp is applied before subtitles, the SRT entries will be out of sync with the compressed video.

playwright-recast does remap subtitle timestamps through the speed processor — but only for subtitles generated from the trace itself (via `.subtitlesFromTrace()`). External SRT files loaded via `.subtitlesFromSrt()` use their timestamps as-is in the output timeline.

**Fix in spec-04:** switch from `.subtitlesFromSrt()` to `.subtitlesFromTrace()` by injecting narration strings into the trace using `.injectActions()`. That way playwright-recast owns the timing and `.speedUp()` can be safely re-enabled.

For spec-03, skip `.speedUp()`. Videos will be real-time speed — a 30-step run over 2 minutes produces a 2-minute video. Fine for MVP.

### 5. ffmpeg required

playwright-recast calls ffmpeg internally. Install if not present:

```bash
brew install ffmpeg
```

Verify:
```bash
ffmpeg -version
```

### 6. RecastOptions wiring in CLI

The CLI already passes `recast: { voice: opts.voice }`. Defaults in the renderer cover the rest. No CLI changes needed for spec-03.

---

## Open Questions Resolved by This Spec

- **SRT timing**: relative timestamps from loop start, 2s minimum per subtitle
- **Speed control**: deferred to spec-04 (requires trace-injected subtitles)
- **TTS caching**: enabled by default at `.recast-cache/tts/` — re-runs don't re-synthesize

## Next Spec

spec-04: Speed control + `.injectActions()` subtitle injection + end-to-end test on a real dashboard
