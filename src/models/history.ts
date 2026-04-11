// History, Snapshot, Milestone, Decision interfaces from SCHEMA.md

import type { Board, SectionCategory } from './board.js';

export interface DiffEntry {
  field: string;
  old_value: unknown;
  new_value: unknown;
}

export type ChangelogAction = 'created' | 'updated' | 'removed' | 'moved' | 'connected' | 'disconnected';
export type TargetType = 'board' | 'section' | 'element' | 'connection' | 'cross_reference' | 'decision';

export interface ChangelogEntry {
  id: string;
  timestamp: string;
  action: ChangelogAction;
  target_type: TargetType;
  target_id: string;
  target_name: string;
  element_type?: string;
  section_id: string | null;
  category: SectionCategory | null;
  reason: string;
  source_context: string | null;
  diff: DiffEntry[] | null;
}

export interface Snapshot {
  version: number;
  timestamp: string;
  board: Board;
}

export interface Milestone {
  name: string;
  description: string;
  version: number;
  timestamp: string;
}

export type DecisionStatus = 'proposed' | 'accepted' | 'superseded' | 'deprecated';

export interface Decision {
  id: string;
  title: string;
  context: string;
  decision: string;
  alternatives: string[];
  consequences: string;
  status: DecisionStatus;
  related_elements: string[];
  created_at: string;
  updated_at: string;
}

export interface TimelineEntry {
  date: string;
  type: 'change' | 'milestone' | 'decision';
  summary: string;
  details_count: number;
  milestone_name?: string;
  decision_title?: string;
}
