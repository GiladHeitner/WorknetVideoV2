import { EventEmitter } from 'events';
import type { AgentAction, CompletedStep, RunResult, TutorialResult } from './types';

export class WorknetEmitter extends EventEmitter {
  emitStepStart(action: AgentAction) { this.emit('agent:step:start', action); }
  emitStepDone(step: CompletedStep) { this.emit('agent:step:done', step); }
  emitStepHealing(attempt: number, error: string) { this.emit('agent:step:healing', attempt, error); }
  emitAgentDone(result: RunResult) { this.emit('agent:done', result); }
  emitRenderStart() { this.emit('render:start'); }
  emitRenderDone(outputPath: string) { this.emit('render:done', outputPath); }
  emitDone(result: TutorialResult) { this.emit('done', result); }
}
