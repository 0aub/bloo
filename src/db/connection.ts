import Database from 'better-sqlite3';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dataDir = process.env.BLOO_DATA_DIR || path.join(process.cwd(), 'data');
  mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, 'bloo.db');
  db = new Database(dbPath);

  // Enable WAL mode for concurrent reads
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
