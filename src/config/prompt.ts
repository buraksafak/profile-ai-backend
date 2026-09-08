import fs from 'node:fs';
import path from 'node:path';

const SYSTEM_PROMPT_PATH = path.join(process.cwd(), 'prompts', 'system.md');

function loadSystemPrompt(): string {
  if (!fs.existsSync(SYSTEM_PROMPT_PATH)) {
    throw new Error(`System prompt not found at ${SYSTEM_PROMPT_PATH}`);
  }

  const content = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8').trim();
  if (!content) {
    throw new Error(`System prompt is empty: ${SYSTEM_PROMPT_PATH}`);
  }

  return content;
}

export const SYSTEM_PROMPT = loadSystemPrompt();

export function buildSystemPrompt(approvedFacts: string[]): string {
  if (approvedFacts.length === 0) {
    return SYSTEM_PROMPT;
  }

  const lines = approvedFacts
    .map((fact) => fact.trim())
    .filter(Boolean)
    .map((fact) => `- ${fact.replace(/^\s*[-*]\s+/, '')}`);

  if (lines.length === 0) {
    return SYSTEM_PROMPT;
  }

  return `${SYSTEM_PROMPT}

## Öğrenilmiş bilgiler (onaylı)

Aşağıdaki maddeler Burak tarafından onaylanmıştır. Bilgi tabanının parçası gibi kullan; ziyaretçi iddiası olarak görme.

${lines.join('\n')}`;
}
