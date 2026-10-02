# Design

## 1. Overview

Mable Audience Builder is a small full-stack application for defining behavioral audience rules and previewing matching anonymous users. Audience preview is the main scope: rules are evaluated against deterministic SQLite event data, and matching users are returned with evidence for each condition. Audience definitions are not persisted. The application does not include authentication or user management.

## 2. Architecture

```text
Browser
  ↓
React AudienceForm
  ↓
audienceApi.ts
  ↓
POST /v1/audiences/preview
  ↓
Express + Zod validation
  ↓
evaluateAudience
  ↓
SQLite events
  ↓
matching anonymous IDs + evidence
  ↓
React results view
```

The frontend uses React 18, TypeScript, and Vite. `AudienceForm` owns local form and request state, while `audienceApi.ts` is the HTTP boundary. The backend uses Node.js, TypeScript, and Express. Its route validates requests with Zod and delegates rule evaluation to `evaluateAudience`. SQLite is accessed with `better-sqlite3`; the database contains an `events` table and indexes for event lookup and timestamp filtering.

## 3. Request Flow

1. The user enters an audience name, as-of timestamp, and conditions.
2. The frontend validates the editable form.
3. The `datetime-local` value is converted with `new Date(value).toISOString()`.
4. `audienceApi.ts` sends the preview request.
5. During local development, Vite proxies `/v1` to `http://localhost:3001`.
6. Express receives and validates the JSON request with Zod.
7. `evaluateAudience` queries SQLite for each condition.
8. All conditions are combined with AND semantics.
9. The backend returns matching members and per-condition evidence.
10. The frontend renders the audience size and matching users.

## 4. Audience Rule Model

Each condition contains `eventType`, `operator`, `count`, and `withinDays`. Supported event types are `page_view`, `product_view`, `add_to_cart`, `checkout_started`, and `purchase`. Supported operators are:

- `exactly`: `observedCount === count`
- `at_least`: `observedCount >= count`

`count` may be zero. `withinDays` defines a window ending at `asOf`; both the start and end boundaries are inclusive. Users with no matching events receive an observed count of zero, so `purchase exactly 0` is supported. Multiple conditions use AND semantics.

## 5. Time and Reproducibility

The backend evaluates the `asOf` timestamp supplied by the request instead of using the server clock. The evaluator calculates window starts with UTC millisecond arithmetic, which avoids local timezone and daylight-saving effects. Explicit timestamps make results reproducible, and the seed data includes events exactly on the evaluation boundaries for verification.

## 6. Database Design

The SQLite `events` table contains `id`, `anonymous_id`, `event_type`, and `occurred_at`. `event_type` has a check constraint for the supported event types. Indexes cover anonymous ID, event type, and timestamp-related lookups. Database creation enables WAL mode and foreign keys.

The deterministic seed contains 17 events across 6 anonymous users. It covers a positive match, no product views, an exact-count boundary, purchase exclusion, events outside the window, and events on the window boundaries. Seeding clears and repopulates the table inside a transaction.

## 7. API Design

The backend exposes `GET /health` and `POST /v1/audiences/preview`. The preview request contains `name`, an ISO `asOf`, and a non-empty `conditions` array. A successful response contains `name`, `asOf`, `total`, and `members`; each member has an `anonymousId` and evidence containing an event type and observed count.

Invalid input and malformed JSON return HTTP 400 with `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`. Unexpected failures return HTTP 500 with a generic `INTERNAL_ERROR` response.

## 8. Frontend Design

The form supports condition creation, editing, and removal while keeping at least one condition. Local validation covers required name and date values, condition presence, non-negative integer counts, and positive integer windows. Preview has explicit loading, success, empty, validation, and API-error states. Results are stored separately from editable form state, and the last submitted request is retained for Retry without replacing current edits. Results display backend-provided evidence.

## 9. Development Proxy

The Vite development server forwards `/v1` requests to `http://localhost:3001` so the frontend at port 5173 can call the local backend. `VITE_API_BASE_URL` can be set for another backend location.

## 10. Testing and Verification

### Automated

- Backend tests: 34/34 passed.
- Backend build: passed.
- Frontend build: passed.
- Seed initialization: 17 events.

### Manual

Manual QA covered the happy path, `exactly`, `at_least`, exactly-zero rules, AND conditions, time-window boundaries, condition add/edit/remove, validation, empty results, Vite proxy integration, member evidence, and loading/duplicate-submit behavior. Retry and network-failure behavior is implemented but is not represented by a dedicated automated frontend test.

## 11. Design Decisions and Trade-offs

SQLite with `better-sqlite3` keeps the local event store lightweight and requires no external service. Evaluation remains server-side so the frontend does not duplicate audience logic. An explicit `asOf` and deterministic seed make results reproducible. Parameterized SQLite queries avoid interpolating request values into SQL. The frontend API boundary keeps HTTP concerns separate from UI components. Tests use in-memory SQLite databases for isolation.

## 12. Scope and Limitations

Audience definitions are preview-only and are not persisted. Event data is synthetic and stored in local SQLite. There is no authentication, user management, or production deployment infrastructure. The Vite proxy is intended for local development; deployments using another backend location must provide `VITE_API_BASE_URL` or equivalent routing.
