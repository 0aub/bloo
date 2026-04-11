import path from 'node:path';
import { readFileSync } from 'node:fs';
import type { BoardConfig } from '../models/board.js';
import { DEFAULT_BOARD_CONFIG } from '../models/board.js';

export function getProjectRoot(): string {
  return process.env.BLOO_PROJECT_ROOT || process.cwd();
}

export function getStorageRoot(): string {
  return process.env.BLOO_STORAGE_ROOT || path.join(getProjectRoot(), '.bloo');
}

export function getBoardDir(boardId: string): string {
  return path.join(getStorageRoot(), boardId);
}

export function getBoardFilePath(boardId: string): string {
  return path.join(getBoardDir(boardId), 'board.json');
}

export function getChangelogPath(boardId: string): string {
  return path.join(getBoardDir(boardId), 'history', 'changelog.jsonl');
}

export function getSnapshotsDir(boardId: string): string {
  return path.join(getBoardDir(boardId), 'history', 'snapshots');
}

export function getSnapshotPath(boardId: string, version: number): string {
  const padded = String(version).padStart(3, '0');
  return path.join(getSnapshotsDir(boardId), `v${padded}.json`);
}

export function getMilestonesDir(boardId: string): string {
  return path.join(getBoardDir(boardId), 'milestones');
}

export function getMilestonePath(boardId: string, name: string): string {
  return path.join(getMilestonesDir(boardId), `${name}.json`);
}

export function getDecisionsDir(boardId: string): string {
  return path.join(getBoardDir(boardId), 'decisions');
}

export function getDecisionPath(boardId: string, id: string, slug: string): string {
  return path.join(getDecisionsDir(boardId), `${id}-${slug}.json`);
}

export function getBoardIndexPath(): string {
  return path.join(getStorageRoot(), 'boards.index.json');
}

export function getExportPath(projectPath: string, exportDir: string, format: string): string {
  return path.join(projectPath, exportDir, `board.${format}`);
}

export interface BlooConfig extends BoardConfig {
  storage_root: string;
}

export function loadConfig(): BlooConfig {
  const projectRoot = getProjectRoot();
  const configPath = path.join(projectRoot, '.bloo.config.json');
  let fileConfig: Partial<BlooConfig> = {};

  try {
    const raw = readFileSync(configPath, 'utf-8');
    fileConfig = JSON.parse(raw);
  } catch {
    // No config file — use defaults
  }

  return {
    storage_root: fileConfig.storage_root || getStorageRoot(),
    auto_snapshot: fileConfig.auto_snapshot ?? DEFAULT_BOARD_CONFIG.auto_snapshot,
    snapshot_on_export: fileConfig.snapshot_on_export ?? DEFAULT_BOARD_CONFIG.snapshot_on_export,
    max_snapshots: fileConfig.max_snapshots ?? DEFAULT_BOARD_CONFIG.max_snapshots,
    default_layout: fileConfig.default_layout ?? DEFAULT_BOARD_CONFIG.default_layout,
    export_path: fileConfig.export_path ?? DEFAULT_BOARD_CONFIG.export_path,
  };
}
