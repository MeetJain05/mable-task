import type { AudiencePreviewResponse, ConditionEvidence } from '../types/audience';

const EVENT_TYPE_LABELS: Record<string, string> = {
  page_view: 'Page View',
  product_view: 'Product View',
  add_to_cart: 'Add to Cart',
  checkout_started: 'Checkout Started',
  purchase: 'Purchase',
};

interface ResultsTableProps {
  result: AudiencePreviewResponse;
}

export default function ResultsTable({ result }: ResultsTableProps) {
  return (
    <section className="results" aria-label="Audience preview results">
      <h2>Results</h2>

      <p className="results-total">
        <span className="results-total-label">Audience size</span>
        <span className="results-total-value">{result.total}</span>
      </p>

      {result.members.length === 0 ? (
        <p className="results-empty">No users matched this audience.</p>
      ) : (
        <ul className="member-list">
          {result.members.map((member) => (
            <li key={member.anonymousId} className="member-item">
              <div className="member-id">{member.anonymousId}</div>
              <ul className="evidence-list" aria-label={`Evidence for ${member.anonymousId}`}>
                {member.evidence.map((ev: ConditionEvidence) => (
                  <li key={ev.eventType} className="evidence-item">
                    <span className="evidence-event">
                      {EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}
                    </span>
                    <span className="evidence-count">Observed: {ev.observedCount}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
