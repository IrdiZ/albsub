import type { LLMProvider } from './base.js';
import type { ProviderOptions } from '../types.js';

export class OllamaProvider implements LLMProvider {
  name = 'ollama';

  async translate(systemPrompt: string, userPrompt: string, options: ProviderOptions): Promise<string> {
    const baseUrl = options.baseUrl || 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || 'llama3',
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: {
          temperature: options.temperature ?? 0.3,
          num_predict: options.maxTokens || 8192,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return data.message?.content || '';
  }
}
