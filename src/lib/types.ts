import { z } from 'zod';

export const ActionTypeSchema = z.enum([
  'navigate', 'click', 'scroll', 'fill', 'hover', 'wait', 'key',
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

// All optional fields use .nullable() so OpenAI structured outputs strict mode
// always receives every key (with null when unused).
export const AgentActionSchema = z.object({
  done: z.boolean().describe('True when the tutorial goal has been fully demonstrated'),
  action: ActionTypeSchema,
  target: z.string().nullable().describe('Natural-language element description, null for navigate/wait'),
  value: z.string().nullable().describe('Text to type for fill/key actions, null otherwise'),
  url: z.string().nullable().describe('Full URL for navigate actions, null otherwise'),
  narration: z.string().describe('Voice-over sentence a narrator would say about this step'),
  reasoning: z.string().describe('Internal scratchpad: why this action was chosen'),
});
export type AgentAction = z.infer<typeof AgentActionSchema>;

export const GeneratedCodeSchema = z.object({
  code: z.string().describe('Playwright expression, e.g. await page.click("#btn")'),
  selector: z.string().describe('Primary selector used, for healer context'),
});
export type GeneratedCode = z.infer<typeof GeneratedCodeSchema>;

export interface CompletedStep {
  index: number;
  action: AgentAction;
  code: string;
  startMs: number;
  endMs: number;
  healAttempts: number;
}

export interface RunResult {
  steps: CompletedStep[];
  tracePath: string;
  totalMs: number;
}

export interface TutorialResult {
  videoPath: string;
  run: RunResult;
}

export interface RecordOptions {
  headless?: boolean;
  maxSteps?: number;
  useChrome?: boolean;
  authPath?: string;
}

export interface SubtitleStyle {
  fontFamily?: string;
  fontSize?: number;
  primaryColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  padding?: number;
  bold?: boolean;
  position?: 'bottom' | 'top';
}

export interface RecastOptions {
  voice?: string;
  ttsModel?: string;
  ttsSpeed?: number;
  ttsCacheDir?: string;
  speedIdle?: number;
  speedAction?: number;
  speedNavigation?: number;
  speedNetworkWait?: number;
  cursorOverlay?: boolean;
  clickEffect?: boolean;
  autoZoom?: boolean;
  interpolate?: boolean;
  burnSubtitles?: boolean;
  subtitleStyle?: SubtitleStyle;
  resolution?: '720p' | '1080p' | '1440p' | '4k';
  fps?: number;
  backgroundMusic?: string;
  intro?: string;
  outro?: string;
}

export interface TutorialOptions extends RecordOptions {
  output?: string;
  source?: 'agent' | 'human';
  recast?: RecastOptions;
}
