import { describe, it, expect } from 'vitest';
import { getSystemPrompt, buildUserPrompt } from '../src/prompts/system.js';
import { getRetryPrompt } from '../src/prompts/retry.js';
import type { ValidationIssue } from '../src/types.js';

describe('Prompts', () => {
  describe('System Prompts', () => {
    describe('getSystemPrompt', () => {
      it('should generate system prompt for Italian', () => {
        const prompt = getSystemPrompt('Italian');
        expect(prompt).toContain('from Italian to Albanian');
        expect(prompt).toContain('Keep EXACTLY the same number of lines');
        expect(prompt).toContain('Preserve ALL HTML tags');
        expect(prompt).toContain('masculine forms (ky, ai, i)');
        expect(prompt).toContain('feminine forms (kjo, ajo, e)');
        expect(prompt).toContain('Return ONLY the translated blocks');
      });

      it('should generate system prompt for English', () => {
        const prompt = getSystemPrompt('English');
        expect(prompt).toContain('from English to Albanian');
        expect(prompt).toContain('natural, colloquial Albanian');
      });

      it('should generate system prompt for any language', () => {
        const prompt = getSystemPrompt('French');
        expect(prompt).toContain('from French to Albanian');
        expect(prompt).toContain('professional subtitle translator');
      });

      it('should include all essential rules', () => {
        const prompt = getSystemPrompt('German');
        expect(prompt).toContain('same number of lines');
        expect(prompt).toContain('HTML tags');
        expect(prompt).toContain('speaker labels');
        expect(prompt).toContain('[Name]');
        expect(prompt).toContain('proper nouns unchanged');
        expect(prompt).toContain('separated by "---"');
      });
    });

    describe('buildUserPrompt', () => {
      const blocks = [
        { number: 1, lines: ['Hello world!'] },
        { number: 2, lines: ['How are you?', 'I am fine.'] },
      ];

      it('should build user prompt without context', () => {
        const prompt = buildUserPrompt(blocks);
        expect(prompt).toContain('Translate these blocks:');
        expect(prompt).toContain('[1]\nHello world!\n---');
        expect(prompt).toContain('[2]\nHow are you?\nI am fine.\n---');
        expect(prompt).not.toContain('Context');
      });

      it('should build user prompt with context', () => {
        const context = [
          { number: 10, lines: ['Previous line'] },
        ];
        
        const prompt = buildUserPrompt(blocks, context);
        expect(prompt).toContain('Context (previous dialogue, do NOT translate — for reference only):');
        expect(prompt).toContain('[10]\nPrevious line');
        expect(prompt).toContain('---\n\nTranslate these blocks:');
        expect(prompt).toContain('[1]\nHello world!\n---');
      });

      it('should handle empty blocks', () => {
        const prompt = buildUserPrompt([]);
        expect(prompt).toContain('Translate these blocks:');
        expect(prompt).not.toContain('[');
      });

      it('should handle single line blocks', () => {
        const singleBlock = [{ number: 1, lines: ['Single line'] }];
        const prompt = buildUserPrompt(singleBlock);
        expect(prompt).toContain('[1]\nSingle line\n---');
      });

      it('should handle multi-line blocks correctly', () => {
        const multiBlock = [
          { number: 1, lines: ['Line 1', 'Line 2', 'Line 3'] }
        ];
        const prompt = buildUserPrompt(multiBlock);
        expect(prompt).toContain('[1]\nLine 1\nLine 2\nLine 3\n---');
      });

      it('should preserve block numbering', () => {
        const numberedBlocks = [
          { number: 5, lines: ['Block five'] },
          { number: 10, lines: ['Block ten'] },
        ];
        const prompt = buildUserPrompt(numberedBlocks);
        expect(prompt).toContain('[5]\nBlock five\n---');
        expect(prompt).toContain('[10]\nBlock ten\n---');
      });
    });
  });

  describe('Retry Prompts', () => {
    describe('getRetryPrompt', () => {
      const originalLines = ['Hello <i>world</i>!', 'How are you?'];
      const translatedLines = ['Përshëndetje', 'Si jeni?', 'Extra line'];

      it('should handle line count mismatch', () => {
        const issues: ValidationIssue[] = [{
          block: 1,
          type: 'line_count_mismatch',
          expected: '2',
          got: '3'
        }];

        const prompt = getRetryPrompt(issues, originalLines, translatedLines);
        expect(prompt).toContain('Your previous translation had the following issues:');
        expect(prompt).toContain('Block 1: Expected 2 lines but got 3 lines');
        expect(prompt).toContain('You MUST keep exactly 2 lines');
        expect(prompt).toContain('Original text:');
        expect(prompt).toContain('Hello <i>world</i>!');
        expect(prompt).toContain('Your previous translation:');
        expect(prompt).toContain('Përshëndetje');
      });

      it('should handle empty translation', () => {
        const issues: ValidationIssue[] = [{
          block: 2,
          type: 'empty_translation',
          expected: 'non-empty text',
          got: '(empty)'
        }];

        const prompt = getRetryPrompt(issues, originalLines, translatedLines);
        expect(prompt).toContain('Block 2: Translation was empty');
        expect(prompt).toContain('Provide a proper translation');
      });

      it('should handle missing HTML tags', () => {
        const issues: ValidationIssue[] = [{
          block: 1,
          type: 'missing_tag',
          expected: '<i>, </i>',
          got: '(none)'
        }];

        const prompt = getRetryPrompt(issues, originalLines, translatedLines);
        expect(prompt).toContain('HTML tags were lost');
        expect(prompt).toContain('Original had: <i>, </i>');
        expect(prompt).toContain('Your translation had: (none)');
        expect(prompt).toContain('Preserve all HTML tags exactly');
      });

      it('should handle missing speaker labels', () => {
        const issues: ValidationIssue[] = [{
          block: 3,
          type: 'missing_label',
          expected: '[John]',
          got: '(none)'
        }];

        const prompt = getRetryPrompt(issues, originalLines, translatedLines);
        expect(prompt).toContain('Speaker labels were lost');
        expect(prompt).toContain('Original had: [John]');
        expect(prompt).toContain('Preserve all [Speaker] labels exactly');
      });

      it('should handle multiple issues', () => {
        const issues: ValidationIssue[] = [
          {
            block: 1,
            type: 'line_count_mismatch',
            expected: '2',
            got: '3'
          },
          {
            block: 1,
            type: 'missing_tag',
            expected: '<i>',
            got: '(none)'
          }
        ];

        const prompt = getRetryPrompt(issues, originalLines, translatedLines);
        expect(prompt).toContain('Block 1: Expected 2 lines but got 3 lines');
        expect(prompt).toContain('Block 1: HTML tags were lost');
        expect(prompt).toContain('EXACTLY the same number of lines per block');
        expect(prompt).toContain('Preserve ALL HTML tags');
      });

      it('should handle unknown issue types', () => {
        const issues: ValidationIssue[] = [{
          block: 5,
          type: 'unknown_issue' as any,
          expected: 'something',
          got: 'something else'
        }];

        const prompt = getRetryPrompt(issues, originalLines, translatedLines);
        expect(prompt).toContain('Block 5: unknown_issue');
      });

      it('should include instructions', () => {
        const issues: ValidationIssue[] = [{
          block: 1,
          type: 'empty_translation',
          expected: 'text',
          got: 'empty'
        }];

        const prompt = getRetryPrompt(issues, originalLines, translatedLines);
        expect(prompt).toContain('Please fix these issues and provide the corrected translation');
        expect(prompt).toContain('Remember:');
        expect(prompt).toContain('EXACTLY the same number of lines per block');
        expect(prompt).toContain('Preserve ALL HTML tags');
        expect(prompt).toContain('Preserve ALL speaker labels [Name]');
        expect(prompt).toContain('Return ONLY the corrected translation blocks');
      });
    });
  });
});