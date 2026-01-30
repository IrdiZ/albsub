import type { ProviderOptions } from '../types.js';

export interface LLMProvider {
  name: string;
  translate(systemPrompt: string, userPrompt: string, options: ProviderOptions): Promise<string>;
}

export async function createProvider(name: string): Promise<LLMProvider> {
  switch (name.toLowerCase()) {
    case 'anthropic': {
      const { AnthropicProvider } = await import('./anthropic.js');
      return new AnthropicProvider();
    }
    case 'openai': {
      const { OpenAIProvider } = await import('./openai.js');
      return new OpenAIProvider();
    }
    case 'ollama': {
      const { OllamaProvider } = await import('./ollama.js');
      return new OllamaProvider();
    }
    default:
      throw new Error(`Unknown provider: ${name}. Supported: anthropic, openai, ollama`);
  }
}
