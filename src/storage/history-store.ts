import { getDb } from '../db/connection.js';
import type { Board } from '../models/board.js';
import type {
  ChangelogEntry, Snapshot, Milestone, Decision,
  TimelineEntry, ChangelogAction, TargetType,
} from '../models/history.js';
import { generateChangelogId, generateDecisionId } from '../utils/id-generator.js';

function now(): string {
  return new Date().toISOString();
}

export class HistoryStore {
  // --- Changelog ---

  async appendChangelog(boardId: string, entry: Omit<ChangelogEntry, 'id' | 'timestamp'>): Promise<ChangelogEntry> {
    const db = getDb();
    const fullEntry: ChangelogEntry = {
      id: generateChangelogId(),
      timestamp: now(),
      ...entry,
    };

    db.prepare(`
      INSERT INTO changelog (id, board_id, timestamp, action, target_type, target_id, target_name, element_type, section_id, category, reason, source_context, diff)
      VALUES (@id, @board_id, @timestamp, @action, @target_type, @target_id, @target_name, @element_type, @section_id, @category, @reason, @source_context, @diff)
    `).run({
      id: fullEntry.id,
      board_id: boardId,
      timestamp: fullEntry.timestamp,
      action: fullEntry.action,
      target_type: fullEntry.target_type,
      target_id: fullEntry.target_id,
      target_name: fullEntry.target_name,
      element_type: fullEntry.element_type ?? null,
      section_id: fullEntry.section_id ?? null,
      category: fullEntry.category ?? null,
      reason: fullEntry.reason,
      source_context: fullEntry.source_context ?? null,
      diff: fullEntry.diff ? JSON.stringify(fullEntry.diff) : null,
    });

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
    const db = getDb();

    const conditions: string[] = ['board_id = @board_id'];
    const params: Record<string, unknown> = { board_id: boardId };

    if (filters.from_date) {
      conditions.push('timestamp >= @from_date');
      params.from_date = filters.from_date;
    }
    if (filters.to_date) {
      conditions.push('timestamp <= @to_date');
      params.to_date = filters.to_date;
    }
    if (filters.element_id) {
      conditions.push('target_id = @element_id');
      params.element_id = filters.element_id;
    }
    if (filters.section_id) {
      conditions.push('section_id = @section_id');
      params.section_id = filters.section_id;
    }
    if (filters.action) {
      conditions.push('action = @action');
      params.action = filters.action;
    }

    const where = conditions.join(' AND ');

    const countRow = db.prepare(`SELECT COUNT(*) AS cnt FROM changelog WHERE ${where}`).get(params) as { cnt: number };
    const total = countRow.cnt;

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const rows = db.prepare(
      `SELECT * FROM changelog WHERE ${where} ORDER BY timestamp ASC LIMIT @limit OFFSET @offset`
    ).all({ ...params, limit, offset }) as Record<string, unknown>[];

    const entries = rows.map(rowToChangelogEntry);
    return { entries, total };
  }

  async getElementHistory(boardId: string, elementId: string): Promise<ChangelogEntry[]> {
    const db = getDb();
    const rows = db.prepare(
      `SELECT * FROM changelog WHERE board_id = ? AND target_id = ? ORDER BY timestamp ASC`
    ).all(boardId, elementId) as Record<string, unknown>[];

    return rows.map(rowToChangelogEntry);
  }

  // --- Snapshots ---

  async createSnapshot(boardId: string, board: Board): Promise<number> {
    const db = getDb();
    const version = board.version;
    const timestamp = now();

    db.prepare(`
      INSERT INTO snapshots (board_id, version, timestamp, data)
      VALUES (?, ?, ?, ?)
    `).run(boardId, version, timestamp, JSON.stringify(board));

    return version;
  }

  async getSnapshot(boardId: string, version: number): Promise<Snapshot> {
    const db = getDb();
    const row = db.prepare(
      `SELECT * FROM snapshots WHERE board_id = ? AND version = ?`
    ).get(boardId, version) as Record<string, unknown> | undefined;

    if (!row) {
      throw new Error(`Snapshot not found: v${version} for board ${boardId}`);
    }

    return {
      version: row.version as number,
      timestamp: row.timestamp as string,
      board: JSON.parse(row.data as string) as Board,
    };
  }

