import Database from 'better-sqlite3';
import { createDatabase } from './database';
import { initSchema } from './schema';
import { EventRecord } from '../types/events';

export const SEED_EVENTS: Omit<EventRecord, 'id'>[] = [
  // Positive match
  { anonymous_id: 'anon_01_match', event_type: 'page_view', occurred_at: '2026-09-23T10:00:00.000Z' },
  { anonymous_id: 'anon_01_match', event_type: 'product_view', occurred_at: '2026-09-23T10:05:00.000Z' },
  { anonymous_id: 'anon_01_match', event_type: 'product_view', occurred_at: '2026-09-25T14:30:00.000Z' },
  { anonymous_id: 'anon_01_match', event_type: 'product_view', occurred_at: '2026-09-28T18:00:00.000Z' },
  { anonymous_id: 'anon_01_match', event_type: 'add_to_cart', occurred_at: '2026-09-28T18:05:00.000Z' },

  // No product views
  { anonymous_id: 'anon_02_non_match', event_type: 'page_view', occurred_at: '2026-09-24T09:00:00.000Z' },

  // Exactly two product views (boundary count)
  { anonymous_id: 'anon_03_boundary', event_type: 'product_view', occurred_at: '2026-09-24T11:00:00.000Z' },
  { anonymous_id: 'anon_03_boundary', event_type: 'product_view', occurred_at: '2026-09-27T16:00:00.000Z' },

  // Has a purchase (fails no-purchase condition)
  { anonymous_id: 'anon_04_purchased', event_type: 'product_view', occurred_at: '2026-09-23T12:00:00.000Z' },
  { anonymous_id: 'anon_04_purchased', event_type: 'product_view', occurred_at: '2026-09-25T15:00:00.000Z' },
  { anonymous_id: 'anon_04_purchased', event_type: 'checkout_started', occurred_at: '2026-09-25T15:10:00.000Z' },
  { anonymous_id: 'anon_04_purchased', event_type: 'purchase', occurred_at: '2026-09-25T15:15:00.000Z' },

  // Events outside evaluation window
  { anonymous_id: 'anon_05_outside_window', event_type: 'product_view', occurred_at: '2026-09-15T10:00:00.000Z' },
  { anonymous_id: 'anon_05_outside_window', event_type: 'product_view', occurred_at: '2026-09-26T12:00:00.000Z' },
  { anonymous_id: 'anon_05_outside_window', event_type: 'product_view', occurred_at: '2026-09-30T09:00:00.000Z' },

  // Window boundaries
  { anonymous_id: 'anon_06_window_boundary', event_type: 'product_view', occurred_at: '2026-09-22T00:00:00.000Z' },
  { anonymous_id: 'anon_06_window_boundary', event_type: 'product_view', occurred_at: '2026-09-29T00:00:00.000Z' },
];

export function seedEvents(db: Database.Database): number {
  const insertStmt = db.prepare(`
    INSERT INTO events (anonymous_id, event_type, occurred_at)
    VALUES (?, ?, ?)
  `);

  const runSeed = db.transaction((events: Omit<EventRecord, 'id'>[]) => {
    db.exec('DELETE FROM events;');
    for (const event of events) {
      insertStmt.run(event.anonymous_id, event.event_type, event.occurred_at);
    }
    return events.length;
  });

  return runSeed(SEED_EVENTS);
}

// CLI entrypoint
if (require.main === module) {
  const db = createDatabase();
  initSchema(db);
  const count = seedEvents(db);
  console.log(`Successfully initialized schema and seeded ${count} events.`);
  db.close();
}
