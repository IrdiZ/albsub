export interface SubtitleBlock {
  number: number;
  timestamp: string;
  lines: string[];
  rawText: string;
}

export interface ParseResult {
  blocks: SubtitleBlock[];
  encoding: string;
  lineEnding: 'LF' | 'CRLF';
}

export interface WriteOptions {
  lineEnding?: 'LF' | 'CRLF';
  bom?: boolean;
}

export interface Chunk {
  blocks: SubtitleBlock[];
  context: SubtitleBlock[];
  index: number;
}

export interface TranslationResult {
  original: SubtitleBlock;
  translated: SubtitleBlock;
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  block: number;
  type: 'line_count_mismatch' | 'empty_translation' | 'missing_tag' | 'missing_label' | 'timestamp_changed';
  expected: string;
  got: string;
}

export interface ValidationReport {
  total: number;
  passed: number;
  failed: number;
  issues: ValidationIssue[];
}

export interface ProviderOptions {
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  baseUrl?: string;
}

export interface AlbsubConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  batchSize: number;
  contextWindow: number;
  workers: number;
  temperature: number;
  maxRetries: number;
  targetLanguage: string;
}
