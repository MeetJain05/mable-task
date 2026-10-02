import Database from 'better-sqlite3';

export const CREATE_EVENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anonymous_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('page_view', 'product_view', 'add_to_cart', 'checkout_started', 'purchase')),
  occurred_at TEXT NOT NULL
);
`;

// Support condition aggregation by user and time-window filtering
export const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_events_lookup ON events (anonymous_id, event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events (occurred_at);
`;

export function initSchema(db: Database.Database): void {
  db.exec(CREATE_EVENTS_TABLE_SQL);
  db.exec(CREATE_INDEXES_SQL);
}
