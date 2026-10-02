import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { createDatabase } from '../src/db/database';
import { initSchema } from '../src/db/schema';
import { seedEvents } from '../src/db/seed';

describe('HTTP API Endpoints', () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;
  const asOf = '2026-09-29T00:00:00.000Z';

  beforeEach(() => {
    // Isolated in-memory database prevents tests from altering or depending on local files
    db = createDatabase(':memory:');
    initSchema(db);
    seedEvents(db);
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('GET /health returns 200 and health status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST /v1/audiences/preview returns 200 for valid audience request', async () => {
    const res = await request(app)
      .post('/v1/audiences/preview')
      .send({
        name: 'Recent product viewers',
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

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Recent product viewers');
    expect(res.body.asOf).toBe(asOf);
    expect(typeof res.body.total).toBe('number');
    expect(Array.isArray(res.body.members)).toBe(true);
  });

  it('POST /v1/audiences/preview produces expected audience result from seeded database', async () => {
    const res = await request(app)
      .post('/v1/audiences/preview')
      .send({
        name: 'Viewed but not purchased',
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

    expect(res.status).toBe(200);
    const memberIds = res.body.members.map((m: { anonymousId: string }) => m.anonymousId);

    expect(memberIds).toContain('anon_01_match');
    expect(memberIds).toContain('anon_03_boundary');
    expect(memberIds).not.toContain('anon_04_purchased');
    expect(memberIds).not.toContain('anon_02_non_match');

    const matchedUser = res.body.members.find((m: { anonymousId: string }) => m.anonymousId === 'anon_01_match');
    expect(matchedUser.evidence).toEqual([
      { eventType: 'product_view', observedCount: 3 },
      { eventType: 'purchase', observedCount: 0 },
    ]);
  });

  it('enforces AND semantics across conditions through API', async () => {
    const res = await request(app)
      .post('/v1/audiences/preview')
      .send({
        name: 'Viewed and purchased',
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
            operator: 'at_least',
            count: 1,
            withinDays: 7,
          },
        ],
      });

    expect(res.status).toBe(200);
    const memberIds = res.body.members.map((m: { anonymousId: string }) => m.anonymousId);

    // Only anon_04_purchased has >= 2 product views AND >= 1 purchase
    expect(memberIds).toEqual(['anon_04_purchased']);
  });

  it('returns 400 with VALIDATION_ERROR for invalid event type', async () => {
    const res = await request(app)
      .post('/v1/audiences/preview')
      .send({
        name: 'Invalid event test',
        asOf,
        conditions: [
          {
            eventType: 'invalid_event_type',
            operator: 'at_least',
            count: 1,
            withinDays: 7,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('Invalid event type');
  });

  it('returns 400 with VALIDATION_ERROR for invalid operator', async () => {
    const res = await request(app)
      .post('/v1/audiences/preview')
      .send({
        name: 'Invalid operator test',
        asOf,
        conditions: [
          {
            eventType: 'product_view',
            operator: 'greater_than',
            count: 1,
            withinDays: 7,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('Invalid operator');
  });

  it('returns 400 with VALIDATION_ERROR for negative count', async () => {
    const res = await request(app)
      .post('/v1/audiences/preview')
      .send({
        name: 'Negative count test',
        asOf,
        conditions: [
          {
            eventType: 'product_view',
            operator: 'at_least',
            count: -1,
            withinDays: 7,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('Count must be greater than or equal to 0');
  });

  it('returns 400 with VALIDATION_ERROR for invalid withinDays', async () => {
    const res = await request(app)
      .post('/v1/audiences/preview')
      .send({
        name: 'Non-positive withinDays test',
        asOf,
        conditions: [
          {
            eventType: 'product_view',
            operator: 'at_least',
            count: 1,
            withinDays: 0,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('withinDays must be a positive integer');
  });

  it('returns 400 with VALIDATION_ERROR for missing or empty conditions', async () => {
    const resEmpty = await request(app)
      .post('/v1/audiences/preview')
      .send({
        name: 'Empty conditions',
        asOf,
        conditions: [],
      });

    expect(resEmpty.status).toBe(400);
    expect(resEmpty.body.error.code).toBe('VALIDATION_ERROR');
    expect(resEmpty.body.error.message).toContain('At least one condition is required');

    const resMissing = await request(app)
      .post('/v1/audiences/preview')
      .send({
        name: 'Missing conditions',
        asOf,
      });

    expect(resMissing.status).toBe(400);
    expect(resMissing.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 with VALIDATION_ERROR for invalid asOf timestamp', async () => {
    const res = await request(app)
      .post('/v1/audiences/preview')
      .send({
        name: 'Invalid date test',
        asOf: 'not-an-iso-date',
        conditions: [
          {
            eventType: 'product_view',
            operator: 'at_least',
            count: 1,
            withinDays: 7,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('asOf must be a valid ISO 8601 timestamp');
  });

  it('returns 400 with VALIDATION_ERROR for malformed JSON payload', async () => {
    const res = await request(app)
      .post('/v1/audiences/preview')
      .set('Content-Type', 'application/json')
      .send('{ malformed json');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Malformed JSON payload');
  });

  it('returns 400 with VALIDATION_ERROR when request body is not an object', async () => {
    const res = await request(app)
      .post('/v1/audiences/preview')
      .send('plain text string');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('produces identical responses for repeated identical requests', async () => {
    const payload = {
      name: 'Reproducible preview',
      asOf,
      conditions: [
        {
          eventType: 'product_view',
          operator: 'at_least',
          count: 2,
          withinDays: 7,
        },
      ],
    };

    const res1 = await request(app).post('/v1/audiences/preview').send(payload);
    const res2 = await request(app).post('/v1/audiences/preview').send(payload);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body).toEqual(res2.body);
  });
});
