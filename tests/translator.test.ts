import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translate } from '../src/translator.js';
import type { SubtitleBlock, LLMProvider, TranslateOptions } from '../src/types.js';

// Mock the dependencies
vi.mock('../src/chunker.js', () => ({
  createChunks: vi.fn()
}));

vi.mock('../src/validator.js', () => ({
  validateBlock: vi.fn()
}));

vi.mock('../src/prompts/system.js', () => ({
  getSystemPrompt: vi.fn(),
  buildUserPrompt: vi.fn()
}));

vi.mock('../src/prompts/retry.js', () => ({
  getRetryPrompt: vi.fn()
}));

describe('Translator', () => {
  let mockProvider: LLMProvider;
  let mockBlocks: SubtitleBlock[];
  let translateOptions: TranslateOptions;
  let chunker: any;
  let validator: any;
  let prompts: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockProvider = {
      name: 'test',
      translate: vi.fn()
    };

    mockBlocks = [
      {
        number: 1,
        timestamp: '00:00:01,000 --> 00:00:03,000',
        lines: ['Hello world!'],
        rawText: 'Hello world!'
      },
      {
        number: 2,
        timestamp: '00:00:04,000 --> 00:00:06,000',
        lines: ['How are you?', 'I am fine.'],
        rawText: 'How are you?\nI am fine.'
      }
    ];

    translateOptions = {
      provider: mockProvider,
      providerOptions: {
        model: 'test-model',
        temperature: 0.3,
        maxTokens: 1000,
        apiKey: 'test-key'
      },
      sourceLanguage: 'English',
      batchSize: 25,
      contextWindow: 3,
      workers: 1,
      maxRetries: 2
    };

    // Mock the imported functions
    chunker = await import('../src/chunker.js');
    validator = await import('../src/validator.js');
    prompts = await import('../src/prompts/system.js');

    vi.mocked(chunker.createChunks).mockReturnValue([{
      blocks: mockBlocks,
      context: [],
      index: 0
    }]);

    vi.mocked(validator.validateBlock).mockReturnValue([]);
    vi.mocked(prompts.getSystemPrompt).mockReturnValue('System prompt');
    vi.mocked(prompts.buildUserPrompt).mockReturnValue('User prompt');
  });

  describe('translate', () => {
    it('should translate blocks successfully', async () => {
      const mockResponse = `[1]
Përshëndetje botë!
---
[2]
Si jeni?
Jam mirë.
---`;

      vi.mocked(mockProvider.translate).mockResolvedValue(mockResponse);

      const results = await translate(mockBlocks, translateOptions);

      expect(results).toHaveLength(2);
      expect(results[0].original).toBe(mockBlocks[0]);
      expect(results[0].translated.lines).toEqual(['Përshëndetje botë!']);
      expect(results[1].translated.lines).toEqual(['Si jeni?', 'Jam mirë.']);
      expect(mockProvider.translate).toHaveBeenCalledWith(
        'System prompt',
        'User prompt',
        translateOptions.providerOptions
      );
    });

    it('should handle missing translation blocks', async () => {
      const mockResponse = `[1]
Përshëndetje botë!
---`;

      vi.mocked(mockProvider.translate).mockResolvedValue(mockResponse);

      const results = await translate(mockBlocks, translateOptions);

      expect(results).toHaveLength(2);
      expect(results[0].translated.lines).toEqual(['Përshëndetje botë!']);
      // Should keep original for missing block
      expect(results[1].translated.lines).toEqual(['How are you?', 'I am fine.']);
    });

    it('should parse response without block numbers', async () => {
      const mockResponse = `Përshëndetje botë!
---
Si jeni?
Jam mirë.
---`;

      vi.mocked(mockProvider.translate).mockResolvedValue(mockResponse);

      const results = await translate(mockBlocks, translateOptions);

      expect(results[0].translated.lines).toEqual(['Përshëndetje botë!']);
      expect(results[1].translated.lines).toEqual(['Si jeni?', 'Jam mirë.']);
    });

    it('should handle empty response sections', async () => {
      const mockResponse = `[1]
Përshëndetje botë!
---

---`;

      vi.mocked(mockProvider.translate).mockResolvedValue(mockResponse);

      const results = await translate(mockBlocks, translateOptions);

      expect(results[0].translated.lines).toEqual(['Përshëndetje botë!']);
      // Should keep original for empty section
      expect(results[1].translated.lines).toEqual(['How are you?', 'I am fine.']);
    });

    it('should call progress callback', async () => {
      const mockResponse = `[1]
Translation
---`;

      vi.mocked(mockProvider.translate).mockResolvedValue(mockResponse);

      const onProgress = vi.fn();
      const optionsWithProgress = { ...translateOptions, onProgress };

      await translate(mockBlocks, optionsWithProgress);

      expect(onProgress).toHaveBeenCalledWith(2, 2);
    });

    it('should retry failed validations', async () => {
      const retryPrompts = await import('../src/prompts/retry.js');

      // First call fails validation, second succeeds
      vi.mocked(validator.validateBlock)
        .mockReturnValueOnce([{
          block: 1,
          type: 'line_count_mismatch',
          expected: '1',
          got: '2'
        }])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      vi.mocked(retryPrompts.getRetryPrompt).mockReturnValue('Retry prompt');

      const mockResponse = `[1]
Translation line 1
Translation line 2
---`;

      const mockRetryResponse = `[1]
Fixed translation
---`;

      vi.mocked(mockProvider.translate)
        .mockResolvedValueOnce(mockResponse)  // Initial translation
        .mockResolvedValueOnce(mockRetryResponse);  // Retry

      const results = await translate([mockBlocks[0]], translateOptions);

      expect(mockProvider.translate).toHaveBeenCalledTimes(2);
      expect(results[0].valid).toBe(true);
      expect(results[0].translated.lines).toEqual(['Fixed translation']);
    });

    it('should handle retry failures gracefully', async () => {
      // Always return validation issues
      vi.mocked(validator.validateBlock).mockReturnValue([{
        block: 1,
        type: 'line_count_mismatch',
        expected: '1',
        got: '2'
      }]);

      // Retry throws error
      vi.mocked(mockProvider.translate)
        .mockResolvedValueOnce('[1]\nTranslation\n---')
        .mockRejectedValueOnce(new Error('API Error'));

      const results = await translate([mockBlocks[0]], translateOptions);

      expect(results[0].valid).toBe(false);
      expect(results[0].issues).toHaveLength(1);
    });

    it('should sort results by block number', async () => {
      // Create chunks that would be processed out of order
      const shuffledBlocks = [
        { ...mockBlocks[1], number: 2 },
        { ...mockBlocks[0], number: 1 }
      ];

      vi.mocked(chunker.createChunks).mockReturnValue([
        { blocks: [shuffledBlocks[0]], context: [], index: 0 },
        { blocks: [shuffledBlocks[1]], context: [], index: 1 }
      ]);

      vi.mocked(mockProvider.translate)
        .mockResolvedValueOnce('[2]\nSecond\n---')
        .mockResolvedValueOnce('[1]\nFirst\n---');

      const results = await translate(shuffledBlocks, translateOptions);

      expect(results[0].original.number).toBe(1);
      expect(results[1].original.number).toBe(2);
    });

    it('should handle multiple workers', async () => {
      // Mock multiple chunks
      vi.mocked(chunker.createChunks).mockReturnValue([
        { blocks: [mockBlocks[0]], context: [], index: 0 },
        { blocks: [mockBlocks[1]], context: [], index: 1 }
      ]);

      vi.mocked(mockProvider.translate)
        .mockResolvedValueOnce('[1]\nFirst\n---')
        .mockResolvedValueOnce('[2]\nSecond\n---');

      const multiWorkerOptions = { ...translateOptions, workers: 2 };

      const results = await translate(mockBlocks, multiWorkerOptions);

      expect(results).toHaveLength(2);
      expect(mockProvider.translate).toHaveBeenCalledTimes(2);
    });

    it('should preserve original timestamp and number', async () => {
      const mockResponse = `[1]
Translated text
---`;

      vi.mocked(mockProvider.translate).mockResolvedValue(mockResponse);

      const results = await translate([mockBlocks[0]], translateOptions);

      expect(results[0].translated.timestamp).toBe(mockBlocks[0].timestamp);
      expect(results[0].translated.number).toBe(mockBlocks[0].number);
    });

    it('should handle empty blocks array', async () => {
      vi.mocked(chunker.createChunks).mockReturnValue([]);

      const results = await translate([], translateOptions);

      expect(results).toHaveLength(0);
      expect(mockProvider.translate).not.toHaveBeenCalled();
    });
  });
});