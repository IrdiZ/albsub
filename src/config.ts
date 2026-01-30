import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'yaml';
import type { AlbsubConfig } from './types.js';

const DEFAULTS: AlbsubConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  batchSize: 25,
  contextWindow: 3,
  workers: 2,
  temperature: 0.3,
  maxRetries: 2,
  targetLanguage: 'Albanian',
};

export function loadConfig(filePath?: string): AlbsubConfig {
  const paths = filePath
    ? [filePath]
    : ['albsub.yml', 'albsub.yaml', '.albsub.yml', '.albsub.yaml'];

  for (const p of paths) {
    if (existsSync(p)) {
      const raw = readFileSync(p, 'utf-8');
      const parsed = parse(raw) as Partial<AlbsubConfig>;
      return { ...DEFAULTS, ...parsed };
    }
  }

  return { ...DEFAULTS };
}
