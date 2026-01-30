import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider } from './base.js';
import type { ProviderOptions } from '../types.js';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';

  async translate(systemPrompt: string, userPrompt: string, options: ProviderOptions): Promise<string> {
    const client = new Anthropic({ apiKey: options.apiKey });

    const response = await client.messages.create({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const block = response.content[0];
    if (block.type === 'text') return block.text;
    throw new Error('Unexpected response type from Anthropic');
  }
}
