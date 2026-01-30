import { describe, it, expect } from 'vitest';
import { parseSRT, parseSRTFile, writeSRT } from '../src/parser.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, 'fixtures');

describe('SRT Parser', () => {
  it('should parse a valid Italian SRT file', () => {
    const result = parseSRTFile(join(FIXTURES, 'sample.ita.srt'));
    expect(result.blocks.length).toBe(20);
    expect(result.encoding).toBe('UTF-8');
    expect(result.blocks[0].number).toBe(1);
    expect(result.blocks[0].lines).toEqual(['Buongiorno a tutti!']);
    expect(result.blocks[0].timestamp).toBe('00:00:01,000 --> 00:00:03,500');
  });

  it('should parse multi-line blocks', () => {
    const result = parseSRTFile(join(FIXTURES, 'sample.ita.srt'));
    // Block 2 has 2 lines
    expect(result.blocks[1].lines.length).toBe(2);
    expect(result.blocks[1].lines[0]).toBe('Come stai oggi?');
    expect(result.blocks[1].lines[1]).toBe('Tutto bene?');
  });

  it('should preserve HTML tags', () => {
    const result = parseSRTFile(join(FIXTURES, 'sample.ita.srt'));
    // Block 3 has <i> tags
    expect(result.blocks[2].rawText).toContain('<i>');
    expect(result.blocks[2].rawText).toContain('</i>');
  });

  it('should preserve speaker labels', () => {
    const result = parseSRTFile(join(FIXTURES, 'sample.ita.srt'));
    // Block 4 has [Marco]
    expect(result.blocks[3].rawText).toContain('[Marco]');
  });

  it('should handle BOM', () => {
    const result = parseSRTFile(join(FIXTURES, 'malformed.srt'));
    expect(result.encoding).toBe('UTF-8 BOM');
    expect(result.blocks[0].lines[0]).toBe('This has a BOM marker.');
  });

  it('should detect CRLF line endings', () => {
    const result = parseSRTFile(join(FIXTURES, 'malformed.srt'));
    expect(result.lineEnding).toBe('CRLF');
  });

  it('should handle malformed blocks gracefully', () => {
    const result = parseSRTFile(join(FIXTURES, 'malformed.srt'));
    // Should skip empty blocks and text without timestamps
    expect(result.blocks.length).toBeGreaterThanOrEqual(5);
    // All blocks should have lines
    for (const block of result.blocks) {
      expect(block.lines.length).toBeGreaterThan(0);
    }
  });

  it('should parse from string', () => {
    const srt = `1\n00:00:01,000 --> 00:00:03,000\nHello world\n\n2\n00:00:04,000 --> 00:00:06,000\nGoodbye`;
    const result = parseSRT(srt);
    expect(result.blocks.length).toBe(2);
  });

  it('should write SRT back to string', () => {
    const result = parseSRTFile(join(FIXTURES, 'sample.eng.srt'));
    const output = writeSRT(result.blocks);
    expect(output).toContain('Good morning everyone!');
    expect(output).toContain('00:00:01,000 --> 00:00:03,500');
  });

  it('should round-trip parse and write', () => {
    const original = parseSRTFile(join(FIXTURES, 'sample.eng.srt'));
    const written = writeSRT(original.blocks);
    const reparsed = parseSRT(written);
    expect(reparsed.blocks.length).toBe(original.blocks.length);
    for (let i = 0; i < original.blocks.length; i++) {
      expect(reparsed.blocks[i].lines).toEqual(original.blocks[i].lines);
    }
  });
});
