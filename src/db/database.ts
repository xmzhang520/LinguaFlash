import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("lingua.db");

export async function runMigrations() {
  // Create tables
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      ease_factor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      next_review TEXT NOT NULL,
      last_review TEXT,
      source TEXT DEFAULT 'manual',
      tags TEXT DEFAULT '[]',
      deck_id TEXT,
      context TEXT,
      hint TEXT,
      pronunciation TEXT,
      is_suspended INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      quality INTEGER NOT NULL,
      ease_factor_before REAL,
      interval_before INTEGER,
      reviewed_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (card_id) REFERENCES cards(id)
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      cards_reviewed INTEGER DEFAULT 0,
      cards_correct INTEGER DEFAULT 0,
      duration_seconds INTEGER,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);

  // Safe migrations for existing databases
  try {
    db.execSync(`ALTER TABLE cards ADD COLUMN pronunciation TEXT;`);
  } catch {
    // Column already exists — safe to ignore
  }

  try {
    db.execSync(`ALTER TABLE cards ADD COLUMN hint TEXT;`);
  } catch {
    // Column already exists — safe to ignore
  }

  try {
    db.execSync(`ALTER TABLE cards ADD COLUMN context TEXT;`);
  } catch {
    // Column already exists — safe to ignore
  }

  try {
    db.execSync(`ALTER TABLE cards ADD COLUMN pronunciation TEXT`);
  } catch (_) {}
  try {
    db.execSync(`ALTER TABLE cards ADD COLUMN hint TEXT`);
  } catch (_) {}
  try {
    db.execSync(`ALTER TABLE cards ADD COLUMN context TEXT`);
  } catch (_) {}
  // ← ADD THESE TWO:
  try {
    db.execSync(
      `ALTER TABLE cards ADD COLUMN cardState TEXT NOT NULL DEFAULT 'review'`,
    );
  } catch (_) {}
  try {
    db.execSync(
      `ALTER TABLE cards ADD COLUMN learningStep INTEGER NOT NULL DEFAULT 0`,
    );
  } catch (_) {}
}
