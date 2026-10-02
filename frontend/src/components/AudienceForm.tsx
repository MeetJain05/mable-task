import { useState, useCallback } from 'react';
import type { Condition } from '../types/audience';
import type { AudiencePreviewResponse } from '../types/audience';
import { previewAudience, AudienceApiError } from '../api/audienceApi';
import ConditionRow from './ConditionRow';
import ResultsTable from './ResultsTable';

interface RequestState {
  status: 'idle' | 'loading' | 'success' | 'error';
  result: AudiencePreviewResponse | null;
  errorMessage: string | null;
}

function defaultCondition(): Condition {
  return { eventType: 'product_view', operator: 'at_least', count: 1, withinDays: 7 };
}

// Initialize asOf to the current time so the first preview reflects the present moment.
// The operator can change it before submitting.
function initialAsOf(): string {
  const now = new Date();
  // datetime-local expects "YYYY-MM-DDTHH:MM" without seconds or timezone
  return now.toISOString().slice(0, 16);
}

function validateForm(
  name: string,
  asOf: string,
  conditions: Condition[]
): string | null {
  if (!name.trim()) return 'Audience name is required.';
  if (!asOf) return 'As of date is required.';
  if (conditions.length === 0) return 'Add at least one condition.';

  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    if (!Number.isInteger(c.count) || c.count < 0)
      return `Condition ${i + 1}: count must be a non-negative integer.`;
    if (!Number.isInteger(c.withinDays) || c.withinDays < 1)
      return `Condition ${i + 1}: within days must be a positive integer.`;
  }

  return null;
}

export default function AudienceForm() {
  const [name, setName] = useState('');
  const [asOf, setAsOf] = useState(initialAsOf);
  const [conditions, setConditions] = useState<Condition[]>([defaultCondition()]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // The API response is stored separately from form state so previewing
  // an audience never changes the operator's editable conditions.
  const [request, setRequest] = useState<RequestState>({
    status: 'idle',
    result: null,
    errorMessage: null,
  });

  // Tracks the last submitted request so Retry can replay it without form changes.
  const [lastSubmit, setLastSubmit] = useState<{
    name: string;
    asOf: string;
    conditions: Condition[];
  } | null>(null);

  const handleConditionChange = useCallback(
    (index: number, field: keyof Condition, value: string | number) => {
      setConditions((prev) => {
        const next = [...prev];
        const updated = { ...next[index] };
        if (field === 'count' || field === 'withinDays') {
          const parsed = Number(value);
          (updated[field] as number) = Number.isNaN(parsed) ? 0 : parsed;
        } else {
          (updated[field] as string) = value as string;
        }
        next[index] = updated;
        return next;
      });
    },
    []
  );

  const handleAddCondition = useCallback(() => {
    setConditions((prev) => [...prev, defaultCondition()]);
  }, []);

  const handleRemoveCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function submitPreview(
    submittedName: string,
    submittedAsOf: string,
    submittedConditions: Condition[]
  ) {
    setRequest({ status: 'loading', result: null, errorMessage: null });
    setLastSubmit({ name: submittedName, asOf: submittedAsOf, conditions: submittedConditions });

    try {
      // Convert the datetime-local value to a full UTC ISO string for the API.
      const isoAsOf = new Date(submittedAsOf).toISOString();
      const result = await previewAudience({
        name: submittedName.trim(),
        asOf: isoAsOf,
        conditions: submittedConditions,
      });
      setRequest({ status: 'success', result, errorMessage: null });
    } catch (err) {
      const message =
        err instanceof AudienceApiError
          ? err.message
          : 'An unexpected error occurred.';
      setRequest({ status: 'error', result: null, errorMessage: message });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const error = validateForm(name, asOf, conditions);
    if (error) {
      setValidationError(error);
      return;
    }

    void submitPreview(name, asOf, conditions);
  }

  function handleRetry() {
    if (!lastSubmit) return;
    void submitPreview(lastSubmit.name, lastSubmit.asOf, lastSubmit.conditions);
  }

  const isLoading = request.status === 'loading';

  return (
    <div className="page">
      <header className="page-header">
        <h1>Audience Builder</h1>
        <p className="page-subtitle">Create an audience definition and preview its members.</p>
      </header>

      <form className="audience-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="audience-name">Audience name</label>
          <input
            id="audience-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Viewed but not purchased"
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label htmlFor="as-of">As of</label>
          <input
            id="as-of"
            type="datetime-local"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
          />
        </div>

        <fieldset className="conditions-section">
          <legend>Conditions</legend>
          <div className="condition-list">
            {conditions.map((condition, index) => (
              <ConditionRow
                key={index}
                index={index}
                condition={condition}
                canRemove={conditions.length > 1}
                onChange={handleConditionChange}
                onRemove={handleRemoveCondition}
              />
            ))}
          </div>
          <button
            type="button"
            className="btn-add-condition"
            onClick={handleAddCondition}
          >
            + Add condition
          </button>
        </fieldset>

        {validationError && (
          <p className="error-message" role="alert">
            {validationError}
          </p>
        )}

        <button type="submit" className="btn-preview" disabled={isLoading}>
          {isLoading ? 'Previewing…' : 'Preview audience'}
        </button>
      </form>

      {request.status === 'error' && (
        <div className="api-error" role="alert">
          <p className="api-error-heading">Unable to preview audience.</p>
          <p className="api-error-message">{request.errorMessage}</p>
          <button type="button" className="btn-retry" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {request.status === 'success' && request.result && (
        <ResultsTable result={request.result} />
      )}
    </div>
  );
}
