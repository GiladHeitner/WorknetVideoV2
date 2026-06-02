import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GeneratedCodeSchema, type AgentAction, type GeneratedCode } from '../../lib/types';
import { HEALER_SYSTEM_PROMPT } from './prompts/healer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GENERATED_CODE_SCHEMA = zodToJsonSchema(GeneratedCodeSchema as any, {
  $refStrategy: 'none',
  target: 'jsonSchema7',
}) as Record<string, unknown>;

function buildUserMessage(
  failed: GeneratedCode,
  error: string,
  dom: string,
  url: string,
  action: AgentAction,
  attempt: number,
): string {
  return `Attempt ${attempt}/3

Failed code:
\`\`\`
${failed.code}
\`\`\`

Error: ${error}

Current URL: ${url}
Original intent: ${action.action} — ${action.target ?? action.url ?? action.value ?? ''}

Current visible DOM elements:
${dom}

Write corrected Playwright code.`;
}

export async function callHealer(
  openai: OpenAI,
  failed: GeneratedCode,
  error: string,
  screenshotB64: string,
  dom: string,
  url: string,
  action: AgentAction,
  attempt: number,
): Promise<GeneratedCode> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 512,
    messages: [
      { role: 'system', content: HEALER_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildUserMessage(failed, error, dom, url, action, attempt) },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${screenshotB64}`, detail: 'high' },
          },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'generated_code',
        strict: true,
        schema: GENERATED_CODE_SCHEMA,
      },
    },
  });

  const raw = response.choices[0].message.content;
  if (!raw) throw new Error('Healer returned empty response');
  return GeneratedCodeSchema.parse(JSON.parse(raw));
}
