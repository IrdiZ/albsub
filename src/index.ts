#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { parseSRTFile, writeSRTFile } from './parser.js';
import { createProvider } from './providers/base.js';
import { translate } from './translator.js';
import { validateBlock, validateAll } from './validator.js';
import { detectFromBlocks } from './detect.js';
import { loadConfig } from './config.js';
import { ProgressBar } from './progress.js';

const program = new Command();

program
  .name('albsub')
  .description('Translate subtitle files (.srt) into Albanian using LLMs')
  .version('1.0.0');

program
  .command('translate')
  .description('Translate an SRT file to Albanian')
  .argument('<input>', 'Input .srt file path')
  .option('-o, --output <path>', 'Output file path (default: input.alb.srt)')
  .option('-p, --provider <name>', 'LLM provider (anthropic, openai, ollama)', 'anthropic')
  .option('-m, --model <name>', 'Model name')
  .option('-k, --api-key <key>', 'API key (or use env: ANTHROPIC_API_KEY, OPENAI_API_KEY)')
  .option('-b, --batch-size <n>', 'Blocks per batch', '25')
  .option('-c, --context <n>', 'Context window size', '3')
  .option('-w, --workers <n>', 'Parallel workers', '2')
  .option('-r, --retries <n>', 'Max retries per block', '2')
  .option('-l, --language <lang>', 'Source language (auto-detected if omitted)')
  .option('--config <path>', 'Config file path')
  .option('-t, --temperature <n>', 'LLM temperature', '0.3')
  .action(async (input: string, opts: Record<string, string>) => {
    try {
      const config = loadConfig(opts.config);
      const providerName = opts.provider || config.provider;
      const model = opts.model || config.model;
      const apiKey = opts.apiKey || config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
      const batchSize = parseInt(opts.batchSize) || config.batchSize;
      const contextWindow = parseInt(opts.context) || config.contextWindow;
      const workers = parseInt(opts.workers) || config.workers;
      const maxRetries = parseInt(opts.retries) || config.maxRetries;
      const temperature = parseFloat(opts.temperature) || config.temperature;

      console.log(chalk.bold.cyan('\n🎬 AlbSub — Subtitle Translator\n'));

      // Parse input
      console.log(chalk.dim(`Parsing: ${input}`));
      const parsed = parseSRTFile(input);
      console.log(chalk.green(`✓ Parsed ${parsed.blocks.length} blocks (${parsed.encoding}, ${parsed.lineEnding})`));

      // Detect language
      let sourceLanguage = opts.language;
      if (!sourceLanguage) {
        const detected = detectFromBlocks(parsed.blocks);
        sourceLanguage = detected.name;
        console.log(chalk.green(`✓ Detected language: ${sourceLanguage} (${detected.code})`));
      }

      // Set up provider
      const provider = await createProvider(providerName);
      console.log(chalk.green(`✓ Provider: ${providerName} (${model})`));
      console.log(chalk.dim(`  Workers: ${workers} | Batch: ${batchSize} | Context: ${contextWindow}\n`));

      // Translate with progress
      const progress = new ProgressBar(parsed.blocks.length);
      const results = await translate(parsed.blocks, {
        provider,
        providerOptions: { model, temperature, maxTokens: 4096, apiKey },
        sourceLanguage,
        batchSize,
        contextWindow,
        workers,
        maxRetries,
        onProgress: (completed) => progress.update(completed),
      });
      progress.stop();

      // Report
      const report = validateAll(results);
      console.log(chalk.bold('\n📊 Results:'));
      console.log(chalk.green(`  ✅ Passed: ${report.passed}/${report.total}`));
      if (report.failed > 0) {
        console.log(chalk.yellow(`  ⚠️  Failed: ${report.failed}`));
      }

      // Write output
      const outputPath = opts.output || input.replace(/\.srt$/, '.alb.srt');
      const translatedBlocks = results.map(r => r.translated);
      writeSRTFile(translatedBlocks, outputPath, {
        lineEnding: parsed.lineEnding,
      });
      console.log(chalk.bold.green(`\n✓ Written: ${outputPath}\n`));
    } catch (err) {
      console.error(chalk.red(`\nError: ${(err as Error).message}\n`));
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a translated SRT against the original')
  .argument('<original>', 'Original .srt file')
  .argument('<translated>', 'Translated .srt file')
  .action((original: string, translated: string) => {
    const orig = parseSRTFile(original);
    const trans = parseSRTFile(translated);

    console.log(chalk.bold.cyan('\n🔍 Validating translation...\n'));

    const minLen = Math.min(orig.blocks.length, trans.blocks.length);
    let passed = 0;
    let failed = 0;

    for (let i = 0; i < minLen; i++) {
      const issues = validateBlock(orig.blocks[i], trans.blocks[i]);
      if (issues.length === 0) {
        passed++;
      } else {
        failed++;
        for (const issue of issues) {
          console.log(chalk.yellow(`  ⚠ Block ${issue.block}: ${issue.type} (expected: ${issue.expected}, got: ${issue.got})`));
        }
      }
    }

    console.log(chalk.bold(`\n✅ Passed: ${passed} | ⚠️  Failed: ${failed} | Total: ${minLen}\n`));
  });

program
  .command('detect')
  .description('Detect the language of an SRT file')
  .argument('<input>', 'Input .srt file')
  .action((input: string) => {
    const parsed = parseSRTFile(input);
    const detected = detectFromBlocks(parsed.blocks);
    console.log(chalk.bold.cyan(`\n🔍 Language Detection\n`));
    console.log(`  File: ${input}`);
    console.log(`  Blocks: ${parsed.blocks.length}`);
    console.log(`  Language: ${chalk.bold(detected.name)} (${detected.code})\n`);
  });

program.parse();
