# Spec 01 — Bootstrap

## Goal

Scaffold the full project with working types, CLI skeleton, and a real planner call that returns a structured first action. No browser yet — just prove the planner → structured-output pipeline works end to end.

## Deliverables

- [ ] `package.json` — all dependencies
- [ ] `tsconfig.json`
- [ ] `src/types.ts` — `AgentAction`, `GeneratedCode`, `CompletedStep`, `RunResult` + Zod schemas
- [ ] `src/agent/planner.ts` — real GPT-4o call, returns `AgentAction` via structured outputs
- [ ] `src/agent/generator.ts` — stub (logs, returns dummy code)
- [ ] `src/agent/healer.ts` — stub
- [ ] `src/agent/executor.ts` — stub
- [ ] `src/agent/loop.ts` — stub (calls planner once, logs result, exits)
- [ ] `src/browser/auth.ts` — `saveAuth(hostname, context)` / `loadAuth(hostname)` / `authExists(hostname)`
- [ ] `src/browser/context.ts` — `launchBrowser(options)` returns `{ browser, context }` with auth auto-loaded
- [ ] `src/renderer/index.ts` — stub
- [ ] `src/cli.ts` — commander entry point + `login` subcommand stub
- [ ] `.env.example`
- [ ] `.gitignore`
- [ ] `src/agent/prompts/planner.ts` — system prompt string

## Required Env Vars

```
OPENAI_API_KEY=
```

## Acceptance Test

```bash
OPENAI_API_KEY=sk-... worknet "walk through the YouTube Studio dashboard" --dry-run
```

Prints a valid `AgentAction` JSON from GPT-4o with `done: false` and a non-empty `narration` string. No browser opens.

## Implementation Notes

### LLM roles

| Role | Model | Why |
|---|---|---|
| Planner | `gpt-4o` | Needs vision (screenshot) + strong reasoning |
| Generator | `gpt-4o-mini` | Text-only (DOM + intent), cheaper |
| Healer | `gpt-4o` | Needs vision (post-failure screenshot) + debugging |

All use the same `openai` SDK instance. One `OPENAI_API_KEY`.

### Zod schemas → OpenAI structured outputs

Define all schemas in `src/types.ts` and use `zod-to-json-schema` to convert for the OpenAI `response_format`:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: PLANNER_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: buildPlannerUserMessage(goal, url, history) },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshotB64}` } },
      ],
    },
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'agent_action',
      strict: true,
      schema: zodToJsonSchema(AgentActionSchema),
    },
  },
});

const action = AgentActionSchema.parse(JSON.parse(response.choices[0].message.content!));
```

### Planner system prompt (`src/agent/prompts/planner.ts`)

Must convey:
- The overall tutorial goal (injected at call time, not hardcoded)
- It sees a live screenshot — react to what is actually on screen
- Output exactly one action at a time
- Set `done: true` only when the tutorial objective has been fully demonstrated
- `narration`: what a friendly voice-over would say about this step to a viewer watching the tutorial
- `reasoning`: internal scratchpad, not shown to user

### `--dry-run` flag

When set:
- Call planner with a 1×1 blank white PNG as placeholder screenshot
- Print resulting `AgentAction` as formatted JSON
- Exit without opening a browser

## Next Spec

spec-02: Real agent loop — generator + executor + healer + Playwright + trace recording
