import type { SubtitleBlock, Chunk } from './types.js';

export function createChunks(
  blocks: SubtitleBlock[],
  batchSize: number = 25,
  contextWindow: number = 3,
): Chunk[] {
  const chunks: Chunk[] = [];

  for (let i = 0; i < blocks.length; i += batchSize) {
    const end = Math.min(i + batchSize, blocks.length);
    const contextStart = Math.max(0, i - contextWindow);

    chunks.push({
      blocks: blocks.slice(i, end),
      context: i > 0 ? blocks.slice(contextStart, i) : [],
      index: chunks.length,
    });
  }

  return chunks;
}
