import OpenAI from 'openai';
import type { AgentAction, GeneratedCode } from '../../lib/types';

export async function callGenerator(
  _openai: OpenAI,
  action: AgentAction,
  _domSnapshot: string,
  _url: string,
): Promise<GeneratedCode> {
  // TODO spec-02: real GPT-4o-mini call with DOM snapshot → Playwright code
  console.log(`  [generator stub] generating code for: ${action.action} → ${action.target ?? action.url}`);
  return {
    code: `// stub: ${action.action} ${action.target ?? action.url ?? ''}`,
    selector: action.target ?? '',
  };
}
