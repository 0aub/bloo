import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, rmSync, renameSync } from 'node:fs';
import path from 'node:path';
import type { Board } from '../models/board.js';
import type { ChangelogEntry, Snapshot, Milestone, Decision, TimelineEntry, ChangelogAction, TargetType } from '../models/history.js';
import {
  getChangelogPath, getSnapshotsDir, getSnapshotPath,
  getMilestonesDir, getMilestonePath, getDecisionsDir, getDecisionPath,
} from './paths.js';
import { generateChangelogId, generateDecisionId } from '../utils/id-generator.js';

function now(): string {
  return new Date().toISOString();
}

function readJSON<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath: string, data: unknown): void {
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmpPath, filePath);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

export class HistoryStore {
  // --- Changelog ---

  async appendChangelog(boardId: string, entry: Omit<ChangelogEntry, 'id' | 'timestamp'>): Promise<ChangelogEntry> {
    const fullEntry: ChangelogEntry = {
      id: generateChangelogId(),
      timestamp: now(),
      ...entry,
    };
    const line = JSON.stringify(fullEntry) + '\n';
    appendFileSync(getChangelogPath(boardId), line, 'utf-8');
    return fullEntry;
  }

  async getChangelog(boardId: string, filters: {
    from_date?: string;
    to_date?: string;
    element_id?: string;
    section_id?: string;
    action?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ entries: ChangelogEntry[]; total: number }> {
    const entries = await this.readAllChangelog(boardId);
    let filtered = entries;

    if (filters.from_date) {
      filtered = filtered.filter(e => e.timestamp >= filters.from_date!);
    }
    if (filters.to_date) {
      filtered = filtered.filter(e => e.timestamp <= filters.to_date!);
    }
    if (filters.element_id) {
      filtered = filtered.filter(e => e.target_id === filters.element_id);
    }
    if (filters.section_id) {
      filtered = filtered.filter(e => e.section_id === filters.section_id);
    }
    if (filters.action) {
      filtered = filtered.filter(e => e.action === filters.action);
    }

    const total = filtered.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    filtered = filtered.slice(offset, offset + limit);

    return { entries: filtered, total };
  }

  async getElementHistory(boardId: string, elementId: string): Promise<ChangelogEntry[]> {
    const entries = await this.readAllChangelog(boardId);
    return entries.filter(e => e.target_id === elementId);
  }

  private async readAllChangelog(boardId: string): Promise<ChangelogEntry[]> {
    const filePath = getChangelogPath(boardId);
    if (!existsSync(filePath)) return [];

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => JSON.parse(line) as ChangelogEntry);
  }

  // --- Snapshots ---

  async createSnapshot(boardId: string, board: Board): Promise<number> {
    const version = board.version;
    const snapshot: Snapshot = {
      version,
      timestamp: now(),
      board: { ...board },
    };

    const snapshotPath = getSnapshotPath(boardId, version);
    writeJSON(snapshotPath, snapshot);
    return version;
  }

  async getSnapshot(boardId: string, version: number): Promise<Snapshot> {
    const snapshotPath = getSnapshotPath(boardId, version);
    if (!existsSync(snapshotPath)) {
      throw new Error(`Snapshot not found: v${version} for board ${boardId}`);
    }
    return readJSON<Snapshot>(snapshotPath);
  }

  async getSnapshotByMilestone(boardId: string, milestoneName: string): Promise<Snapshot> {
    const version = await this.getMilestoneVersion(boardId, milestoneName);
    return this.getSnapshot(boardId, version);
  }

  async getLatestVersion(boardId: string): Promise<number> {
    const dir = getSnapshotsDir(boardId);
    if (!existsSync(dir)) return 0;

    const files = readdirSync(dir).filter(f => f.startsWith('v') && f.endsWith('.json'));
    if (files.length === 0) return 0;

    return Math.max(...files.map(f => parseInt(f.replace('v', '').replace('.json', ''), 10)));
  }

  async pruneSnapshots(boardId: string, maxSnapshots: number): Promise<void> {
    const dir = getSnapshotsDir(boardId);
    if (!existsSync(dir)) return;

    const files = readdirSync(dir).filter(f => f.startsWith('v') && f.endsWith('.json'));
    if (files.length <= maxSnapshots) return;

    // Get milestone versions (protected)
    const milestones = await this.getMilestones(boardId);
    const protectedVersions = new Set(milestones.map(m => m.version));

    // Sort by version number
    const versions = files
      .map(f => parseInt(f.replace('v', '').replace('.json', ''), 10))
      .sort((a, b) => a - b);

    // Remove oldest non-protected snapshots
    let toRemove = files.length - maxSnapshots;
    for (const version of versions) {
      if (toRemove <= 0) break;
      if (protectedVersions.has(version)) continue;
      rmSync(getSnapshotPath(boardId, version), { force: true });
      toRemove--;
    }
  }

