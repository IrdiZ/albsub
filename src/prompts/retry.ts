import type { ValidationIssue } from '../types.js';

export function getRetryPrompt(issues: ValidationIssue[], originalLines: string[], translatedLines: string[]): string {
  const issueDescriptions = issues.map(issue => {
    switch (issue.type) {
      case 'line_count_mismatch':
        return `Block ${issue.block}: Expected ${issue.expected} lines but got ${issue.got} lines. You MUST keep exactly ${issue.expected} lines.`;
      case 'empty_translation':
        return `Block ${issue.block}: Translation was empty. Provide a proper translation.`;
      case 'missing_tag':
        return `Block ${issue.block}: HTML tags were lost. Original had: ${issue.expected}. Your translation had: ${issue.got}. Preserve all HTML tags exactly.`;
      case 'missing_label':
        return `Block ${issue.block}: Speaker labels were lost. Original had: ${issue.expected}. Your translation had: ${issue.got}. Preserve all [Speaker] labels exactly.`;
      default:
        return `Block ${issue.block}: ${issue.type}`;
    }
  });

  return `Your previous translation had the following issues:

${issueDescriptions.join('\n')}

Original text:
${originalLines.join('\n')}

Your previous translation:
${translatedLines.join('\n')}

Please fix these issues and provide the corrected translation. Remember:
- EXACTLY the same number of lines per block
- Preserve ALL HTML tags
- Preserve ALL speaker labels [Name]
- Return ONLY the corrected translation blocks.`;
}
