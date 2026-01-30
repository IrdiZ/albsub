import type { SubtitleBlock, ValidationIssue, ValidationReport, TranslationResult } from './types.js';

const TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const LABEL_RE = /\[[^\]]+\]/g;

export function validateBlock(original: SubtitleBlock, translated: SubtitleBlock): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Line count mismatch
  if (original.lines.length !== translated.lines.length) {
    issues.push({
      block: original.number,
      type: 'line_count_mismatch',
      expected: String(original.lines.length),
      got: String(translated.lines.length),
    });
  }

  // Empty translation
  const translatedText = translated.lines.join(' ').trim();
  if (!translatedText) {
    issues.push({
      block: original.number,
      type: 'empty_translation',
      expected: 'non-empty text',
      got: '(empty)',
    });
  }

  // Missing HTML tags
  const originalTags = (original.rawText.match(TAG_RE) || []).sort();
  const translatedTags = (translated.rawText.match(TAG_RE) || []).sort();
  if (originalTags.join(',') !== translatedTags.join(',')) {
    issues.push({
      block: original.number,
      type: 'missing_tag',
      expected: originalTags.join(', ') || '(none)',
      got: translatedTags.join(', ') || '(none)',
    });
  }

  // Missing speaker labels
  const originalLabels = (original.rawText.match(LABEL_RE) || []).sort();
  const translatedLabels = (translated.rawText.match(LABEL_RE) || []).sort();
  if (originalLabels.join(',') !== translatedLabels.join(',')) {
    issues.push({
      block: original.number,
      type: 'missing_label',
      expected: originalLabels.join(', ') || '(none)',
      got: translatedLabels.join(', ') || '(none)',
    });
  }

  return issues;
}

export function validateAll(results: TranslationResult[]): ValidationReport {
  const allIssues: ValidationIssue[] = [];
  let passed = 0;

  for (const result of results) {
    if (result.issues.length === 0) {
      passed++;
    }
    allIssues.push(...result.issues);
  }

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    issues: allIssues,
  };
}
