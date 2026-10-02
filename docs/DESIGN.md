# Design

## 1. Overview

Mable Audience Builder is a small full-stack application for defining behavioral audience rules and previewing matching anonymous users. Rules run against deterministic SQLite event data, and matches include evidence for every condition. Audience definitions are preview-only: they are not persisted. The application has no authentication or user-management system.

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

The frontend uses React 18, TypeScript, and Vite. `AudienceForm` owns local form and request state; `audienceApi.ts` is the HTTP boundary. The backend uses Node.js, TypeScript, and Express. Its route validates requests with Zod and delegates evaluation to `evaluateAudience`. SQLite is accessed through `better-sqlite3`, with an `events` table and lookup indexes.

## 3. Request Flow

The user enters a name, as-of timestamp, and conditions. The frontend validates the form, converts its `datetime-local` value with `new Date(value).toISOString()`, and sends JSON through `audienceApi.ts`. In local development, Vite proxies `/v1` to `http://localhost:3001`. Express validates the request, the evaluator queries SQLite for each condition, and the backend returns members and evidence for the React results view.

## 4. Audience Rule Model

Each condition contains `eventType`, `operator`, `count`, and `withinDays`. Supported event types are `page_view`, `product_view`, `add_to_cart`, `checkout_started`, and `purchase`. Supported operators are:

- `exactly`: `observedCount === count`
- `at_least`: `observedCount >= count`

`count` may be zero. `withinDays` defines a window ending at `asOf`; both start and end boundaries are inclusive. Missing events count as zero, so `purchase exactly 0` is valid. Multiple conditions use AND semantics.

## 5. Time and Reproducibility

The backend evaluates the supplied `asOf` timestamp rather than its current clock. Window starts are calculated with UTC millisecond arithmetic, avoiding local timezone and daylight-saving effects. Explicit timestamps make results reproducible, and the seed data includes events exactly on both evaluation boundaries.

## 6. Database Design

The SQLite `events` table contains `id`, `anonymous_id`, `event_type`, and `occurred_at`. `event_type` has a check constraint for supported event types. Indexes cover anonymous ID, event type, and timestamp lookups. Database creation enables WAL mode and foreign keys.

The deterministic seed contains 17 events across 6 anonymous users. It covers positive matches, no product views, an exact-count boundary, purchase exclusion, outside-window events, and window-boundary events. Seeding clears and repopulates the table inside a transaction.

## 7. API Design

The backend exposes `GET /health` and `POST /v1/audiences/preview`. The preview request contains `name`, an ISO `asOf`, and a non-empty `conditions` array. A successful response contains `name`, `asOf`, `total`, and `members`; each member has an `anonymousId` and evidence with an event type and observed count.

Invalid input and malformed JSON return HTTP 400 with `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`. Unexpected failures return HTTP 500 with a generic `INTERNAL_ERROR` response.

## 8. Frontend Design

The form supports condition creation, editing, and removal while keeping at least one condition. Local validation covers the name, date, condition presence, non-negative integer counts, and positive integer windows. Preview has loading, success, empty, validation, and API-error states. Results remain separate from editable form state, and the last submitted request is retained for Retry. Results display backend-provided evidence.

## 9. Development Proxy

The Vite development server forwards `/v1` from port 5173 to `http://localhost:3001`. `VITE_API_BASE_URL` can be set for another backend location.

## 10. Testing and Verification

Automated verification: backend tests passed 34/34; backend build passed; frontend build passed; and seed initialization inserted 17 events. Manual QA covered the happy path, `exactly`, `at_least`, exactly-zero rules, AND conditions, time-window boundaries, condition add/edit/remove, validation, empty results, Vite proxy integration, evidence rendering, and loading/duplicate-submit behavior. Retry and network-failure behavior is implemented but has no dedicated automated frontend test.

## 11. Decisions, Trade-offs, and Scope

SQLite with `better-sqlite3` keeps local setup lightweight without an external service. Evaluation stays server-side so the frontend does not duplicate audience logic. Explicit `asOf` and deterministic seed data improve reproducibility. Parameterized queries avoid interpolating request values into SQL, and in-memory SQLite databases isolate tests. The trade-off is that the application remains a local preview tool: audience definitions are not persisted, events are synthetic and local, and there is no authentication, user management, or production deployment infrastructure.
