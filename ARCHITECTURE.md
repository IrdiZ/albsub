# AlbSub — Technical Architecture

## Project Structure

```
albsub/
├── README.md                 # Project overview & docs
├── LINKEDIN-POST.md          # LinkedIn post draft
├── ARCHITECTURE.md           # This file
├── package.json              # Node.js project config
├── tsconfig.json             # TypeScript config
├── src/
│   ├── index.ts              # CLI entry point (commander.js)
│   ├── parser.ts             # SRT parser (read/write .srt files)
│   ├── chunker.ts            # Batch grouping with context windows
│   ├── translator.ts         # Core translation engine
│   ├── validator.ts          # Post-translation validation
│   ├── providers/
│   │   ├── base.ts           # Abstract LLM provider interface
│   │   ├── anthropic.ts      # Anthropic (Claude) provider
│   │   ├── openai.ts         # OpenAI (GPT) provider
│   │   ├── ollama.ts         # Ollama (local models) provider
│   │   └── custom.ts         # Any OpenAI-compatible endpoint
│   ├── prompts/
│   │   ├── system.ts         # System prompt templates
│   │   └── retry.ts          # Retry/correction prompts
│   ├── progress.ts           # Live progress bar + ETA
│   ├── config.ts             # Config file loader (YAML)
│   ├── detect.ts             # Source language auto-detection
│   └── types.ts              # TypeScript interfaces
├── tests/
│   ├── parser.test.ts        # SRT parsing tests
│   ├── validator.test.ts     # Validation tests
│   ├── chunker.test.ts       # Batching tests
│   └── fixtures/
│       ├── sample.ita.srt    # Italian test subtitle
│       ├── sample.eng.srt    # English test subtitle
│       └── sample.alb.srt    # Expected Albanian output
└── bin/
    └── albsub                # CLI binary entry
```

## Core Components

### 1. SRT Parser (`parser.ts`)

```typescript
interface SubtitleBlock {
  number: number;
  timestamp: string;        // "00:02:22,320 --> 00:02:24,280"
  lines: string[];          // ["Line 1", "Line 2"]
  rawText: string;          // Original text with \n
}

interface ParseResult {
  blocks: SubtitleBlock[];
  encoding: string;         // UTF-8, UTF-8 BOM, Latin-1, etc.
  lineEnding: 'LF' | 'CRLF';
}

// Handles: UTF-8 BOM, CRLF/LF, malformed blocks, empty lines
function parseSRT(filePath: string): ParseResult;
function writeSRT(blocks: SubtitleBlock[], filePath: string, options?: WriteOptions): void;
```

### 2. Chunker (`chunker.ts`)

Groups blocks into translation batches with configurable context windows:

```typescript
interface Chunk {
  blocks: SubtitleBlock[];     // Blocks to translate
  context: SubtitleBlock[];    // Previous N blocks for context (not translated)
  index: number;               // Chunk index
}

function createChunks(blocks: SubtitleBlock[], batchSize: number, contextWindow: number): Chunk[];
```

### 3. Translator (`translator.ts`)

The core engine. For each chunk:

```typescript
interface TranslationResult {
  original: SubtitleBlock;
  translated: SubtitleBlock;
  valid: boolean;
  issues: ValidationIssue[];
}

// Translation flow per chunk:
// 1. Build prompt with context + blocks
// 2. Send to LLM provider
// 3. Parse response back into SubtitleBlock[]
// 4. Validate each block
// 5. Retry failed blocks (up to maxRetries)
// 6. Return results with validation status
```

**Prompt structure:**
```
System: You are a professional subtitle translator. Translate the following 
subtitle blocks from {source_language} to Albanian (Shqip). Rules:
- Keep EXACTLY the same number of lines per block
- Preserve HTML tags (<i>, <b>) exactly as they appear
- Preserve speaker labels in brackets [Name] 
- Use natural, colloquial Albanian — this is movie dialogue, not a textbook
- Match the tone (comedy = informal, drama = more formal)
- Keep proper nouns unchanged (character names, place names)
- Each block is separated by "---"

Context (previous dialogue, do NOT translate):
[Block N-3] ...
[Block N-2] ...  
[Block N-1] ...

Translate these blocks:
[Block N] ...
[Block N+1] ...
...
```

