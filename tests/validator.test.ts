import { describe, it, expect } from 'vitest';
import { validateBlock, validateAll } from '../src/validator.js';
import type { SubtitleBlock, TranslationResult } from '../src/types.js';

function block(num: number, lines: string[]): SubtitleBlock {
  return {
    number: num,
    timestamp: '00:00:01,000 --> 00:00:03,000',
    lines,
    rawText: lines.join('\n'),
  };
}

describe('Validator', () => {
  it('should pass valid translation', () => {
    const orig = block(1, ['Hello world']);
    const trans = block(1, ['Përshëndetje botë']);
    const issues = validateBlock(orig, trans);
    expect(issues.length).toBe(0);
  });

  it('should catch line count mismatch', () => {
    const orig = block(1, ['Line one', 'Line two']);
    const trans = block(1, ['Vetëm një rresht']);
    const issues = validateBlock(orig, trans);
    expect(issues.some(i => i.type === 'line_count_mismatch')).toBe(true);
    expect(issues[0].expected).toBe('2');
    expect(issues[0].got).toBe('1');
  });

  it('should catch empty translation', () => {
    const orig = block(1, ['Hello']);
    const trans = block(1, ['']);
    const issues = validateBlock(orig, trans);
    expect(issues.some(i => i.type === 'empty_translation')).toBe(true);
  });

  it('should catch missing HTML tags', () => {
    const orig = block(1, ['<i>Hello</i>']);
    const trans = block(1, ['Përshëndetje']);
    const issues = validateBlock(orig, trans);
    expect(issues.some(i => i.type === 'missing_tag')).toBe(true);
  });

  it('should pass when HTML tags are preserved', () => {
    const orig = block(1, ['<i>Hello</i>']);
    const trans = block(1, ['<i>Përshëndetje</i>']);
    const issues = validateBlock(orig, trans);
    expect(issues.some(i => i.type === 'missing_tag')).toBe(false);
  });

  it('should catch missing speaker labels', () => {
    const orig = block(1, ['[Marco] Hello']);
    const trans = block(1, ['Përshëndetje']);
    const issues = validateBlock(orig, trans);
    expect(issues.some(i => i.type === 'missing_label')).toBe(true);
  });

  it('should pass when speaker labels are preserved', () => {
    const orig = block(1, ['[Marco] Hello']);
    const trans = block(1, ['[Marco] Përshëndetje']);
    const issues = validateBlock(orig, trans);
    expect(issues.some(i => i.type === 'missing_label')).toBe(false);
  });

  it('should report multiple issues', () => {
    const orig = block(1, ['<i>[Marco] Hello</i>', 'Second line']);
    const trans = block(1, ['Përshëndetje']);
    const issues = validateBlock(orig, trans);
    expect(issues.length).toBeGreaterThanOrEqual(2); // line count + tags + labels
  });

  it('should generate correct validation report', () => {
    const results: TranslationResult[] = [
      { original: block(1, ['Hi']), translated: block(1, ['Ckemi']), valid: true, issues: [] },
      {
        original: block(2, ['Hello', 'World']),
        translated: block(2, ['Përshëndetje']),
        valid: false,
        issues: [{ block: 2, type: 'line_count_mismatch', expected: '2', got: '1' }],
      },
    ];
    const report = validateAll(results);
    expect(report.total).toBe(2);
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.issues.length).toBe(1);
  });
});
