# AlbSub architecture

AlbSub is a TypeScript CLI. It reads an .srt file, sends batches of blocks to an LLM, checks the result, and writes a new .srt file.

## Project structure

```
src/
  index.ts          CLI entry point (commander): translate, validate, detect
  parser.ts         Read and write .srt files (BOM, LF/CRLF)
  chunker.ts        Group blocks into batches with a context window
  translator.ts     Worker pool, response parsing, retry of failed blocks
  validator.ts      Per-block checks and the summary report
  detect.ts         Source language detection (franc-min)
  config.ts         YAML config loader
  progress.ts       Progress bar
  types.ts          Shared interfaces
  prompts/
    system.ts       System prompt and user prompt builder
    retry.ts        Correction prompt for failed blocks
  providers/
    base.ts         Provider interface and factory
    anthropic.ts    Anthropic (Claude)
    openai.ts       OpenAI
    ollama.ts       Ollama (local HTTP API)
tests/              Vitest tests (providers are mocked)
bin/albsub.js       Binary entry. It imports dist/index.js, so run `npm run build` first.
```

## Data flow

```
input.srt -> parse -> detect language -> chunk -> workers -> validate -> retry -> output.srt
```

1. `parser.ts` reads the file and keeps the encoding and line ending.
2. `detect.ts` guesses the source language from the first 10 blocks, unless `--language` is set.
3. `chunker.ts` makes batches of `batchSize` blocks. Each batch also carries the `contextWindow` blocks before it.
4. `translator.ts` runs `workers` batches at the same time. Each batch is one LLM call.
5. `validator.ts` checks each translated block against its original.
6. A failed block is sent again with a correction prompt, up to `maxRetries` times.
7. The writer saves the blocks with the original timestamps.

## Validation checks

For each block, the validator checks:

- The line count is the same as the original.
- The text is not empty.
- The HTML tags (`<i>`, `<b>`) are the same.
- The speaker labels (`[Name]`) are the same.

If a block still fails after the last retry, it stays in the output and the final report counts it as failed.

## Provider interface

```typescript
interface LLMProvider {
  name: string;
  translate(systemPrompt: string, userPrompt: string, options: ProviderOptions): Promise<string>;
}
```

To add a provider, implement this interface in `src/providers/` and add a case to `createProvider` in `base.ts`.

## Ideas, not built

- Glossary for consistent character names in a TV series
- Gheg and Tosk dialect options
- Cost estimate in the final report
- Backoff on API rate limits
