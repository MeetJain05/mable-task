import { EventType } from './events';

export type Operator = 'at_least' | 'exactly';

export interface AudienceCondition {
  eventType: EventType;
  operator: Operator;
  count: number;
  withinDays: number;
}

export interface ConditionEvidence {
  eventType: EventType;
  observedCount: number;
}

export interface MatchedMember {
  anonymousId: string;
  evidence: ConditionEvidence[];
}

export interface EvaluationResult {
  total: number;
  members: MatchedMember[];
}

export interface EvaluateAudienceParams {
  asOf: string;
  conditions: AudienceCondition[];
}
