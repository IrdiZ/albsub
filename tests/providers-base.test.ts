import { describe, it, expect } from 'vitest';
import { createProvider } from '../src/providers/base.js';
import { AnthropicProvider } from '../src/providers/anthropic.js';
import { OpenAIProvider } from '../src/providers/openai.js';
import { OllamaProvider } from '../src/providers/ollama.js';

describe('Provider Base', () => {
  describe('createProvider', () => {
    it('should create Anthropic provider', async () => {
      const provider = await createProvider('anthropic');
      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.name).toBe('anthropic');
    });

    it('should create OpenAI provider', async () => {
      const provider = await createProvider('openai');
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.name).toBe('openai');
    });

    it('should create Ollama provider', async () => {
      const provider = await createProvider('ollama');
      expect(provider).toBeInstanceOf(OllamaProvider);
      expect(provider.name).toBe('ollama');
    });

    it('should handle case-insensitive provider names', async () => {
      const provider1 = await createProvider('ANTHROPIC');
      expect(provider1).toBeInstanceOf(AnthropicProvider);

      const provider2 = await createProvider('OpenAI');
      expect(provider2).toBeInstanceOf(OpenAIProvider);

      const provider3 = await createProvider('Ollama');
      expect(provider3).toBeInstanceOf(OllamaProvider);
    });

    it('should throw error for unknown provider', async () => {
      await expect(createProvider('unknown')).rejects.toThrow(
        'Unknown provider: unknown. Supported: anthropic, openai, ollama'
      );
    });

    it('should throw error for empty provider name', async () => {
      await expect(createProvider('')).rejects.toThrow(
        'Unknown provider: . Supported: anthropic, openai, ollama'
      );
    });

    it('should throw error for unsupported provider', async () => {
      await expect(createProvider('gemini')).rejects.toThrow(
        'Unknown provider: gemini. Supported: anthropic, openai, ollama'
      );
    });
  });
});