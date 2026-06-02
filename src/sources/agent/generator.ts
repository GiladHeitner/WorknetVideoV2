import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GeneratedCodeSchema, type AgentAction, type GeneratedCode } from '../../lib/types';
import { GENERATOR_SYSTEM_PROMPT } from './prompts/generator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GENERATED_CODE_SCHEMA = zodToJsonSchema(GeneratedCodeSchema as any, {
  $refStrategy: 'none',
  target: 'jsonSchema7',
}) as Record<string, unknown>;

function buildUserMessage(action: AgentAction, dom: string, url: string): string {
  const lines = [
    `Current URL: ${url}`,
    `Action type: ${action.action}`,
    action.target ? `Target element: ${action.target}` : null,
    action.url    ? `URL to navigate to: ${action.url}` : null,
    action.value  ? `Value to use: ${action.value}` : null,
    `Intent: ${action.reasoning}`,
    '',
    dom ? `Visible interactive elements:\n${dom}` : '(no DOM snapshot — navigate action)',
    '',
    'Write Playwright code to perform this action.',
  ].filter(Boolean);
  return lines.join('\n');
}

export async function callGenerator(
  openai: OpenAI,
  action: AgentAction,
  dom: string,
  url: string,
): Promise<GeneratedCode> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 512,
    messages: [
      { role: 'system', content: GENERATOR_SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(action, dom, url) },
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
  if (!raw) throw new Error('Generator returned empty response');
  return GeneratedCodeSchema.parse(JSON.parse(raw));
}