  async getSnapshotByMilestone(boardId: string, milestoneName: string): Promise<Snapshot> {
    const version = await this.getMilestoneVersion(boardId, milestoneName);
    return this.getSnapshot(boardId, version);
  }

  async getLatestVersion(boardId: string): Promise<number> {
    const db = getDb();
    const row = db.prepare(
      `SELECT MAX(version) AS max_version FROM snapshots WHERE board_id = ?`
    ).get(boardId) as { max_version: number | null } | undefined;

    return row?.max_version ?? 0;
  }

  async pruneSnapshots(boardId: string, maxSnapshots: number): Promise<void> {
    const db = getDb();

    const countRow = db.prepare(
      `SELECT COUNT(*) AS cnt FROM snapshots WHERE board_id = ?`
    ).get(boardId) as { cnt: number };

    if (countRow.cnt <= maxSnapshots) return;

    // Delete oldest non-milestone snapshots beyond the limit.
    // Protected versions are those referenced by a milestone.
    db.transaction(() => {
      const toDelete = countRow.cnt - maxSnapshots;
      const rows = db.prepare(`
        SELECT s.id FROM snapshots s
        WHERE s.board_id = ?
          AND s.version NOT IN (SELECT m.version FROM milestones m WHERE m.board_id = ?)
        ORDER BY s.version ASC
        LIMIT ?
      `).all(boardId, boardId, toDelete) as { id: number }[];

      if (rows.length === 0) return;

      const ids = rows.map(r => r.id);
      db.prepare(
        `DELETE FROM snapshots WHERE id IN (${ids.map(() => '?').join(',')})`
      ).run(...ids);
    })();
  }

  // --- Milestones ---

