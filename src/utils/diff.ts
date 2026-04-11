import type { Board, Element } from '../models/board.js';
import type { DiffEntry } from '../models/history.js';

export interface SnapshotComparison {
  added: Array<{ type: string; name: string; element_id: string }>;
  removed: Array<{ type: string; name: string; element_id: string }>;
  modified: Array<{
    element_id: string;
    name: string;
    changes: DiffEntry[];
  }>;
  sections_added: string[];
  sections_removed: string[];
}

export function diffElements(before: Element, after: Element): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  if (before.name !== after.name) {
    diffs.push({ field: 'name', old_value: before.name, new_value: after.name });
  }
  if (before.description !== after.description) {
    diffs.push({ field: 'description', old_value: before.description, new_value: after.description });
  }
  if (before.status !== after.status) {
    diffs.push({ field: 'status', old_value: before.status, new_value: after.status });
  }
  if (JSON.stringify(before.tags) !== JSON.stringify(after.tags)) {
    diffs.push({ field: 'tags', old_value: before.tags, new_value: after.tags });
  }
  if (JSON.stringify(before.position) !== JSON.stringify(after.position)) {
    diffs.push({ field: 'position', old_value: before.position, new_value: after.position });
  }
  if (JSON.stringify(before.size) !== JSON.stringify(after.size)) {
    diffs.push({ field: 'size', old_value: before.size, new_value: after.size });
  }

  // Deep diff the data field with summarization
  diffData(before.data, after.data, 'data', diffs);

  return diffs;
}

function diffData(before: unknown, after: unknown, prefix: string, diffs: DiffEntry[]): void {
  if (before === after) return;
  if (typeof before !== typeof after) {
    diffs.push({ field: prefix, old_value: summarize(before), new_value: summarize(after) });
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length || JSON.stringify(before) !== JSON.stringify(after)) {
      diffs.push({
        field: prefix,
        old_value: `${before.length} items`,
        new_value: `${after.length} items`,
      });
    }
    return;
  }

  if (typeof before === 'object' && before !== null && typeof after === 'object' && after !== null) {
    const beforeObj = before as Record<string, unknown>;
    const afterObj = after as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
    for (const key of allKeys) {
      if (!(key in beforeObj)) {
        diffs.push({ field: `${prefix}.${key}`, old_value: undefined, new_value: summarize(afterObj[key]) });
      } else if (!(key in afterObj)) {
        diffs.push({ field: `${prefix}.${key}`, old_value: summarize(beforeObj[key]), new_value: undefined });
      } else if (JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key])) {
        // For nested arrays, summarize rather than recurse deeply
        if (Array.isArray(beforeObj[key]) || Array.isArray(afterObj[key])) {
          diffs.push({
            field: `${prefix}.${key}`,
            old_value: summarize(beforeObj[key]),
            new_value: summarize(afterObj[key]),
          });
        } else {
          diffData(beforeObj[key], afterObj[key], `${prefix}.${key}`, diffs);
        }
      }
    }
    return;
  }

  if (before !== after) {
    diffs.push({ field: prefix, old_value: before, new_value: after });
  }
}

function summarize(value: unknown): unknown {
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === 'object' && value !== null) return `{${Object.keys(value).length} fields}`;
  return value;
}

export function diffBoards(before: Board, after: Board): SnapshotComparison {
  const result: SnapshotComparison = {
    added: [],
    removed: [],
    modified: [],
    sections_added: [],
    sections_removed: [],
  };

  // Collect all elements by ID
  const beforeElements = new Map<string, Element>();
  const afterElements = new Map<string, Element>();
  const beforeSectionIds = new Set<string>();
  const afterSectionIds = new Set<string>();

  for (const section of before.sections) {
    beforeSectionIds.add(section.id);
    for (const element of section.elements) {
      beforeElements.set(element.id, element);
    }
  }

  for (const section of after.sections) {
    afterSectionIds.add(section.id);
    for (const element of section.elements) {
      afterElements.set(element.id, element);
    }
  }

  // Sections diff
  for (const id of afterSectionIds) {
    if (!beforeSectionIds.has(id)) result.sections_added.push(id);
  }
  for (const id of beforeSectionIds) {
    if (!afterSectionIds.has(id)) result.sections_removed.push(id);
  }

  // Elements diff
  for (const [id, element] of afterElements) {
    if (!beforeElements.has(id)) {
      result.added.push({ type: element.type, name: element.name, element_id: id });
    } else {
      const changes = diffElements(beforeElements.get(id)!, element);
      if (changes.length > 0) {
        result.modified.push({ element_id: id, name: element.name, changes });
      }
    }
  }

  for (const [id, element] of beforeElements) {
    if (!afterElements.has(id)) {
      result.removed.push({ type: element.type, name: element.name, element_id: id });
    }
  }

  return result;
}

export function summarizeDiff(changes: DiffEntry[]): string {
  if (changes.length === 0) return 'No changes';
  return changes.map(c => `${c.field}: ${String(c.old_value)} → ${String(c.new_value)}`).join('; ');
}
