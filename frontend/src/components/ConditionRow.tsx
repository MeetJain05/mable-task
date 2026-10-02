import type { Condition, EventType, Operator } from '../types/audience';

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  page_view: 'Page View',
  product_view: 'Product View',
  add_to_cart: 'Add to Cart',
  checkout_started: 'Checkout Started',
  purchase: 'Purchase',
};

const OPERATOR_LABELS: Record<Operator, string> = {
  at_least: 'At least',
  exactly: 'Exactly',
};

interface ConditionRowProps {
  index: number;
  condition: Condition;
  canRemove: boolean;
  onChange: (index: number, field: keyof Condition, value: string | number) => void;
  onRemove: (index: number) => void;
}

export default function ConditionRow({
  index,
  condition,
  canRemove,
  onChange,
  onRemove,
}: ConditionRowProps) {
  const prefix = `condition-${index}`;

  return (
    <div className="condition-row">
      <div className="condition-field">
        <label htmlFor={`${prefix}-event-type`}>Event type</label>
        <select
          id={`${prefix}-event-type`}
          value={condition.eventType}
          onChange={(e) => onChange(index, 'eventType', e.target.value)}
        >
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="condition-field">
        <label htmlFor={`${prefix}-operator`}>Operator</label>
        <select
          id={`${prefix}-operator`}
          value={condition.operator}
          onChange={(e) => onChange(index, 'operator', e.target.value)}
        >
          {(Object.keys(OPERATOR_LABELS) as Operator[]).map((op) => (
            <option key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </option>
          ))}
        </select>
      </div>

      <div className="condition-field">
        <label htmlFor={`${prefix}-count`}>Count</label>
        <input
          id={`${prefix}-count`}
          type="number"
          min={0}
          step={1}
          value={condition.count}
          onChange={(e) => onChange(index, 'count', e.target.value)}
        />
      </div>

      <div className="condition-field">
        <label htmlFor={`${prefix}-within-days`}>Within days</label>
        <input
          id={`${prefix}-within-days`}
          type="number"
          min={1}
          step={1}
          value={condition.withinDays}
          onChange={(e) => onChange(index, 'withinDays', e.target.value)}
        />
      </div>

      <div className="condition-remove">
        <button
          type="button"
          className="btn-remove"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          aria-label={`Remove condition ${index + 1}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