  async createMilestone(boardId: string, name: string, description: string, version: number): Promise<Milestone> {
    const db = getDb();
    const timestamp = now();

    db.prepare(`
      INSERT OR REPLACE INTO milestones (name, board_id, description, version, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, boardId, description, version, timestamp);

    return { name, description, version, timestamp };
  }

  async getMilestones(boardId: string): Promise<Milestone[]> {
    const db = getDb();
    const rows = db.prepare(
      `SELECT name, description, version, timestamp FROM milestones WHERE board_id = ? ORDER BY version ASC`
    ).all(boardId) as Milestone[];

    return rows;
  }

  async getMilestoneVersion(boardId: string, name: string): Promise<number> {
    const db = getDb();
    const row = db.prepare(
      `SELECT version FROM milestones WHERE board_id = ? AND name = ?`
    ).get(boardId, name) as { version: number } | undefined;

    if (!row) {
      throw new Error(`Milestone not found: ${name}`);
    }

    return row.version;
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
    const db = getDb();
    const id = generateDecisionId();
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

    db.prepare(`
      INSERT INTO decisions (id, board_id, title, context, decision, alternatives, consequences, status, related_elements, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      decision.id,
      boardId,
      decision.title,
      decision.context,
      decision.decision,
      JSON.stringify(decision.alternatives),
      decision.consequences,
      decision.status,
      JSON.stringify(decision.related_elements),
      decision.created_at,
      decision.updated_at,
    );

    return decision;
  }

  async getDecisions(boardId: string, filters?: {
    status?: string;
    elementId?: string;
  }): Promise<Decision[]> {
    const db = getDb();

    const conditions: string[] = ['board_id = @board_id'];
    const params: Record<string, unknown> = { board_id: boardId };

    if (filters?.status) {
      conditions.push('status = @status');
      params.status = filters.status;
    }

    const where = conditions.join(' AND ');
    let rows = db.prepare(
      `SELECT * FROM decisions WHERE ${where} ORDER BY created_at ASC`
    ).all(params) as Record<string, unknown>[];

    let decisions = rows.map(rowToDecision);

    if (filters?.elementId) {
      decisions = decisions.filter(d => d.related_elements.includes(filters.elementId!));
    }

    return decisions;
  }

  async getDecision(boardId: string, decisionId: string): Promise<Decision> {
    const db = getDb();
    const row = db.prepare(
      `SELECT * FROM decisions WHERE board_id = ? AND id = ?`
    ).get(boardId, decisionId) as Record<string, unknown> | undefined;

    if (!row) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    return rowToDecision(row);
  }

  // --- Timeline ---

  async getTimeline(boardId: string, granularity: 'day' | 'week' | 'month' = 'day'): Promise<TimelineEntry[]> {
    const db = getDb();

    const dateFn = sqliteDateTrunc(granularity);

    // Aggregate changelog entries by date bucket
    const changeRows = db.prepare(`
      SELECT ${dateFn} AS date_key, COUNT(*) AS cnt,
             GROUP_CONCAT(action || ' ' || target_name, '|||') AS actions
      FROM changelog
      WHERE board_id = ?
      GROUP BY date_key
      ORDER BY date_key ASC
    `).all(boardId) as { date_key: string; cnt: number; actions: string }[];

    const milestoneRows = db.prepare(`
      SELECT ${dateFn.replace('timestamp', 'm.timestamp')} AS date_key, name, description
      FROM milestones m
      WHERE m.board_id = ?
      ORDER BY date_key ASC
    `).all(boardId) as { date_key: string; name: string; description: string }[];

    const decisionRows = db.prepare(`
      SELECT ${dateFn.replace('timestamp', 'd.created_at')} AS date_key, title
      FROM decisions d
      WHERE d.board_id = ?
      ORDER BY date_key ASC
    `).all(boardId) as { date_key: string; title: string }[];

    const timelineMap = new Map<string, TimelineEntry>();

    // Add changelog entries grouped by date
    for (const row of changeRows) {
      const actions = row.actions.split('|||');
      const summary = actions.slice(0, 3).join(', ') + (actions.length > 3 ? `, +${actions.length - 3} more` : '');
      timelineMap.set(row.date_key, {
        date: row.date_key,
        type: 'change',
        summary,
        details_count: row.cnt,
      });
    }

    // Add milestones
    for (const row of milestoneRows) {
      timelineMap.set(`${row.date_key}_ms_${row.name}`, {
        date: row.date_key,
        type: 'milestone',
        summary: row.description || row.name,
        details_count: 0,
        milestone_name: row.name,
      });
    }

    // Add decisions
    for (const row of decisionRows) {
      timelineMap.set(`${row.date_key}_dec_${row.title}`, {
        date: row.date_key,
        type: 'decision',
        summary: row.title,
        details_count: 0,
        decision_title: row.title,
      });
    }

    return [...timelineMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
}

// --- Helpers ---

function rowToChangelogEntry(row: Record<string, unknown>): ChangelogEntry {
  return {
    id: row.id as string,
    timestamp: row.timestamp as string,
    action: row.action as ChangelogAction,
    target_type: row.target_type as TargetType,
    target_id: row.target_id as string,
    target_name: (row.target_name as string) || '',
    element_type: (row.element_type as string) || undefined,
    section_id: (row.section_id as string) || null,
    category: (row.category as ChangelogEntry['category']) || null,
    reason: (row.reason as string) || '',
    source_context: (row.source_context as string) || null,
    diff: row.diff ? JSON.parse(row.diff as string) : null,
  };
}

function rowToDecision(row: Record<string, unknown>): Decision {
  return {
    id: row.id as string,
    title: row.title as string,
    context: (row.context as string) || '',
    decision: (row.decision as string) || '',
    alternatives: JSON.parse((row.alternatives as string) || '[]'),
    consequences: (row.consequences as string) || '',
    status: (row.status as Decision['status']) || 'accepted',
    related_elements: JSON.parse((row.related_elements as string) || '[]'),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function sqliteDateTrunc(granularity: 'day' | 'week' | 'month'): string {
  switch (granularity) {
    case 'day':
      return `SUBSTR(timestamp, 1, 10)`;
    case 'week':
      // ISO week: truncate to Monday of the week
      return `DATE(timestamp, 'weekday 0', '-6 days')`;
    case 'month':
      return `SUBSTR(timestamp, 1, 7)`;
  }
}
