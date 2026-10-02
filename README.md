# Mable Audience Builder

Mable Audience Builder is a small full-stack application for defining behavioral audience rules and previewing which anonymous users match them. It evaluates rules against a deterministic SQLite event store and returns the matching anonymous IDs together with per-condition evidence.

The application is intentionally scoped to audience preview. It does not save audience definitions, manage users, or provide authentication.

## Architecture

```text
React form
  -> frontend/src/api/audienceApi.ts
  -> POST /v1/audiences/preview
  -> Express route and Zod validation
  -> audience evaluator
  -> SQLite events table
  -> JSON response with members and evidence
  -> React results view
```

- **Frontend:** React 18, TypeScript, and Vite. The form uses local React state for the audience name, `datetime-local` value, conditions, request state, and the last submitted request used by Retry.
- **Backend:** Node.js, TypeScript, and Express. The route validates input with Zod, delegates evaluation to `evaluateAudience`, and formats the JSON response.
- **Database:** SQLite through `better-sqlite3`. The application initializes the `events` table and lookup indexes before serving requests.
- **API communication:** `audienceApi.ts` is the frontend HTTP boundary. It sends JSON, maps network failures to a user-facing error, and surfaces structured backend errors.
- **Development proxy:** Vite proxies `/v1` requests from `http://localhost:5173` to `http://localhost:3001`. For another backend location, set `VITE_API_BASE_URL` in a local frontend environment file based on `frontend/.env.example`.

## Audience Rule Evaluation

An audience preview request contains a name, an ISO 8601 `asOf` timestamp, and one or more conditions. Each condition has:

```json
{
  "eventType": "product_view",
  "operator": "at_least",
  "count": 2,
  "withinDays": 7
}
```

Supported event types are `page_view`, `product_view`, `add_to_cart`, `checkout_started`, and `purchase`.

- `at_least` matches when the observed count is greater than or equal to `count`.
- `exactly` matches when the observed count equals `count`.
- `withinDays` defines a window ending at `asOf`. The evaluator calculates the start using UTC millisecond arithmetic.
- Both window boundaries are inclusive: events at `asOf - withinDays` and exactly at `asOf` count.
- Users with no matching events for a condition receive an observed count of zero, which allows rules such as `purchase exactly 0`.
- Multiple conditions use AND semantics; a user must satisfy every condition.
- Matching users are evaluated from the distinct anonymous IDs in the event store and returned in `anonymous_id` order.

The frontend converts its `datetime-local` value with `new Date(value).toISOString()` before sending it to the backend. The backend evaluates the supplied timestamp and does not use its own current clock.

## API

### `GET /health`

Returns:

```json
{ "status": "ok" }
```

### `POST /v1/audiences/preview`

Request body:

```json
{
  "name": "Viewed but not purchased",
  "asOf": "2026-09-29T00:00:00.000Z",
  "conditions": [
    {
      "eventType": "product_view",
      "operator": "at_least",
      "count": 2,
      "withinDays": 7
    },
    {
      "eventType": "purchase",
      "operator": "exactly",
      "count": 0,
      "withinDays": 7
    }
  ]
}
```

Successful response:

```json
{
  "name": "Viewed but not purchased",
  "asOf": "2026-09-29T00:00:00.000Z",
  "total": 3,
  "members": [
    {
      "anonymousId": "anon_01_match",
      "evidence": [
        { "eventType": "product_view", "observedCount": 3 },
        { "eventType": "purchase", "observedCount": 0 }
      ]
    }
  ]
}
```

The actual response may contain additional matching members. The `members` array contains one evidence item per submitted condition.

Validation errors return HTTP `400` with this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

Validation requires a non-empty trimmed name, a valid ISO timestamp, at least one condition, a supported event type and operator, a non-negative integer `count`, and a positive integer `withinDays`. Malformed JSON also returns `VALIDATION_ERROR`. Unexpected backend failures return HTTP `500` with the generic `INTERNAL_ERROR` response; stack traces are not returned.

