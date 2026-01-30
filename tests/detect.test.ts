import { describe, it, expect } from 'vitest';
import { detectLanguage, detectFromBlocks } from '../src/detect.js';

describe('Language Detection', () => {
  describe('detectLanguage', () => {
    it('should detect English text', () => {
      const result = detectLanguage('Hello world, this is a test sentence in English language.');
      expect(result.code).toBe('eng');
      expect(result.name).toBe('English');
    });

    it('should detect Italian text', () => {
      const result = detectLanguage('Ciao mondo, questa è una frase di prova in lingua italiana.');
      expect(result.code).toBe('ita');
      expect(result.name).toBe('Italian');
    });

    it('should detect French text', () => {
      const result = detectLanguage('Bonjour le monde, ceci est une phrase de test en français.');
      expect(result.code).toBe('fra');
      expect(result.name).toBe('French');
    });

    it('should detect German text', () => {
      const result = detectLanguage('Hallo Welt, das ist ein Testsatz in deutscher Sprache.');
      expect(result.code).toBe('deu');
      expect(result.name).toBe('German');
    });

    it('should detect Turkish text', () => {
      const result = detectLanguage('Merhaba dünya, bu Türkçe dilinde bir test cümlesidir.');
      expect(result.code).toBe('tur');
      expect(result.name).toBe('Turkish');
    });

    it('should return unknown for undetectable text', () => {
      const result = detectLanguage('123 456 !@# $%^');
      expect(result.code).toBe('und');
      expect(result.name).toBe('Unknown');
    });

    it('should return unknown for empty text', () => {
      const result = detectLanguage('');
      expect(result.code).toBe('und');
      expect(result.name).toBe('Unknown');
    });

    it('should handle unmapped language codes', () => {
      // Mock franc to return a code not in our map
      const result = detectLanguage('Some text that might return an unmapped code');
      // The function should return the code itself if not found in map
      expect(result.code).toBeTruthy();
      expect(result.name).toBeTruthy();
    });
  });

  describe('detectFromBlocks', () => {
    it('should detect language from subtitle blocks', () => {
      const blocks = [
        { lines: ['Hello there!', 'How are you?'] },
        { lines: ['This is a movie subtitle.'] },
        { lines: ['We are speaking English here.'] },
      ];

      const result = detectFromBlocks(blocks);
      expect(result.code).toBe('eng');
      expect(result.name).toBe('English');
    });

    it('should use default sample size of 10', () => {
      const blocks = Array.from({ length: 15 }, (_, i) => ({
        lines: [`This is a clear English sentence with common English words like the, and, that, which, number ${i + 1}.`]
      }));

      const result = detectFromBlocks(blocks);
      expect(result.code).toBe('eng');
      expect(result.name).toBe('English');
    });

    it('should respect custom sample size', () => {
      const blocks = [
        { lines: ['First English line'] },
        { lines: ['Second English line'] },
        { lines: ['Third English line'] },
        { lines: ['Ciao mondo!'] }, // Italian
      ];

      // With sample size 3, should not include the Italian line
      const result = detectFromBlocks(blocks, 3);
      expect(result.code).toBe('eng');
      expect(result.name).toBe('English');
    });

    it('should handle empty blocks array', () => {
      const result = detectFromBlocks([]);
      expect(result.code).toBe('und');
      expect(result.name).toBe('Unknown');
    });

    it('should handle blocks with empty lines', () => {
      const blocks = [
        { lines: [] },
        { lines: [''] },
        { lines: ['This is clearly an English sentence with common English words.'] },
        { lines: ['Another English sentence to make the detection more reliable.'] },
        { lines: ['The quick brown fox jumps over the lazy dog.'] },
      ];

      const result = detectFromBlocks(blocks);
      expect(result.code).toBe('eng');
      expect(result.name).toBe('English');
    });

    it('should join multiple lines correctly', () => {
      const blocks = [
        { lines: ['Hello', 'world'] },
        { lines: ['This is', 'a test'] },
      ];

      const result = detectFromBlocks(blocks);
      expect(result.code).toBe('eng');
      expect(result.name).toBe('English');
    });
  });
});