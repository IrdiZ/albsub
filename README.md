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

## Translation Results — Side-by-Side Comparisons

All translations below were generated by AlbSub using **GPT-4o** with default settings (batch size 25, context window 3, temperature 0.3). **100% validation pass rate** on all runs.

---

### 🇮🇹→🇦🇱 Italian to Albanian — *Christmas in Love* (2004)

> Classic cinepanettone with Boldi & De Sica. The film that started this whole project.

| # | 🇮🇹 Italian (Original) | 🇦🇱 Albanian (AlbSub) |
|---|---|---|
| 1 | Bravo! Grande! | Bravo! Grande! |
| 2 | Sei stato grande! | Ke qenë i madh! |
| 3 | Bravo! | Bravo! |
| 4 | *Questo sono io, Guido Baldi. Ho 54 anni.* | *Kjo jam unë, Guido Baldi. Kam 54 vjeç.* |
| 5 | *Portati benissimo!* | *I mbaj shumë mirë!* |
| 6 | *Dalla vita ho avuto tutto.* | *Kam marrë gjithçka nga jeta.* |
| 7 | *Tre titoli Granturismo, 2 finali in Coppa America con Mascalzone Padano* | *Tre tituj Granturismo, 2 finale në Kupën e Amerikës me Mascalzone Padano* |
| 8 | *5 anni consigliere di Confindustria* | *5 vjet këshilltar në Confindustria* |
| 9 | *un 15% di incremento annuo per la mia azienda nautica* | *një rritje vjetore prej 15% për kompaninë time të anijeve* |
| 10 | *una figlia che studia a New York* | *një vajzë që studion në New York* |
| 11 | *e una moglie splendida, mai tradita. Finché non è arrivata lei.* | *dhe një grua e mrekullueshme, kurrë e tradhtuar. Derisa erdhi ajo.* |
| 12 | *Sofia, russa di Siberia, 25 anni, bella da far paura!* | *Sofia, ruse nga Siberia, 25 vjeç, e bukur sa të tremb!* |
| 13 | *Meno che a me.* | *Më pak se mua.* |
| 14 | Oh! | Oh! |
| 15 | *Da quando l'ho incontrata, la mia vita è cambiata di botto.* | *Që kur e takova, jeta ime ndryshoi menjëherë.* |
| 16 | *Mi sono innamorato di lei come un bimbo.* | *U dashurova me të si një fëmijë.* |
| 17 | *Anche lei si è innamorata di me e dice di trovarmi "molto fico".* | *Edhe ajo u dashurua me mua dhe thotë se më gjen "shumë të lezetshëm".* |
| 18 | - Tieni, amore. - Cos'è? | - Ja, dashuri. - Çfarë është? |
| 19 | - Buon compleanno! L'ho ricordato. | - Gëzuar ditëlindjen! E mbajta mend. |

**Notes:** Speaker labels `[Guido]`, HTML tags (`<i>`), and line counts all preserved perfectly. Natural colloquial Albanian — not stiff translation.

---

### 🇬🇧→🇦🇱 English to Albanian

| # | 🇬🇧 English (Original) | 🇦🇱 Albanian (AlbSub) |
|---|---|---|
| 1 | Good morning everyone! | Mirëmëngjes të gjithëve! |
| 2 | How are you today? / Everything okay? | Si jeni sot? / Gjithçka në rregull? |
| 3 | *I can't believe this happened.* | *Nuk mund ta besoj që ndodhi kjo.* |
| 4 | [Marco] Where did you go yesterday? | [Marco] Ku ishe dje? |
| 5 | I went to the market with my mother. | Shkova në treg me mamanë time. |
| 6 | **Attention!** This is important. | **Kujdes!** Kjo është e rëndësishme. |
| 7 | [Julia] I don't like this place. | [Julia] Nuk më pëlqen ky vend. |
| 8 | We need to leave right away. | Duhet të ikim menjëherë. |
| 9 | *Life is beautiful, but also difficult.* | *Jeta është e bukur, por edhe e vështirë.* |
| 10 | [Marco] You're right. | [Marco] Ke të drejtë. |
| 11 | I remember when we were young and happy. | Më kujtohet kur ishim të rinj dhe të lumtur. |
| 12 | Those times will never return. | Ato kohëra nuk do të kthehen kurrë. |
| 13 | *Maybe one day everything will change.* | *Ndoshta një ditë gjithçka do të ndryshojë.* |
| 14 | [Julia] I really hope so. With all my heart. | [Julia] Shpresoj shumë. Me gjithë zemër. |
| 15 | Let's go home, it's late. | Le të shkojmë në shtëpi, është vonë. |
| 16 | **Don't forget** the keys! | **Mos harro** çelësat! |
| 17 | [Marco] I already took them. Don't worry. | [Marco] I kam marrë tashmë. Mos u shqetëso. |
| 18 | Thank you for everything, my friend. | Faleminderit për gjithçka, miku im. |
| 19 | *And so ends another day.* | *Dhe kështu përfundon një ditë tjetër.* |
| 20 | Good night everyone. | Natën e mirë të gjithëve. |

---

### 🇮🇹→🇦🇱 Italian to Albanian — Same Dialogue (Cross-Language Consistency Test)

> Same content as above but translated from Italian source. Tests whether AlbSub produces consistent Albanian regardless of source language.

| # | 🇮🇹 Italian (Source) | 🇦🇱 Albanian (from Italian) | 🇦🇱 Albanian (from English) |
|---|---|---|---|
| 1 | Buongiorno a tutti! | Mirëmëngjes të gjithëve! | Mirëmëngjes të gjithëve! |
| 2 | Come stai oggi? Tutto bene? | Si je sot? Çdo gjë mirë? | Si jeni sot? Gjithçka në rregull? |
| 3 | *Non posso credere che sia successo.* | *Nuk mund ta besoj që ndodhi.* | *Nuk mund ta besoj që ndodhi kjo.* |
| 4 | [Marco] Dove sei andato ieri? | [Marco] Ku shkove dje? | [Marco] Ku ishe dje? |
| 5 | Sono andato al mercato con mia madre. | Shkova në treg me mamin. | Shkova në treg me mamanë time. |
| 9 | *La vita è bella, ma anche difficile.* | *Jeta është e bukur, por edhe e vështirë.* | *Jeta është e bukur, por edhe e vështirë.* |
| 14 | [Giulia] Lo spero davvero. Con tutto il cuore. | [Giulia] Shpresoj me të vërtetë. Me gjithë zemër. | [Julia] Shpresoj shumë. Me gjithë zemër. |
| 18 | Grazie di tutto, amico mio. | Faleminderit për gjithçka, miku im. | Faleminderit për gjithçka, miku im. |
| 20 | Buonanotte a tutti. | Natën e mirë të gjithëve. | Natën e mirë të gjithëve. |

**Key observations:**
- ✅ Core meaning preserved identically across both source languages
- ✅ Natural variation in phrasing (e.g., "Si je sot?" vs "Si jeni sot?" — informal vs formal *you*)
- ✅ Speaker labels preserved correctly (`[Giulia]` kept from Italian, `[Julia]` kept from English)
- ✅ HTML formatting (`<i>`, `<b>`) preserved in both
- ✅ Colloquial, natural Albanian — not robotic word-for-word translation

## License

MIT

---

**Made with 🔥 by [Irdi Zeneli](https://github.com/IrdiZ)**

*Because every language deserves subtitles.*
