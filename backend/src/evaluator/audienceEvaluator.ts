import Database from 'better-sqlite3';
import {
  AudienceCondition,
  EvaluateAudienceParams,
  EvaluationResult,
  MatchedMember,
} from '../types/audience';

// Calculate the evaluation window start using UTC millisecond arithmetic
// to ensure evaluation is independent of local server timezone or DST changes.
export function calculateWindowStart(asOf: string, withinDays: number): string {
  const asOfTime = new Date(asOf).getTime();
  const windowStartMs = asOfTime - withinDays * 24 * 60 * 60 * 1000;
  return new Date(windowStartMs).toISOString();
}

function matchesCondition(observedCount: number, condition: AudienceCondition): boolean {
  switch (condition.operator) {
    case 'at_least':
      return observedCount >= condition.count;
    case 'exactly':
      return observedCount === condition.count;
  }
}

export function evaluateAudience(
  db: Database.Database,
  params: EvaluateAudienceParams
): EvaluationResult {
  const { asOf, conditions } = params;

  if (conditions.length === 0) {
    return { total: 0, members: [] };
  }

  // Pre-fetch all known anonymous users as the candidate evaluation pool.
  const candidateRows = db
    .prepare('SELECT DISTINCT anonymous_id FROM events ORDER BY anonymous_id')
    .all() as { anonymous_id: string }[];

  if (candidateRows.length === 0) {
    return { total: 0, members: [] };
  }

  // Keep both window boundaries inclusive so events exactly at windowStart or asOf are counted.
  const countQuery = db.prepare(`
    SELECT anonymous_id, COUNT(*) as count
    FROM events
    WHERE event_type = ?
      AND occurred_at >= ?
      AND occurred_at <= ?
    GROUP BY anonymous_id
  `);

  // Compute observed event counts per condition. Users with no matching events
  // in the window are omitted from the query results and default to an observed count of 0.
  const conditionCountMaps: Map<string, number>[] = conditions.map((condition) => {
    const windowStart = calculateWindowStart(asOf, condition.withinDays);
    const rows = countQuery.all(condition.eventType, windowStart, asOf) as {
      anonymous_id: string;
      count: number;
    }[];

    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.anonymous_id, row.count);
    }
    return map;
  });

  const matchedMembers: MatchedMember[] = [];

  // All conditions are combined with AND semantics: every condition must pass.
  for (const candidate of candidateRows) {
    const userId = candidate.anonymous_id;
    let satisfiesAll = true;

    for (let i = 0; i < conditions.length; i++) {
      const observedCount = conditionCountMaps[i].get(userId) ?? 0;
      if (!matchesCondition(observedCount, conditions[i])) {
        satisfiesAll = false;
        break;
      }
    }

    if (satisfiesAll) {
      matchedMembers.push({
        anonymousId: userId,
        evidence: conditions.map((condition, i) => ({
          eventType: condition.eventType,
          observedCount: conditionCountMaps[i].get(userId) ?? 0,
        })),
      });
    }
  }

  return {
    total: matchedMembers.length,
    members: matchedMembers,
  };
}
