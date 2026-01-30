import { franc } from 'franc-min';

const LANG_MAP: Record<string, string> = {
  ita: 'Italian',
  eng: 'English',
  fra: 'French',
  deu: 'German',
  spa: 'Spanish',
  por: 'Portuguese',
  nld: 'Dutch',
  ron: 'Romanian',
  tur: 'Turkish',
  pol: 'Polish',
  sqi: 'Albanian',
  srp: 'Serbian',
  hrv: 'Croatian',
  bos: 'Bosnian',
  mkd: 'Macedonian',
  bul: 'Bulgarian',
  ell: 'Greek',
  rus: 'Russian',
  und: 'Unknown',
};

export function detectLanguage(text: string): { code: string; name: string } {
  const code = franc(text);
  return {
    code,
    name: LANG_MAP[code] || code,
  };
}

export function detectFromBlocks(blocks: Array<{ lines: string[] }>, sampleSize: number = 10): { code: string; name: string } {
  const sample = blocks.slice(0, sampleSize).map(b => b.lines.join(' ')).join('. ');
  return detectLanguage(sample);
}
