import type { CompletedStep } from '../lib/types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function msToSrtTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const f = ms % 1_000;
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(f).padStart(3, '0')}`;
}

export function buildSrt(steps: CompletedStep[]): string {
  return steps
    .filter((s) => s.action.narration.trim().length > 0)
    .map((s, i) => {
      const start = msToSrtTime(s.startMs);
      // Guarantee at least 2s per subtitle — fast actions would otherwise flash by
      const end = msToSrtTime(Math.max(s.endMs, s.startMs + 2000));
      return `${i + 1}\n${start} --> ${end}\n${s.action.narration.trim()}`;
    })
    .join('\n\n');
}