## Database and Seed Data

The backend uses a local SQLite database at `backend/data/audience.db` by default. `DB_PATH` can override this location. `createDatabase` enables SQLite WAL mode and foreign keys.

Schema initialization creates an `events` table with:

- `id` integer primary key
- `anonymous_id` text
- `event_type` text constrained to the supported event types
- `occurred_at` text containing the event timestamp

Indexes support lookup by anonymous ID, event type, and timestamp, plus timestamp filtering.

The seed script initializes the schema, clears existing events, and inserts 17 deterministic synthetic events. The scenarios include a positive match, no product views, an exact-count boundary, a user with a purchase, events outside the evaluation window, and events exactly on both time-window boundaries.

## Frontend

The audience form supports:

- audience name and `asOf` timestamp input
- condition creation, editing, and removal
- event type selection for each condition
- `at_least` and `exactly` operators
- count and `withinDays` inputs
- a minimum of one condition

Client-side validation prevents requests for an empty name, missing date, empty conditions, negative or non-integer counts, and invalid `withinDays` values. The backend remains authoritative through the Zod schema.

When Preview is submitted, the button is disabled while the request is pending and the previous result is cleared. Results are stored separately from the editable form state. A successful response displays the audience size, matching anonymous IDs, and backend-provided evidence. An empty successful result displays `No users matched this audience.` The last submitted request is retained for Retry without replacing the current editable form.

## Local Setup

Use two terminals because the backend and frontend run as separate processes.

### Backend

```bash
cd backend
npm install
npm run db:seed
npm run dev
```

The backend runs at `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`. Open that URL in a browser. The development proxy forwards `/v1` requests to the backend.

For a non-default backend URL, create a local `frontend/.env` from `frontend/.env.example` and set `VITE_API_BASE_URL`.

## Testing

Automated tests are in `backend/tests/` and run with Vitest. They cover database schema and seed behavior, evaluator rules, time windows, evidence, reproducibility, API validation, malformed input, health checks, and HTTP responses.

Commands:

```bash
cd backend
npm test
npm run build
```

```bash
cd frontend
npm run build
```

Verified results for this submission:

- Backend tests: 34/34 passed.
- Backend TypeScript build: passed.
- Frontend TypeScript/Vite build: passed.
- Database seed: initialized successfully with 17 events.
- Manual integration and UI QA: completed successfully for the scenarios listed below.

## Manual QA Scenarios

The completed manual QA covered:

- happy-path preview for the seeded `Viewed but not purchased` audience
- `at_least`, `exactly`, and exactly-zero behavior
- multiple conditions with AND semantics
- inclusive start and end time-window boundaries
- adding, editing, and removing conditions while retaining at least one condition
- invalid name, date, count, and `withinDays` input handling
- empty audience results
- frontend-to-backend communication through the Vite `/v1` proxy
- rendering backend-provided member evidence
- loading-state and duplicate-submit prevention behavior

The backend test suite provides additional coverage for structured API errors and malformed requests. Retry behavior and network-failure messaging are implemented in the frontend API/form layers; they are not represented by a dedicated automated frontend test.

## Design and Implementation Notes

- The frontend keeps HTTP calls in `frontend/src/api/audienceApi.ts`; components do not call `fetch` directly.
- The backend route performs validation and delegates all audience evaluation to `evaluateAudience`.
- The evaluator uses parameterized SQLite queries and separate count maps for each condition.
- Test databases use SQLite `:memory:` instances so tests do not depend on or modify the local development database.
- The seed operation is deterministic and resets the events table before inserting the known scenarios.
- The API and evaluator accept an explicit `asOf` timestamp so results are reproducible.
- No global state library, UI component library, ORM, or additional service/repository layer is used.

## Final Verification Summary

| Check | Result |
| --- | --- |
| Backend tests | PASS |
| Backend build | PASS |
| Frontend build | PASS |
| Database seed | PASS |
| Manual QA | PASS |
