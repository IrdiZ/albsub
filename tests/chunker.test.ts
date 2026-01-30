import { describe, it, expect } from 'vitest';
import { createChunks } from '../src/chunker.js';
import type { SubtitleBlock } from '../src/types.js';

function makeBlocks(n: number): SubtitleBlock[] {
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    timestamp: `00:00:${String(i).padStart(2, '0')},000 --> 00:00:${String(i + 1).padStart(2, '0')},000`,
    lines: [`Line ${i + 1}`],
    rawText: `Line ${i + 1}`,
  }));
}

describe('Chunker', () => {
  it('should create correct number of chunks', () => {
    const blocks = makeBlocks(50);
    const chunks = createChunks(blocks, 25, 3);
    expect(chunks.length).toBe(2);
    expect(chunks[0].blocks.length).toBe(25);
    expect(chunks[1].blocks.length).toBe(25);
  });

  it('should handle non-even splits', () => {
    const blocks = makeBlocks(30);
    const chunks = createChunks(blocks, 25, 3);
    expect(chunks.length).toBe(2);
    expect(chunks[0].blocks.length).toBe(25);
    expect(chunks[1].blocks.length).toBe(5);
  });

  it('should include context window', () => {
    const blocks = makeBlocks(50);
    const chunks = createChunks(blocks, 25, 3);
    // First chunk has no context
    expect(chunks[0].context.length).toBe(0);
    // Second chunk has 3 context blocks
    expect(chunks[1].context.length).toBe(3);
    expect(chunks[1].context[0].number).toBe(23);
  });

  it('should handle context window larger than available blocks', () => {
    const blocks = makeBlocks(10);
    const chunks = createChunks(blocks, 5, 10);
    expect(chunks[1].context.length).toBe(5);
  });

  it('should preserve block order within chunks', () => {
    const blocks = makeBlocks(20);
    const chunks = createChunks(blocks, 10, 2);
    expect(chunks[0].blocks[0].number).toBe(1);
    expect(chunks[0].blocks[9].number).toBe(10);
    expect(chunks[1].blocks[0].number).toBe(11);
  });

  it('should assign correct chunk indices', () => {
    const blocks = makeBlocks(75);
    const chunks = createChunks(blocks, 25, 3);
    expect(chunks.map(c => c.index)).toEqual([0, 1, 2]);
  });

  it('should handle single block', () => {
    const blocks = makeBlocks(1);
    const chunks = createChunks(blocks, 25, 3);
    expect(chunks.length).toBe(1);
    expect(chunks[0].blocks.length).toBe(1);
    expect(chunks[0].context.length).toBe(0);
  });
});
