import OpenAI from 'openai';
import type { LLMProvider } from './base.js';
import type { ProviderOptions } from '../types.js';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';

  async translate(systemPrompt: string, userPrompt: string, options: ProviderOptions): Promise<string> {
    const client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    });

    const response = await client.chat.completions.create({
      model: options.model || 'gpt-4o',
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens || 8192,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    return response.choices[0]?.message?.content || '';
  }
}
