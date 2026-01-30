# 🇦🇱 AlbSub — Subtitle Translation Pipeline for Albanian

**Translate movie subtitles into Albanian using any LLM. Built because we couldn't find English subs for a 2004 Italian comedy at 1 AM.**

---

## The Problem

I wanted to watch *Christmas in Love* (2004) — a classic Italian cinepanettone with Boldi & De Sica. The movie is in Italian. English subtitles? Don't exist. Albanian subtitles? Forget about it.

This isn't a one-off problem. **Thousands of movies** — Italian, Turkish, Greek, Indian — are loved by Albanian audiences but have zero Albanian subtitle coverage. The existing subtitle databases (OpenSubtitles, Subscene, Podnapisi) have virtually nothing in Albanian. What does exist is often machine-translated garbage that misses cultural context, humor, and natural speech.

**Albanian is one of the most underserved languages in the subtitle ecosystem.**

The implications go beyond just watching movies:
- **Albanian diaspora** (estimated 10M+ worldwide) consumes foreign media daily with no subtitle support
- **Albanian film education** suffers — students can't study foreign cinema in their language
- **Cultural accessibility** — older generations who don't speak English are locked out of global entertainment
- **The Albanian art scene** — directors, screenwriters, and filmmakers lose exposure to international storytelling techniques when they can't access foreign films with quality translations

## The Solution

AlbSub is a CLI pipeline that takes subtitle files (.srt) in **any source language** and produces high-quality Albanian translations using LLMs. Not Google Translate. Not a lookup table. Actual contextual, natural, colloquial Albanian — the kind that sounds like a human translator wrote it.

### Key Features

- 🌍 **Multi-language input** — Italian, English, Turkish, Greek, French, German, Spanish, and more → Albanian
- 🤖 **Any LLM backend** — OpenAI, Anthropic, local Ollama models, or any OpenAI-compatible API
- 📊 **Live progress tracking** — real-time progress bar with ETA, blocks translated, speed
- ✅ **Line validation** — automatically checks that every block has the correct number of lines (no dropped second lines, no truncated dialogue)
- 🔄 **Batch processing** — translates in configurable batches for speed and reliability
- 🔁 **Auto-retry** — failed blocks are automatically retried with exponential backoff
- 📝 **SRT-aware** — preserves timestamps, HTML tags (`<i>`, `<b>`), speaker labels (`[Name]`), and subtitle formatting
- 🎭 **Context-aware** — sends surrounding blocks as context so the LLM understands the scene, not just isolated lines
- 🔍 **Validation report** — post-translation report showing block count match, line count match, empty block detection
- ⚡ **Parallel workers** — configurable concurrency for faster translation

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Input .srt  │────▶│  SRT Parser   │────▶│  Batch Chunker   │────▶│  LLM Workers  │
│  (any lang)  │     │  (validate)   │     │  (configurable)  │     │  (parallel)   │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────┬───────┘
                                                                         │
                    ┌──────────────┐     ┌─────────────────┐            │
                    │  Output .srt  │◀────│  Validator       │◀───────────┘
                    │  (Albanian)   │     │  (line matching) │
                    └──────────────┘     └─────────────────┘
```

### Pipeline Steps

1. **Parse** — Read .srt, extract blocks (number, timestamp, text lines)
2. **Detect language** — Auto-detect source language or accept user override
3. **Chunk** — Group blocks into batches (default: 50 blocks per batch)
4. **Translate** — Send each batch to the configured LLM with:
   - System prompt enforcing Albanian translation rules
   - Context window (previous 3 blocks for continuity)
   - Strict instruction to preserve line count per block
5. **Validate** — For each translated block:
   - Line count matches original ✓
   - No empty lines where original had text ✓
   - HTML tags preserved ✓
   - Speaker labels preserved ✓
   - Timestamps unchanged ✓
6. **Retry** — Any failed validation → re-translate that block with explicit error feedback
7. **Assemble** — Write validated blocks to output .srt
8. **Report** — Print summary: total blocks, pass rate, any remaining issues

## Usage

```bash
# Basic usage — Italian to Albanian using Claude
albsub translate movie.ita.srt -o movie.alb.srt --from it --model claude-sonnet-4-20250514

# Using OpenAI
albsub translate movie.srt -o movie.alb.srt --from en --provider openai --model gpt-4o

# Using local Ollama model
albsub translate movie.srt -o movie.alb.srt --from tr --provider ollama --model llama3

# With custom API endpoint (any OpenAI-compatible)
albsub translate movie.srt -o movie.alb.srt --from el --base-url http://localhost:8080/v1

