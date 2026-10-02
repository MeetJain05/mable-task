export const EVENT_TYPES = [
  'page_view',
  'product_view',
  'add_to_cart',
  'checkout_started',
  'purchase',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface EventRecord {
  id?: number;
  anonymous_id: string;
  event_type: EventType;
  occurred_at: string;
}