### 4. Validator (`validator.ts`)

```typescript
interface ValidationIssue {
  block: number;
  type: 'line_count_mismatch' | 'empty_translation' | 'missing_tag' | 
        'missing_label' | 'timestamp_changed';
  expected: string;
  got: string;
}

function validateBlock(original: SubtitleBlock, translated: SubtitleBlock): ValidationIssue[];
function validateAll(results: TranslationResult[]): ValidationReport;
```

### 5. Progress (`progress.ts`)

Real-time CLI output:

```
Translating: Christmas.In.Love.2004.ita.srt → Albanian
Provider: anthropic (claude-sonnet-4-20250514) | Workers: 2 | Batch size: 50

[████████████████░░░░░░░░░░░░] 62% | 936/1508 blocks | 12.4 blocks/s | ETA: 46s

✅ Validated: 934/936 | ⚠️ Retrying: 2 | ❌ Failed: 0
```

### 6. Provider Interface (`providers/base.ts`)

```typescript
interface LLMProvider {
  name: string;
  translate(prompt: string, options: ProviderOptions): Promise<string>;
  estimateCost(inputTokens: number, outputTokens: number): number;
}

interface ProviderOptions {
  model: string;
  temperature: number;      // Default: 0.3 (low creativity for translation)
  maxTokens: number;
  apiKey?: string;
  baseUrl?: string;
}
```

## Data Flow

```
Input .srt file
    │
    ▼
┌─────────────┐
│  Parse SRT   │ → Detect encoding, extract blocks, handle edge cases
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ Auto-detect   │ → Sample first 10 blocks, detect source language
│ Language      │   (using LLM or franc-min library)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Create Chunks │ → Group into batches of N with context windows
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Translation Pool  │ → W workers processing chunks in parallel
│ (W workers)       │   Each worker: translate → validate → retry
└──────┬───────────┘
       │
       ▼
┌──────────────┐
│ Assemble      │ → Merge all translated blocks, preserve order
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Final Report  │ → Block count, pass rate, issues, cost estimate
└──────┬───────┘
       │
       ▼
Output .srt file (Albanian)
```

## Error Handling

| Error | Strategy |
|-------|----------|
| API rate limit | Exponential backoff (1s, 2s, 4s, 8s...) |
| API timeout | Retry with smaller batch size |
| Line count mismatch | Re-send block with explicit correction prompt |
| Empty translation | Re-send with "do not return empty" instruction |
| Missing HTML tags | Re-send with tag preservation emphasis |
| Network error | Retry up to 5 times |
| Invalid SRT input | Error with line number and suggestion |

## Cost Estimation

For a typical 1500-block movie subtitle:

| Provider | Model | Est. Cost | Speed |
|----------|-------|-----------|-------|
| Anthropic | claude-sonnet-4-20250514 | ~$0.15 | ~3 min |
| Anthropic | claude-haiku-3 | ~$0.02 | ~1 min |
| OpenAI | gpt-4o | ~$0.10 | ~2 min |
| OpenAI | gpt-4o-mini | ~$0.01 | ~1 min |
| Ollama | llama3-70b | Free | ~10 min |
| Ollama | llama3-8b | Free | ~3 min |

## Future Ideas

- **Web UI** — drag & drop .srt, pick language, download Albanian translation
- **Browser extension** — auto-translate subtitles on streaming sites
- **Subtitle database** — community-curated Albanian subtitle repository
- **Quality scoring** — rate translations, learn from corrections
- **Dialect support** — Gheg vs Tosk Albanian variants
- **Glossary system** — consistent character name translations across episodes (TV series)