# Parallel workers for speed
albsub translate movie.srt -o movie.alb.srt --from it --workers 4

# Validate an existing translation
albsub validate original.srt translated.srt

# Dry run — show what would be translated without calling the API
albsub translate movie.srt -o movie.alb.srt --from it --dry-run
```

### Configuration

```yaml
# albsub.config.yml
provider: anthropic          # anthropic | openai | ollama | custom
model: claude-sonnet-4-20250514       # any model the provider supports
api_key: ${ANTHROPIC_API_KEY}  # env var reference
base_url: null               # custom endpoint (for ollama, vllm, etc.)

translation:
  target: sq                 # Albanian (ISO 639-1)
  batch_size: 50             # blocks per API call
  context_window: 3          # surrounding blocks for context
  workers: 2                 # parallel translation workers
  max_retries: 3             # retry failed blocks

validation:
  strict_line_count: true    # enforce matching line counts
  check_empty: true          # flag empty translations
  check_tags: true           # verify HTML tag preservation
  check_labels: true         # verify speaker label preservation

style:
  formality: colloquial      # colloquial | neutral | formal
  dialect: standard          # standard | gheg | tosk
  preserve_slang: true       # attempt to find Albanian equivalents for slang
```

## Supported Source Languages

| Language | Code | Quality |
|----------|------|---------|
| Italian | `it` | ⭐⭐⭐⭐⭐ (tested extensively) |
| English | `en` | ⭐⭐⭐⭐⭐ |
| Turkish | `tr` | ⭐⭐⭐⭐ |
| Greek | `el` | ⭐⭐⭐⭐ |
| French | `fr` | ⭐⭐⭐⭐ |
| German | `de` | ⭐⭐⭐⭐ |
| Spanish | `es` | ⭐⭐⭐⭐ |
| Serbian | `sr` | ⭐⭐⭐⭐ |
| Arabic | `ar` | ⭐⭐⭐ |
| Hindi | `hi` | ⭐⭐⭐ |

Quality depends on the LLM's training data for that language pair. Italian/English → Albanian works best since most LLMs have strong coverage of all three.

## Validation System

The #1 problem with LLM subtitle translation is **dropped lines**. A 2-line subtitle block comes back as 1 line, losing half the dialogue. AlbSub solves this:

```
Original (Italian):                    Bad Translation:              AlbSub Output:
─────────────────                      ───────────────               ──────────────
[Guido] <i>Questo sono io,</i>        [Guido] <i>This is me,</i>   [Guido] <i>Ky jam unë,</i>
<i>Guido Baldi. Ho 54 anni.</i>       (LINE MISSING!)               <i>Guido Baldi. Jam 54 vjeç.</i>
```

Every block is validated post-translation. If line counts don't match, the block is automatically re-sent to the LLM with an explicit correction prompt. This runs up to 3 times before flagging it for manual review.

## Why LLMs Beat Traditional Machine Translation

Google Translate for subtitles gives you:
- ❌ Literal word-for-word translation
- ❌ No understanding of humor, sarcasm, or cultural context
- ❌ Formal register when the character is being casual
- ❌ No awareness that this is dialogue, not a document

LLMs give you:
- ✅ Natural, conversational Albanian
- ✅ Humor and cultural references adapted (not just translated)
- ✅ Correct register — casual when characters are casual, formal when formal
- ✅ Context from surrounding dialogue
- ✅ Understanding of speaker labels and scene context

## The Origin Story

January 30, 2026, 1 AM. I wanted to watch *Christmas in Love* (2004) — a Boldi & De Sica Italian Christmas comedy. The movie exists in Italian. English subtitles? Scraped the entire internet — OpenSubtitles, Subscene, Podnapisi, SubDL, obscure forums — nothing. Found Italian .srt files, ran them through a translation pipeline I built on the spot, and had English subs in 15 minutes.

Then I thought: if English subs don't exist for a popular Italian comedy, what about Albanian? Albanian subtitles are virtually nonexistent for foreign films. Millions of Albanian speakers worldwide consuming Turkish dramas, Italian comedies, Greek films — all without subtitle support.

That's how AlbSub was born. A tool that can take any .srt file in any language and produce quality Albanian subtitles using the LLM of your choice.

## Contributing

PRs welcome. Especially:
- New language pair testing and quality reports
- Albanian dialect support (Gheg/Tosk)
- Performance optimizations
- Additional LLM provider integrations

## License

MIT

---

**Made with 🔥 by [Irdi Zeneli](https://github.com/IrdiZ)**

*Because every language deserves subtitles.*
