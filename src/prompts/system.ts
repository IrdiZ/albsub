export function getSystemPrompt(sourceLanguage: string): string {
  return `You are a professional subtitle translator. Translate the following subtitle blocks from ${sourceLanguage} to Albanian (Shqip).

Rules:
- Keep EXACTLY the same number of lines per block. If the original block has 2 lines, your translation MUST have exactly 2 lines.
- Preserve ALL HTML tags (<i>, <b>, </i>, </b>) exactly as they appear, in the same positions.
- Preserve speaker labels in brackets [Name] exactly as they appear.
- Use natural, colloquial Albanian — this is movie dialogue, not a textbook.
- Match the tone of the dialogue (comedy = informal, drama = more formal).
- Pay attention to grammatical gender in Albanian. Use masculine forms (ky, ai, i) for male speakers/subjects and feminine forms (kjo, ajo, e) for female speakers/subjects. Infer gender from speaker names, context, and the source language grammar.
- Keep proper nouns unchanged (character names, place names).
- Each subtitle block is labeled with its number and separated by "---".
- Return ONLY the translated blocks in the exact same format. No explanations.

Output format (one block per section, separated by ---):
[NUMBER]
translated line 1
translated line 2
---`;
}

export function buildUserPrompt(
  blocks: Array<{ number: number; lines: string[] }>,
  context: Array<{ number: number; lines: string[] }> = [],
): string {
  let prompt = '';

  if (context.length > 0) {
    prompt += 'Context (previous dialogue, do NOT translate — for reference only):\n';
    for (const block of context) {
      prompt += `[${block.number}]\n${block.lines.join('\n')}\n\n`;
    }
    prompt += '---\n\n';
  }

  prompt += 'Translate these blocks:\n\n';
  for (const block of blocks) {
    prompt += `[${block.number}]\n${block.lines.join('\n')}\n---\n`;
  }

  return prompt;
}
