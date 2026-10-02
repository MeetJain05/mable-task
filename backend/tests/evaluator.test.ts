import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase } from '../src/db/database';
import { initSchema } from '../src/db/schema';
import { seedEvents } from '../src/db/seed';
import { evaluateAudience, calculateWindowStart } from '../src/evaluator/audienceEvaluator';

describe('Audience Evaluator', () => {
  let db: Database.Database;
  const asOf = '2026-09-29T00:00:00.000Z';

  beforeEach(() => {
    db = createDatabase(':memory:');
    initSchema(db);
    seedEvents(db);
  });

  afterEach(() => {
    db.close();
  });

  it('calculates the evaluation window start using UTC millisecond arithmetic', () => {
    const windowStart = calculateWindowStart(asOf, 7);
    expect(windowStart).toBe('2026-09-22T00:00:00.000Z');
  });

  it('matches users exceeding the threshold for at_least', () => {
    const result = evaluateAudience(db, {
      asOf,
      conditions: [
        {
          eventType: 'product_view',
          operator: 'at_least',
          count: 2,
          withinDays: 7,
        },
      ],
    });

    const userIds = result.members.map((m) => m.anonymousId);
    // anon_01_match has 3 views, which exceeds the threshold of 2
    expect(userIds).toContain('anon_01_match');
  });

  it('excludes users below the threshold for at_least', () => {
    const result = evaluateAudience(db, {
      asOf,
      conditions: [
        {
          eventType: 'product_view',
          operator: 'at_least',
          count: 2,
          withinDays: 7,
        },
      ],
    });

    const userIds = result.members.map((m) => m.anonymousId);
    // anon_02_non_match has 0 views; anon_05_outside_window has only 1 in window
    expect(userIds).not.toContain('anon_02_non_match');
    expect(userIds).not.toContain('anon_05_outside_window');
  });

  it('matches users with the requested count for exactly', () => {
    const result = evaluateAudience(db, {
      asOf,
      conditions: [
        {
          eventType: 'product_view',
          operator: 'exactly',
          count: 2,
          withinDays: 7,
        },
      ],
    });

    const userIds = result.members.map((m) => m.anonymousId);
    expect(userIds).toContain('anon_03_boundary');
    // anon_01_match has 3 views, so it must not match an exact count of 2
    expect(userIds).not.toContain('anon_01_match');
  });

  it('excludes users when observed count differs for exactly', () => {
    const result = evaluateAudience(db, {
      asOf,
      conditions: [
        {
          eventType: 'purchase',
          operator: 'exactly',
          count: 0,
          withinDays: 7,
        },
      ],
    });

    const userIds = result.members.map((m) => m.anonymousId);
    // anon_04_purchased made 1 purchase, so it fails an exact 0 condition
    expect(userIds).not.toContain('anon_04_purchased');
  });

  it('correctly qualifies users who have zero occurrences for exactly 0', () => {
    const result = evaluateAudience(db, {
      asOf,
      conditions: [
        {
          eventType: 'purchase',
          operator: 'exactly',
          count: 0,
          withinDays: 7,
        },
      ],
    });

    const userIds = result.members.map((m) => m.anonymousId);
    // Users with no purchase records qualify for exactly 0
    expect(userIds).toContain('anon_01_match');
    expect(userIds).toContain('anon_02_non_match');
    expect(userIds).toContain('anon_03_boundary');

    const matched = result.members.find((m) => m.anonymousId === 'anon_01_match');
    expect(matched?.evidence).toEqual([
      { eventType: 'purchase', observedCount: 0 },
    ]);
  });

  it('enforces AND semantics across multiple conditions', () => {
    const result = evaluateAudience(db, {
      asOf,
      conditions: [
        {
          eventType: 'product_view',
          operator: 'at_least',
          count: 2,
          withinDays: 7,
        },
        {
          eventType: 'purchase',
          operator: 'exactly',
          count: 0,
          withinDays: 7,
        },
      ],
    });

    const userIds = result.members.map((m) => m.anonymousId);

    // Both conditions satisfied
    expect(userIds).toContain('anon_01_match');
    expect(userIds).toContain('anon_03_boundary');

    // anon_04_purchased has >= 2 product views but fails the purchase === 0 condition
    expect(userIds).not.toContain('anon_04_purchased');
    // anon_02_non_match has 0 purchases but fails product_view >= 2
    expect(userIds).not.toContain('anon_02_non_match');
  });

  it('correctly handles exact boundary count matching at_least threshold', () => {
    const result = evaluateAudience(db, {
      asOf,
      conditions: [
        {
          eventType: 'product_view',
          operator: 'at_least',
          count: 2,
          withinDays: 7,
        },
      ],
    });

    const member = result.members.find((m) => m.anonymousId === 'anon_03_boundary');
    expect(member).toBeDefined();
    expect(member?.evidence).toEqual([
      { eventType: 'product_view', observedCount: 2 },
    ]);
  });

  it('excludes events occurred prior to window start', () => {
    // anon_05_outside_window has an event on 2026-09-15 (14 days prior to asOf)
    const result = evaluateAudience(db, {
      asOf,
      conditions: [
        {
          eventType: 'product_view',
          operator: 'at_least',
          count: 2,
          withinDays: 7,
        },
      ],
    });

    const userIds = result.members.map((m) => m.anonymousId);
    expect(userIds).not.toContain('anon_05_outside_window');
  });

  it('excludes events occurred after the asOf timestamp', () => {
    // anon_05_outside_window has an event on 2026-09-30 (1 day after asOf)
    const result = evaluateAudience(db, {
      asOf,
      conditions: [
        {
          eventType: 'product_view',
          operator: 'at_least',
          count: 2,
          withinDays: 7,
        },
      ],
    });

    const member = result.members.find((m) => m.anonymousId === 'anon_05_outside_window');
    expect(member).toBeUndefined();
  });

  it('includes events on exact window boundary timestamps (inclusive boundary convention)', () => {
    // anon_06_window_boundary has events at 2026-09-22T00:00:00.000Z and 2026-09-29T00:00:00.000Z
    const result = evaluateAudience(db, {
      asOf,
      conditions: [
        {
          eventType: 'product_view',
          operator: 'exactly',
          count: 2,
          withinDays: 7,
        },
      ],
    });

    const member = result.members.find((m) => m.anonymousId === 'anon_06_window_boundary');
    expect(member).toBeDefined();
    expect(member?.evidence).toEqual([
      { eventType: 'product_view', observedCount: 2 },
    ]);
  });

  it('produces reproducible results for identical asOf and conditions', () => {
    const query = {
      asOf,
      conditions: [
        {
          eventType: 'product_view' as const,
          operator: 'at_least' as const,
          count: 2,
          withinDays: 7,
        },
        {
          eventType: 'purchase' as const,
          operator: 'exactly' as const,
          count: 0,
          withinDays: 7,
        },
      ],
    };

    const firstRun = evaluateAudience(db, query);
    const secondRun = evaluateAudience(db, query);

    expect(firstRun).toEqual(secondRun);
  });

  it('returns empty result when conditions array is empty', () => {
    const result = evaluateAudience(db, { asOf, conditions: [] });
    expect(result).toEqual({ total: 0, members: [] });
  });

  it('returns empty result when no events exist in database', () => {
    const emptyDb = createDatabase(':memory:');
    initSchema(emptyDb);

    const result = evaluateAudience(emptyDb, {
      asOf,
      conditions: [
        {
          eventType: 'product_view',
          operator: 'at_least',
          count: 1,
          withinDays: 7,
        },
      ],
    });

    expect(result).toEqual({ total: 0, members: [] });
    emptyDb.close();
  });
});