  // --- Milestones ---

  async createMilestone(boardId: string, name: string, description: string, version: number): Promise<Milestone> {
    const milestone: Milestone = {
      name,
      description,
      version,
      timestamp: now(),
    };

    writeJSON(getMilestonePath(boardId, name), milestone);
    return milestone;
  }

  async getMilestones(boardId: string): Promise<Milestone[]> {
    const dir = getMilestonesDir(boardId);
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir).filter(f => f.endsWith('.json'));
    return files.map(f => readJSON<Milestone>(path.join(dir, f)));
  }

  async getMilestoneVersion(boardId: string, name: string): Promise<number> {
    const milestonePath = getMilestonePath(boardId, name);
    if (!existsSync(milestonePath)) {
      throw new Error(`Milestone not found: ${name}`);
    }
    const milestone = readJSON<Milestone>(milestonePath);
    return milestone.version;
  }

  // --- Decisions ---

  async addDecision(boardId: string, input: {
    title: string;
    context: string;
    decision: string;
    alternatives?: string[];
    consequences?: string;
    related_elements?: string[];
    status?: 'proposed' | 'accepted' | 'superseded' | 'deprecated';
  }): Promise<Decision> {
    const id = generateDecisionId();
    const slug = slugify(input.title);
    const timestamp = now();

    const decision: Decision = {
      id,
      title: input.title,
      context: input.context,
      decision: input.decision,
      alternatives: input.alternatives || [],
      consequences: input.consequences || '',
      status: input.status || 'accepted',
      related_elements: input.related_elements || [],
      created_at: timestamp,
      updated_at: timestamp,
    };

    writeJSON(getDecisionPath(boardId, id, slug), decision);
    return decision;
  }

  async getDecisions(boardId: string, filters?: {
    status?: string;
    elementId?: string;
  }): Promise<Decision[]> {
    const dir = getDecisionsDir(boardId);
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir).filter(f => f.endsWith('.json'));
    let decisions = files.map(f => readJSON<Decision>(path.join(dir, f)));

    if (filters?.status) {
      decisions = decisions.filter(d => d.status === filters.status);
    }
    if (filters?.elementId) {
      decisions = decisions.filter(d => d.related_elements.includes(filters.elementId!));
    }

    return decisions;
  }

  async getDecision(boardId: string, decisionId: string): Promise<Decision> {
    const dir = getDecisionsDir(boardId);
    if (!existsSync(dir)) throw new Error(`Decision not found: ${decisionId}`);

    const files = readdirSync(dir).filter(f => f.startsWith(decisionId) && f.endsWith('.json'));
    if (files.length === 0) throw new Error(`Decision not found: ${decisionId}`);

    return readJSON<Decision>(path.join(dir, files[0]));
  }

  // --- Timeline ---

  async getTimeline(boardId: string, granularity: 'day' | 'week' | 'month' = 'day'): Promise<TimelineEntry[]> {
    const entries = await this.readAllChangelog(boardId);
    const milestones = await this.getMilestones(boardId);
    const decisions = await this.getDecisions(boardId);

    const timelineMap = new Map<string, TimelineEntry>();

    // Add changelog entries grouped by date
    for (const entry of entries) {
      const dateKey = getDateKey(entry.timestamp, granularity);
      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, {
          date: dateKey,
          type: 'change',
          summary: '',
          details_count: 0,
        });
      }
      const te = timelineMap.get(dateKey)!;
      te.details_count++;
    }

    // Summarize change entries
    for (const [key, te] of timelineMap) {
      if (te.type === 'change') {
        const dayEntries = entries.filter(e => getDateKey(e.timestamp, granularity) === key);
        const actions = dayEntries.map(e => `${e.action} ${e.target_name}`);
        te.summary = actions.slice(0, 3).join(', ') + (actions.length > 3 ? `, +${actions.length - 3} more` : '');
      }
    }

    // Add milestones
    for (const ms of milestones) {
      const dateKey = getDateKey(ms.timestamp, granularity);
      timelineMap.set(`${dateKey}_ms_${ms.name}`, {
        date: dateKey,
        type: 'milestone',
        summary: ms.description || ms.name,
        details_count: 0,
        milestone_name: ms.name,
      });
    }

    // Add decisions
    for (const dec of decisions) {
      const dateKey = getDateKey(dec.created_at, granularity);
      timelineMap.set(`${dateKey}_dec_${dec.id}`, {
        date: dateKey,
        type: 'decision',
        summary: dec.title,
        details_count: 0,
        decision_title: dec.title,
      });
    }

    // Sort by date
    return [...timelineMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
}

function getDateKey(timestamp: string, granularity: 'day' | 'week' | 'month'): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (granularity) {
    case 'day':
      return `${year}-${month}-${day}`;
    case 'week': {
      // ISO week: get Monday of the week
      const d = new Date(date);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    case 'month':
      return `${year}-${month}`;
  }
}
