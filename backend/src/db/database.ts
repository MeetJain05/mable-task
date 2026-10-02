import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DEFAULT_DB_PATH = path.resolve(__dirname, '../../data/audience.db');

export function createDatabase(dbPath: string = process.env.DB_PATH || DEFAULT_DB_PATH): Database.Database {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);

  // Enable WAL mode for better concurrency and foreign keys for integrity
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}
