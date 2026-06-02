import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AgentActionSchema, type AgentAction, type CompletedStep } from '../../lib/types';
import { PLANNER_SYSTEM_PROMPT } from './prompts/planner';

// 1×1 white PNG — used as placeholder screenshot in --dry-run mode
export const BLANK_SCREENSHOT =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function buildUserMessage(goal: string, url: string, history: CompletedStep[]): string {
  const historyText =
    history.length === 0
      ? 'No steps completed yet — this is the start of the tutorial.'
      : history
          .map((s) => `Step ${s.index + 1} [${s.action.action}]: ${s.action.narration}`)
          .join('\n');

  return `Goal: ${goal}

Current URL: ${url}

Steps completed so far:
${historyText}

Look at the screenshot and decide the next single action.`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AGENT_ACTION_SCHEMA = zodToJsonSchema(AgentActionSchema as any, {
  $refStrategy: 'none',
  target: 'jsonSchema7',
}) as Record<string, unknown>;

export async function callPlanner(
  openai: OpenAI,
  goal: string,
  url: string,
  screenshotB64: string,
  history: CompletedStep[],
): Promise<AgentAction> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: PLANNER_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildUserMessage(goal, url, history) },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${screenshotB64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'agent_action',
        strict: true,
        schema: AGENT_ACTION_SCHEMA,
      },
    },
  });

  const raw = response.choices[0].message.content;
  if (!raw) throw new Error('Planner returned empty response');
  return AgentActionSchema.parse(JSON.parse(raw));
}
