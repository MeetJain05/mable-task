import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase } from '../src/db/database';
import { initSchema } from '../src/db/schema';
import { seedEvents, SEED_EVENTS } from '../src/db/seed';

describe('Database & Seed Data', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates events table with correct schema', () => {
    const tableInfo = db.prepare("PRAGMA table_info('events')").all() as { name: string; type: string }[];
    const columnNames = tableInfo.map((c) => c.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('anonymous_id');
    expect(columnNames).toContain('event_type');
    expect(columnNames).toContain('occurred_at');
  });

  it('creates the required indexes', () => {
    const indexes = db.prepare("PRAGMA index_list('events')").all() as { name: string }[];
    const indexNames = indexes.map((i) => i.name);

    expect(indexNames).toContain('idx_events_lookup');
    expect(indexNames).toContain('idx_events_occurred_at');
  });

  it('enforces event_type check constraint', () => {
    const insertStmt = db.prepare(`
      INSERT INTO events (anonymous_id, event_type, occurred_at)
      VALUES (?, ?, ?)
    `);

    expect(() => {
      insertStmt.run('anon_test', 'product_view', '2026-09-25T10:00:00.000Z');
    }).not.toThrow();

    expect(() => {
      insertStmt.run('anon_test', 'invalid_event_type', '2026-09-25T10:00:00.000Z');
    }).toThrow();
  });

  it('seeds data deterministically', () => {
    const inserted1 = seedEvents(db);
    expect(inserted1).toBe(SEED_EVENTS.length);

    const count1 = (db.prepare('SELECT count(*) as count FROM events').get() as { count: number }).count;
    expect(count1).toBe(SEED_EVENTS.length);

    // Re-seeding resets deterministically
    const inserted2 = seedEvents(db);
    expect(inserted2).toBe(SEED_EVENTS.length);

    const count2 = (db.prepare('SELECT count(*) as count FROM events').get() as { count: number }).count;
    expect(count2).toBe(SEED_EVENTS.length);
  });

  it('contains all required seed user scenarios around asOf 2026-09-29T00:00:00.000Z', () => {
    seedEvents(db);

    const users = db.prepare('SELECT DISTINCT anonymous_id FROM events').all() as { anonymous_id: string }[];
    const userIds = users.map((u) => u.anonymous_id);

    expect(userIds).toContain('anon_01_match');
    expect(userIds).toContain('anon_02_non_match');
    expect(userIds).toContain('anon_03_boundary');
    expect(userIds).toContain('anon_04_purchased');
    expect(userIds).toContain('anon_05_outside_window');
  });

  it('queries events within the 7-day window correctly', () => {
    seedEvents(db);

    const windowStart = '2026-09-22T00:00:00.000Z';
    const windowEnd = '2026-09-29T00:00:00.000Z';

    const inWindowEvents = db.prepare(`
      SELECT count(*) as count
      FROM events
      WHERE anonymous_id = 'anon_05_outside_window'
        AND occurred_at >= ?
        AND occurred_at <= ?
    `).get(windowStart, windowEnd) as { count: number };

    expect(inWindowEvents.count).toBe(1);

    const totalEvents = db.prepare(`
      SELECT count(*) as count
      FROM events
      WHERE anonymous_id = 'anon_05_outside_window'
    `).get() as { count: number };

    expect(totalEvents.count).toBe(3);
  });
});
