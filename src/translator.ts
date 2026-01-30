import type { SubtitleBlock, Chunk, TranslationResult, ProviderOptions, AlbsubConfig } from './types.js';
import type { LLMProvider } from './providers/base.js';
import { createChunks } from './chunker.js';
import { validateBlock } from './validator.js';
import { getSystemPrompt, buildUserPrompt } from './prompts/system.js';
import { getRetryPrompt } from './prompts/retry.js';

export interface TranslateOptions {
  provider: LLMProvider;
  providerOptions: ProviderOptions;
  sourceLanguage: string;
  batchSize: number;
  contextWindow: number;
  workers: number;
  maxRetries: number;
  onProgress?: (completed: number, total: number) => void;
}

function parseTranslationResponse(response: string, originalBlocks: SubtitleBlock[]): SubtitleBlock[] {
  const sections = response.split('---').map(s => s.trim()).filter(Boolean);
  const results: SubtitleBlock[] = [];

  for (let i = 0; i < originalBlocks.length; i++) {
    const section = sections[i];
    if (!section) {
      // Fallback: keep original
      results.push({ ...originalBlocks[i] });
      continue;
    }

    const lines = section.split('\n').filter(l => l.trim() !== '');
    // Remove the [NUMBER] label if present
    let textLines = lines;
    if (lines[0] && /^\[\d+\]$/.test(lines[0].trim())) {
      textLines = lines.slice(1);
    }

    results.push({
      number: originalBlocks[i].number,
      timestamp: originalBlocks[i].timestamp,
      lines: textLines.length > 0 ? textLines : originalBlocks[i].lines,
      rawText: textLines.join('\n'),
    });
  }

  return results;
}

async function translateChunk(
  chunk: Chunk,
  provider: LLMProvider,
  providerOptions: ProviderOptions,
  sourceLanguage: string,
  maxRetries: number,
): Promise<TranslationResult[]> {
  const systemPrompt = getSystemPrompt(sourceLanguage);
  const userPrompt = buildUserPrompt(chunk.blocks, chunk.context);

  const response = await provider.translate(systemPrompt, userPrompt, providerOptions);
  let translated = parseTranslationResponse(response, chunk.blocks);

  const results: TranslationResult[] = [];
  for (let i = 0; i < chunk.blocks.length; i++) {
    const original = chunk.blocks[i];
    const trans = translated[i] || { ...original };
    const issues = validateBlock(original, trans);

    results.push({
      original,
      translated: trans,
      valid: issues.length === 0,
      issues,
    });
  }

  // Retry failed blocks
  const failedResults = results.filter(r => !r.valid);
  if (failedResults.length > 0 && maxRetries > 0) {
    for (const result of failedResults) {
      let retries = maxRetries;
      let current = result;

      while (!current.valid && retries > 0) {
        const retryPrompt = getRetryPrompt(
          current.issues,
          current.original.lines,
          current.translated.lines,
        );
        try {
          const retryResponse = await provider.translate(systemPrompt, retryPrompt, providerOptions);
          const retryBlocks = parseTranslationResponse(retryResponse, [current.original]);
          const retryTrans = retryBlocks[0] || current.translated;
          const retryIssues = validateBlock(current.original, retryTrans);

          current.translated = retryTrans;
          current.issues = retryIssues;
          current.valid = retryIssues.length === 0;
        } catch {
          // Keep current state on retry failure
        }
        retries--;
      }
    }
  }

  return results;
}

export async function translate(
  blocks: SubtitleBlock[],
  options: TranslateOptions,
): Promise<TranslationResult[]> {
  const chunks = createChunks(blocks, options.batchSize, options.contextWindow);
  const allResults: TranslationResult[] = [];
  let completed = 0;

  // Simple worker pool
  const queue = [...chunks];
  const workers = Math.min(options.workers, queue.length);

  async function worker() {
    while (queue.length > 0) {
      const chunk = queue.shift();
      if (!chunk) break;

      const results = await translateChunk(
        chunk,
        options.provider,
        options.providerOptions,
        options.sourceLanguage,
        options.maxRetries,
      );

      allResults.push(...results);
      completed += chunk.blocks.length;
      options.onProgress?.(completed, blocks.length);
    }
  }

  const workerPromises = Array.from({ length: workers }, () => worker());
  await Promise.all(workerPromises);

  // Sort by block number to preserve order
  allResults.sort((a, b) => a.original.number - b.original.number);

  return allResults;
}
