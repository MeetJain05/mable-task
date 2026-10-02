export type EventType =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'checkout_started'
  | 'purchase';

export type Operator = 'at_least' | 'exactly';

export interface Condition {
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

export interface AudiencePreviewResponse {
  name: string;
  asOf: string;
  total: number;
  members: MatchedMember[];
}

export interface AudiencePreviewRequest {
  name: string;
  asOf: string;
  conditions: Condition[];
}
