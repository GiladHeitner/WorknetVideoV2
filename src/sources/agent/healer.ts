import OpenAI from 'openai';
import type { AgentAction, GeneratedCode } from '../../lib/types';

export async function callHealer(
  _openai: OpenAI,
  _failed: GeneratedCode,
  _error: string,
  _screenshotB64: string,
  _domSnapshot: string,
  _action: AgentAction,
  attempt: number,
): Promise<GeneratedCode> {
  // TODO spec-02: real GPT-4o call with error + screenshot → corrected code
  throw new Error(`[healer stub] cannot recover on attempt ${attempt}`);
}
