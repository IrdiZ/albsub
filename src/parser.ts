import { readFileSync, writeFileSync } from 'node:fs';
import type { SubtitleBlock, ParseResult, WriteOptions } from './types.js';

const BOM = '\uFEFF';
const TIMESTAMP_RE = /^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/;

export function parseSRT(input: string | Buffer): ParseResult {
  let text = typeof input === 'string' ? input : input.toString('utf-8');

  const hasBOM = text.startsWith(BOM);
  if (hasBOM) text = text.slice(1);

  const lineEnding: 'CRLF' | 'LF' = text.includes('\r\n') ? 'CRLF' : 'LF';
  const normalized = text.replace(/\r\n/g, '\n');

  const blocks = parseBlocks(normalized);

  return {
    blocks,
    encoding: hasBOM ? 'UTF-8 BOM' : 'UTF-8',
    lineEnding,
  };
}

export function parseSRTFile(filePath: string): ParseResult {
  const buf = readFileSync(filePath);
  return parseSRT(buf);
}

function parseBlocks(text: string): SubtitleBlock[] {
  const blocks: SubtitleBlock[] = [];
  // Split on double newlines (or more)
  const rawBlocks = text.split(/\n{2,}/);

  for (const raw of rawBlocks) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n');
    if (lines.length < 2) continue;

    // Find the timestamp line
    let tsIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      if (TIMESTAMP_RE.test(lines[i].trim())) {
        tsIndex = i;
        break;
      }
    }

    if (tsIndex === -1) continue; // Skip blocks without timestamps

    const numberStr = tsIndex > 0 ? lines[tsIndex - 1].trim() : '';
    const num = /^\d+$/.test(numberStr) ? parseInt(numberStr, 10) : blocks.length + 1;
    const timestamp = lines[tsIndex].trim();
    const textLines = lines.slice(tsIndex + 1).filter(l => l.trim() !== '');

    if (textLines.length === 0) continue;

    blocks.push({
      number: num,
      timestamp,
      lines: textLines,
      rawText: textLines.join('\n'),
    });
  }

  return blocks;
}

export function writeSRT(blocks: SubtitleBlock[], options?: WriteOptions): string {
  const eol = options?.lineEnding === 'CRLF' ? '\r\n' : '\n';
  const bom = options?.bom ? BOM : '';

  const parts = blocks.map((block, i) => {
    const num = block.number || i + 1;
    return [String(num), block.timestamp, ...block.lines].join(eol);
  });

  return bom + parts.join(eol + eol) + eol;
}

export function writeSRTFile(blocks: SubtitleBlock[], filePath: string, options?: WriteOptions): void {
  const content = writeSRT(blocks, options);
  writeFileSync(filePath, content, 'utf-8');
}
