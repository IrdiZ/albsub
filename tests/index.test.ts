import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

// We'll test the CLI by executing the built binary
const CLI_PATH = join(import.meta.dirname, '..', 'bin', 'albsub.js');

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('--version', () => {
    it('should display version', () => {
      const result = execSync(`node ${CLI_PATH} --version`, { encoding: 'utf-8' });
      expect(result.trim()).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('--help', () => {
    it('should display help', () => {
      const result = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });
      expect(result).toContain('Translate subtitle files');
      expect(result).toContain('translate');
      expect(result).toContain('validate');
      expect(result).toContain('detect');
    });

    it('should display translate command help', () => {
      const result = execSync(`node ${CLI_PATH} translate --help`, { encoding: 'utf-8' });
      expect(result).toContain('Translate an SRT file to Albanian');
      expect(result).toContain('-p, --provider');
      expect(result).toContain('-m, --model');
      expect(result).toContain('-o, --output');
    });

    it('should display validate command help', () => {
      const result = execSync(`node ${CLI_PATH} validate --help`, { encoding: 'utf-8' });
      expect(result).toContain('Validate a translated SRT against the original');
      expect(result).toContain('<original>');
      expect(result).toContain('<translated>');
    });

    it('should display detect command help', () => {
      const result = execSync(`node ${CLI_PATH} detect --help`, { encoding: 'utf-8' });
      expect(result).toContain('Detect the language of an SRT file');
      expect(result).toContain('<input>');
    });
  });

  describe('detect command', () => {
    const testSrtPath = join(import.meta.dirname, 'fixtures', 'sample.eng.srt');

    it('should detect language of SRT file', () => {
      const result = execSync(`node ${CLI_PATH} detect "${testSrtPath}"`, { encoding: 'utf-8' });
      expect(result).toContain('Language Detection');
      expect(result).toContain(testSrtPath);
      expect(result).toContain('Blocks:');
      expect(result).toContain('Language:');
    });

    it('should handle non-existent file', () => {
      expect(() => {
        execSync(`node ${CLI_PATH} detect "non-existent.srt"`, { encoding: 'utf-8', stdio: 'pipe' });
      }).toThrow();
    });
  });

  describe('validate command', () => {
    const originalPath = join(import.meta.dirname, 'fixtures', 'sample.eng.srt');
    const translatedPath = join(import.meta.dirname, 'fixtures', 'sample-eng.alb.srt');

    it('should validate translation', () => {
      const result = execSync(`node ${CLI_PATH} validate "${originalPath}" "${translatedPath}"`, { 
        encoding: 'utf-8' 
      });
      expect(result).toContain('Validating translation');
      expect(result).toMatch(/Passed: \d+/);
      expect(result).toMatch(/Failed: \d+/);
      expect(result).toMatch(/Total: \d+/);
    });

    it('should handle validation errors', () => {
      // Create a mismatched translation for testing
      const testOriginal = join(import.meta.dirname, 'test-original.srt');
      const testTranslated = join(import.meta.dirname, 'test-translated.srt');

      const originalContent = `1
00:00:01,000 --> 00:00:03,000
Hello world!

2
00:00:04,000 --> 00:00:06,000
How are you?
I am fine.
`;

      const translatedContent = `1
00:00:01,000 --> 00:00:03,000
Përshëndetje botë!
Extra line

2
00:00:04,000 --> 00:00:06,000
Si jeni?
`;

      try {
        writeFileSync(testOriginal, originalContent);
        writeFileSync(testTranslated, translatedContent);

        const result = execSync(`node ${CLI_PATH} validate "${testOriginal}" "${testTranslated}"`, { 
          encoding: 'utf-8' 
        });
        
        expect(result).toContain('Validating translation');
        // Should report validation issues
        expect(result).toMatch(/Failed: [1-9]/);
      } finally {
        if (existsSync(testOriginal)) unlinkSync(testOriginal);
        if (existsSync(testTranslated)) unlinkSync(testTranslated);
      }
    });
  });

  describe('error handling', () => {
    it('should display error for unknown command', () => {
      expect(() => {
        execSync(`node ${CLI_PATH} unknown`, { encoding: 'utf-8', stdio: 'pipe' });
      }).toThrow();
    });

    it('should display error for invalid arguments', () => {
      expect(() => {
        execSync(`node ${CLI_PATH} translate`, { encoding: 'utf-8', stdio: 'pipe' });
      }).toThrow(); // Missing required input file argument
    });
  });

  // Note: We can't easily test the translate command end-to-end without API keys
  // and without making actual API calls, but the command structure is tested above
  describe('translate command structure', () => {
    it('should require input file', () => {
      expect(() => {
        execSync(`node ${CLI_PATH} translate`, { encoding: 'utf-8', stdio: 'pipe' });
      }).toThrow();
    });

    it('should handle missing input file', () => {
      expect(() => {
        execSync(`node ${CLI_PATH} translate "non-existent.srt"`, { 
          encoding: 'utf-8', 
          stdio: 'pipe' 
        });
      }).toThrow();
    });
  });
});

// Additional unit tests for CLI modules (if we can import them)
describe('CLI Module Functions', () => {
  // These tests would need to be structured differently if we refactor
  // the CLI to export testable functions instead of just running commands
  
  it('should be structured as an executable script', () => {
    const cliContent = readFileSync(CLI_PATH, 'utf-8');
    expect(cliContent).toContain('#!/usr/bin/env node');
  });

  it('should import required dependencies', () => {
    const indexContent = readFileSync(join(import.meta.dirname, '..', 'src', 'index.ts'), 'utf-8');
    expect(indexContent).toContain("import { Command } from 'commander'");
    expect(indexContent).toContain("import chalk from 'chalk'");
    expect(indexContent).toContain("from './parser.js'");
    expect(indexContent).toContain("from './providers/base.js'");
  });
});