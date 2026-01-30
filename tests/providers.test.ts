import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../src/providers/anthropic.js';
import { OpenAIProvider } from '../src/providers/openai.js';
import { OllamaProvider } from '../src/providers/ollama.js';

// Mock external dependencies
vi.mock('@anthropic-ai/sdk');
vi.mock('openai');

describe('Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('AnthropicProvider', () => {
    it('should have correct name', () => {
      const provider = new AnthropicProvider();
      expect(provider.name).toBe('anthropic');
    });

    it('should translate with default options', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Translated text' }]
      });

      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate }
      }) as any);

      const provider = new AnthropicProvider();
      const result = await provider.translate('system', 'user', { 
        model: 'claude-3-sonnet',
        temperature: 0.3,
        maxTokens: 1000,
        apiKey: 'test-key'
      });

      expect(result).toBe('Translated text');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-sonnet',
        max_tokens: 1000,
        temperature: 0.3,
        system: 'system',
        messages: [{ role: 'user', content: 'user' }]
      });
    });

    it('should use default model when not specified', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Translated text' }]
      });

      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate }
      }) as any);

      const provider = new AnthropicProvider();
      await provider.translate('system', 'user', { 
        temperature: 0.3,
        maxTokens: 1000,
        apiKey: 'test-key'
      } as any);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'claude-sonnet-4-20250514'
      }));
    });

    it('should throw error for unexpected response type', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'image', data: 'base64data' }]
      });

      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate }
      }) as any);

      const provider = new AnthropicProvider();
      await expect(provider.translate('system', 'user', { 
        model: 'claude-3-sonnet',
        temperature: 0.3,
        maxTokens: 1000,
        apiKey: 'test-key'
      })).rejects.toThrow('Unexpected response type from Anthropic');
    });
  });

  describe('OpenAIProvider', () => {
    it('should have correct name', () => {
      const provider = new OpenAIProvider();
      expect(provider.name).toBe('openai');
    });

    it('should translate with custom options', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'OpenAI translation' } }]
      });

      const { default: OpenAI } = await import('openai');
      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }) as any);

      const provider = new OpenAIProvider();
      const result = await provider.translate('system', 'user', {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2000,
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1'
      });

      expect(result).toBe('OpenAI translation');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: 'system' },
          { role: 'user', content: 'user' }
        ]
      });
    });

    it('should use default model when not specified', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Translation' } }]
      });

      const { default: OpenAI } = await import('openai');
      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }) as any);

      const provider = new OpenAIProvider();
      await provider.translate('system', 'user', {
        temperature: 0.3,
        maxTokens: 1000,
        apiKey: 'test-key'
      } as any);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-4o'
      }));
    });

    it('should handle empty response', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: []
      });

      const { default: OpenAI } = await import('openai');
      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }) as any);

      const provider = new OpenAIProvider();
      const result = await provider.translate('system', 'user', {
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1000,
        apiKey: 'test-key'
      });

      expect(result).toBe('');
    });
  });

  describe('OllamaProvider', () => {
    it('should have correct name', () => {
      const provider = new OllamaProvider();
      expect(provider.name).toBe('ollama');
    });

    it('should translate with default options', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: { content: 'Ollama translation' }
        })
      });
      global.fetch = mockFetch;

      const provider = new OllamaProvider();
      const result = await provider.translate('system', 'user', {
        model: 'llama3',
        temperature: 0.3,
        maxTokens: 1000
      });

      expect(result).toBe('Ollama translation');
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          stream: false,
          messages: [
            { role: 'system', content: 'system' },
            { role: 'user', content: 'user' }
          ],
          options: {
            temperature: 0.3,
            num_predict: 1000
          }
        })
      });
    });

    it('should use custom base URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: { content: 'Translation' }
        })
      });
      global.fetch = mockFetch;

      const provider = new OllamaProvider();
      await provider.translate('system', 'user', {
        model: 'llama3',
        temperature: 0.3,
        maxTokens: 1000,
        baseUrl: 'http://custom-host:11434'
      });

      expect(mockFetch).toHaveBeenCalledWith('http://custom-host:11434/api/chat', expect.any(Object));
    });

    it('should throw error on failed request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      global.fetch = mockFetch;

      const provider = new OllamaProvider();
      await expect(provider.translate('system', 'user', {
        model: 'llama3',
        temperature: 0.3,
        maxTokens: 1000
      })).rejects.toThrow('Ollama error: 500 Internal Server Error');
    });

    it('should handle empty response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });
      global.fetch = mockFetch;

      const provider = new OllamaProvider();
      const result = await provider.translate('system', 'user', {
        model: 'llama3',
        temperature: 0.3,
        maxTokens: 1000
      });

      expect(result).toBe('');
    });
  });
});