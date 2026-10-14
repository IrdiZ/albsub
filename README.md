# AlbSub

A command-line tool that translates `.srt` subtitle files into Albanian with an LLM.

Status: early prototype. The unit tests pass, but they use mocked providers. Real translation quality is not measured yet.

## What it does

- Reads an `.srt` file in any language that your LLM knows. It detects the source language, or you set it with `--language`.
- Sends the subtitles to Anthropic, OpenAI, or a local Ollama model in batches.
- Gives the model the previous blocks as context, so it can follow the scene.
- Checks every translated block against the original. It checks the line count, empty text, HTML tags (`<i>`, `<b>`), and speaker labels (`[Name]`).
- Asks the model again for blocks that fail the checks.
- Writes a new `.srt` file. Timestamps stay the same.

Why: Albanian subtitles are rare for many foreign films and series. This tool gives you a first draft quickly.

<!-- demo gif: terminal run of `albsub translate tests/fixtures/sample.ita.srt --language it` showing the progress bar and the results summary, then the first lines of the output file -->

## Quick start

You need Node.js 18 or newer and an API key for Anthropic or OpenAI. For Ollama you need a running Ollama server instead.

```bash
git clone https://github.com/IrdiZ/albsub.git
cd albsub
npm install
npm run build
```

`bin/albsub.js` loads `dist/`, so run the build before the first use. To get the `albsub` command on your PATH, run `npm link`. Without it, use `node bin/albsub.js` in place of `albsub`.

Translate a file with Claude:

```bash
export ANTHROPIC_API_KEY=your-key
albsub translate movie.ita.srt -o movie.alb.srt --language it
```

Use OpenAI. Set the model, because the default model is a Claude model:

```bash
export OPENAI_API_KEY=your-key
albsub translate movie.srt -o movie.alb.srt --provider openai --model gpt-4o
```

Use a local Ollama model (default server: `http://localhost:11434`):

```bash
albsub translate movie.srt -o movie.alb.srt --provider ollama --model llama3
```

Other commands:

```bash
albsub detect movie.srt                      # print the detected language
albsub validate original.srt translated.srt  # check a translation, no API call
```

If you leave out `-o`, the output goes to the input name with `.srt` replaced by `.alb.srt`.

### Options

| Option | Default | Meaning |
|---|---|---|
| `-o, --output <path>` | `<input>.alb.srt` | Output file |
| `-p, --provider <name>` | `anthropic` | `anthropic`, `openai`, or `ollama` |
| `-m, --model <name>` | `claude-sonnet-4-20250514` | Model name |
| `-k, --api-key <key>` | env variable | Otherwise `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` |
| `-b, --batch-size <n>` | 25 | Blocks per LLM call |
| `-c, --context <n>` | 3 | Earlier blocks sent as context |
| `-w, --workers <n>` | 2 | Batches translated at the same time |
| `-r, --retries <n>` | 2 | Retries per failed block |
| `-l, --language <lang>` | auto-detect | Source language, as a name or code |
| `-t, --temperature <n>` | 0.3 | LLM temperature |
| `--config <path>` | see below | Config file |

### Config file

The tool reads `albsub.yml`, `albsub.yaml`, `.albsub.yml`, or `.albsub.yaml` in the current folder. Command-line options override it. The keys are camelCase:

```yaml
provider: openai
model: gpt-4o
batchSize: 25
contextWindow: 3
workers: 2
temperature: 0.3
maxRetries: 2
# apiKey: ...   (better to use an environment variable)
```

## How it works

```
input.srt -> parse -> detect language -> batches (+ context)
          -> LLM workers -> validate each block -> retry failed blocks
          -> output.srt + summary
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the module layout.

Example of the line-count problem that the validator catches. An LLM sometimes returns one line for a two-line block:

```
Original (it)             Bad result             Accepted result
<i>Non posso credere      <i>Nuk mund ta         <i>Nuk mund ta besoj
che sia successo.</i>     besoj.</i>             që ndodhi kjo.</i>
```

The bad result has one line instead of two. The tool sends the block again with the problem described.

## Limitations

- Translation quality is not measured. The tests use mocked providers. Quality is not measured for any source language.
- Run a native Albanian speaker over the result. LLMs can make mistakes in grammatical gender, word choice, and tone.
- If a block still fails after all retries, it is kept in the output and counted as failed in the summary. Check the summary.
- The validator checks structure only. It does not check that the meaning is right.
- The tool does not wait or back off when an API rate limit is hit. If the first call for a batch fails, the run stops with an error.
- Only the `.srt` format is supported.
- There is no dry-run mode, no cost estimate, and no custom provider yet.
- The Ollama provider uses `http://localhost:11434`. Changing the URL is not possible from the CLI yet.

## Development

```bash
npm test        # run the tests (providers are mocked, no API key needed)
npm run build   # compile TypeScript to dist/
npm start -- translate movie.srt   # run from source with tsx
```

## License

MIT. See [LICENSE](LICENSE).
