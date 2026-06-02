import path from 'path';
import fs from 'fs';
import { Recast, OpenAIProvider } from 'playwright-recast';
import type { RunResult, RecastOptions } from '../lib/types';
import { buildSrt } from './srt';

export async function render(
  run: RunResult,
  outputPath: string,
  options: RecastOptions,
): Promise<string> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const srtPath = run.tracePath.replace('.zip', '.srt');
  fs.writeFileSync(srtPath, buildSrt(run.steps), 'utf-8');
  console.log(`SRT written to ${srtPath}`);

  const provider = OpenAIProvider({
    voice: (options.voice ?? 'nova') as 'nova',
    model: 'gpt-4o-mini-tts',
    speed: options.ttsSpeed,
    cacheDir: options.ttsCacheDir ?? '.recast-cache/tts',
  });

  console.log('Rendering video with playwright-recast...');

  await Recast
    .from(run.tracePath)
    .parse()
    .subtitlesFromSrt(srtPath)
    .voiceover(provider)
    .render({
      format: 'mp4',
      resolution: options.resolution ?? '1080p',
      fps: options.fps ?? 60,
      burnSubtitles: options.burnSubtitles ?? true,
      subtitleStyle: options.subtitleStyle,
    })
    .toFile(outputPath);

  return outputPath;
}
