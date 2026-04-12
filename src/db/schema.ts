import type Database from 'better-sqlite3';

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      theme TEXT DEFAULT 'dark',
      tags TEXT DEFAULT '[]',
      version INTEGER DEFAULT 1,
      config TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      parent_section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
      position_x REAL DEFAULT 0,
      position_y REAL DEFAULT 0,
      width REAL DEFAULT 600,
      height REAL DEFAULT 400,
      color TEXT DEFAULT '',
      collapsed INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS elements (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      position_x REAL DEFAULT 0,
      position_y REAL DEFAULT 0,
      width REAL DEFAULT 300,
      height REAL DEFAULT 200,
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'current',
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      from_element_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
      to_element_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
      label TEXT DEFAULT '',
      style TEXT DEFAULT 'solid',
      color TEXT DEFAULT '',
      arrow TEXT DEFAULT 'forward',
      status TEXT DEFAULT 'current',
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cross_references (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      from_element_id TEXT NOT NULL,
      to_element_id TEXT NOT NULL,
      relationship TEXT NOT NULL,
      description TEXT DEFAULT '',
      bidirectional INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS board_links (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      target_board_id TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT DEFAULT '',
      element_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS changelog (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_name TEXT DEFAULT '',
      element_type TEXT,
      section_id TEXT,
      category TEXT,
      reason TEXT DEFAULT '',
      source_context TEXT,
      diff TEXT
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS milestones (
      name TEXT NOT NULL,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      description TEXT DEFAULT '',
      version INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      PRIMARY KEY (board_id, name)
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      context TEXT DEFAULT '',
      decision TEXT DEFAULT '',
      alternatives TEXT DEFAULT '[]',
      consequences TEXT DEFAULT '',
      status TEXT DEFAULT 'accepted',
      related_elements TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS card_layouts (
      board_id TEXT NOT NULL,
      element_id TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      w REAL NOT NULL,
      h REAL NOT NULL,
      PRIMARY KEY (board_id, element_id)
    );

    CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);
    CREATE INDEX IF NOT EXISTS idx_sections_board ON sections(board_id);
    CREATE INDEX IF NOT EXISTS idx_elements_board ON elements(board_id);
    CREATE INDEX IF NOT EXISTS idx_elements_section ON elements(section_id);
    CREATE INDEX IF NOT EXISTS idx_connections_board ON connections(board_id);
    CREATE INDEX IF NOT EXISTS idx_changelog_board ON changelog(board_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_board ON snapshots(board_id);
  `);
}
