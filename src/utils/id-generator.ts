import { randomUUID } from 'node:crypto';

function generateId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export function generateBoardId(): string {
  return generateId('board');
}

export function generateSectionId(): string {
  return generateId('sec');
}

export function generateElementId(): string {
  return generateId('el');
}

export function generateConnectionId(): string {
  return generateId('conn');
}

export function generateCrossRefId(): string {
  return generateId('xref');
}

export function generateBoardLinkId(): string {
  return generateId('blink');
}

export function generateDecisionId(): string {
  return generateId('dec');
}

export function generateChangelogId(): string {
  return generateId('cl');
}
