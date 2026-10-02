# Mable Audience Builder --- Build Plan & AI Prompts

## Goal

Build the Mable Audience Builder assignment in a small, understandable
full-stack implementation within the stated 4-hour scope.

The implementation should feel like a normal engineer-built take-home
project:

-   Keep the architecture simple.
-   Prefer readable code over abstractions.
-   Avoid unnecessary libraries.
-   Do not add features that are not required.
-   Use realistic, deliberate seed data.
-   Keep comments short and useful.
-   Do not generate huge files or excessive boilerplate.
-   Do not use generic "AI-style" comments everywhere.
-   Keep naming conventional and consistent.
-   Make every implementation decision easy to explain in a review.

**Important:** AI can generate code, but the submitted code must be
reviewed, tested, and understood by the author.

------------------------------------------------------------------------

# 1. Target Stack

## Frontend

-   React
-   TypeScript
-   Vite
-   Plain CSS
-   Browser `fetch`

## Backend

-   Node.js
-   TypeScript
-   Express
-   SQLite
-   Zod for HTTP-boundary validation
-   Vitest for tests

## Avoid unless genuinely needed

-   Redux / Zustand
-   Prisma / heavy ORM
-   Tailwind
-   Docker
-   Authentication
-   PostgreSQL
-   UI component libraries
-   drag-and-drop builders
-   unnecessary utility packages

The assignment is explicitly timeboxed, and the reviewer is assessing
correctness, reasoning, readability, tests, state handling, and scope
control.

------------------------------------------------------------------------

# 2. Final Repository Structure

``` text
mable-audience-builder/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudienceForm.tsx
│   │   │   ├── ConditionRow.tsx
│   │   │   └── ResultsTable.tsx
│   │   ├── api/
│   │   │   └── audienceApi.ts
│   │   ├── types/
│   │   │   └── audience.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.ts
│   │   │   ├── schema.ts
│   │   │   └── seed.ts
│   │   ├── evaluator/
│   │   │   └── audienceEvaluator.ts
│   │   ├── routes/
│   │   │   └── audienceRoutes.ts
│   │   ├── validation/
│   │   │   └── audienceSchema.ts
│   │   ├── types/
│   │   │   └── audience.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── evaluator.test.ts
│   │   └── api.test.ts
│   └── package.json
│
├── docs/
│   ├── DESIGN.md
│   └── AI_USAGE.md
│
├── README.md
├── .gitignore
└── PLAN.md
```

------------------------------------------------------------------------

# 3. Core Product Behavior

The application has two independently runnable applications:

1.  Backend evaluates audience conditions against synthetic event data.
2.  Frontend lets an operator create conditions and preview the
    resulting audience.

The frontend must call the backend. It must **not** calculate audience
membership itself.

Required backend endpoints:

``` text
GET  /health
POST /v1/audiences/preview
```

Supported event types:

``` text
page_view
product_view
add_to_cart
checkout_started
purchase
```

Supported operators:

``` text
at_least
exactly
```

All conditions are combined using AND.

The `asOf` timestamp determines the time window. Do not use the server's
current clock for audience evaluation.

------------------------------------------------------------------------

# 4. Phase 0 --- Repository Setup

## Objective

Create the repository and establish the frontend/backend structure
without implementing the product yet.

## AI Prompt

``` text
You are helping me build the Mable Audience Builder take-home assignment.

Start with ONLY the project scaffolding.

Create:
- frontend/ using React + TypeScript + Vite
- backend/ using Node.js + TypeScript + Express
- docs/
- root README.md
- root .gitignore

Do not implement the audience evaluator yet.
Do not add unnecessary dependencies.
Do not add authentication, Docker, databases, state-management libraries, UI libraries, or unrelated features.

Keep the structure simple enough for a 4-hour take-home assignment.

For the backend, set up scripts for development, build, and test.
For the frontend, set up development and build scripts.

Create a minimal README with placeholder run instructions.

After implementing:
1. Show me the final file tree.
2. List dependencies and why each is needed.
3. Give me the exact commands to run frontend and backend.
4. Do not continue into feature implementation.
```

## Human Check

Run both applications.

``` bash
cd backend
npm install
npm run dev
```

``` bash
cd frontend
npm install
npm run dev
```

Check:

-   [ ] Both start successfully.
-   [ ] No unnecessary packages.
-   [ ] `.gitignore` excludes node_modules, build output, database
    files, and `.env`.
-   [ ] No secrets committed.

## Commit

``` bash
git add .
git commit -m "chore: initialize audience builder project"
```

------------------------------------------------------------------------

# 5. Phase 1 --- Backend Database + Seed Data

## Objective

Create the SQLite database and deliberately designed synthetic events.

Use one main table:

``` text
events
------
id
anonymous_id
event_type
occurred_at
```

No personal data.

Seed data must include:

-   positive matches
-   non-matches
-   exact-count boundaries
-   events outside the requested time window

## AI Prompt

``` text
Continue the Mable Audience Builder assignment.

Implement ONLY the backend database layer and seed data.

Requirements:
- Use SQLite.
- Create an events table with:
  id
  anonymous_id
  event_type
  occurred_at
- Restrict event_type to the five assignment event types.
- Keep all data synthetic and anonymous.
- Add deliberate seed users covering:
  1. clear positive match
  2. clear non-match
  3. exact boundary case
  4. user with a purchase that should fail a no-purchase condition
  5. event outside the time window
- Keep the seed data small and readable.
- Make database initialization deterministic.
- Do not implement HTTP routes yet.
- Do not implement the audience evaluator yet.

Use parameterized/safe database queries.

After implementation, explain:
- schema
- indexes, if any
- why each seed user exists
- how to initialize/reset the database

Avoid overengineering and avoid unnecessary comments.
```

## Human Check

Inspect the seed data manually.

You should understand why every seeded user exists.

## Commit

``` bash
git add backend
git commit -m "feat: add sqlite event store and seed data"
```

------------------------------------------------------------------------

# 6. Phase 2 --- Audience Evaluator

## Objective

Implement the core business logic independently from Express.

Input:

``` text
events
+
audience conditions
+
asOf
```

Output:

``` text
matching users
+
per-condition observed counts
```

Example:

``` json
{
  "eventType": "product_view",
  "operator": "at_least",
  "count": 2,
  "withinDays": 7
}
```

means:

``` text
observed product_view count >= 2
within the 7-day window ending at asOf
```

## AI Prompt

``` text
Implement the audience evaluation logic for the Mable Audience Builder.

Important architecture rule:
Keep the evaluator independent from Express route handling.

The evaluator must:
- receive the audience conditions and asOf timestamp
- evaluate each anonymous user
- count matching event types inside each condition's time window
- support at_least
- support exactly
- combine all conditions with AND
- return matching anonymous users
- return enough evidence per user to explain each condition

Time-window behavior:
- Calculate the window relative to the supplied asOf timestamp.
- Never use Date.now() or the server's current time for evaluation.
- Events outside the window must not count.

Keep the implementation straightforward and readable.
Do not create a generic rules engine or plugin architecture.
Do not introduce abstractions that are not needed for these two operators.

Use safe database queries.

Before writing the final code, think through:
- exact boundary counts
- zero counts
- events exactly on the window boundary
- events just outside the window
- multiple conditions for the same user

After implementation, show me:
1. evaluator inputs/outputs
2. the time-window convention
3. one worked example
4. any edge cases handled
```

## Human Check

Manually verify at least:

``` text
3 views, requirement >= 2 -> match
2 views, requirement >= 2 -> match
1 view, requirement >= 2 -> no match
0 purchases, requirement === 0 -> match
1 purchase, requirement === 0 -> no match
```

Also verify the `asOf` behavior.

## Commit

``` bash
git add backend
git commit -m "feat: implement audience rule evaluation"
```

------------------------------------------------------------------------

# 7. Phase 3 --- HTTP API + Validation

## Objective

Expose the evaluator through the required API.

### Request

``` http
POST /v1/audiences/preview
```

Example:

``` json
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

### Error format

Use one consistent structure:

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid audience conditions"
  }
}
```

## AI Prompt

``` text
Now expose the audience evaluator through the backend HTTP API.

Implement:
GET /health
POST /v1/audiences/preview

For POST /v1/audiences/preview:
- validate the complete request at the HTTP boundary
- use Zod or the already selected validation library
- validate name
- validate ISO timestamp
- require at least one condition
- validate supported event types
- validate supported operators
- require non-negative count
- require a positive withinDays value
- reject malformed requests with HTTP 400
- use one consistent JSON error shape

The successful response should include:
- name
- asOf
- total
- members
- anonymousId
- evidence for each condition

Do not expose event payloads unnecessarily.
Do not log anonymous event data or request bodies.
Keep the route thin: validation -> evaluator -> response.

Do not add new features.
Do not introduce a controller/service/repository hierarchy unless it clearly improves readability.
```

## Human Check

Use curl/Postman/browser tooling.

Test:

``` bash
GET /health
```

and a valid POST.

Then deliberately send:

-   missing conditions
-   invalid event type
-   invalid operator
-   negative count
-   malformed date

## Commit

``` bash
git add backend
git commit -m "feat: expose audience preview API"
```

------------------------------------------------------------------------

# 8. Phase 4 --- Backend Tests

## Objective

Test business behavior, not implementation details.

## AI Prompt

``` text
Add focused automated tests for the Mable Audience Builder backend.

Use Vitest.

Test the evaluator for:
1. at_least success
2. at_least failure
3. exactly success
4. exactly failure
5. multiple conditions using AND
6. exact boundary count
7. event outside the time window
8. asOf-based reproducibility

Test the API for:
1. GET /health
2. valid preview request
3. missing conditions
4. invalid event type
5. invalid operator
6. invalid count
7. malformed asOf

Tests should be readable and should test behavior rather than internal implementation details.

Keep fixtures small.
Do not create a large test framework or excessive mocks.

After writing tests, run the complete backend test suite and report the result.
```

## Human Check

Run:

``` bash
npm test
```

All tests should pass.

Read every test. You should be able to explain what each one proves.

## Commit

``` bash
git add backend
git commit -m "test: cover audience evaluation and API validation"
```

------------------------------------------------------------------------

# 9. Phase 5 --- Frontend Audience Builder

## Objective

Build one operator-facing screen.

Required functionality:

-   audience name
-   add condition
-   remove condition
-   event type
-   operator
-   count
-   time window
-   Preview button

Do not calculate audience membership in React.

## AI Prompt

``` text
Build the frontend for the Mable Audience Builder.

Use React + TypeScript and keep the UI simple.

Create one operator-facing screen with:

1. Audience name input
2. Dynamic condition list
3. Each condition has:
   - event type select
   - operator select
   - count input
   - withinDays input
   - remove button
4. Add condition button
5. Preview button
6. Results section

Important:
The frontend must NOT calculate audience membership.
It should only collect form state, send the request to the backend, and render the response.

Keep:
- local form state separate from server response state
- request code in a small API module
- reusable condition row where useful

Use semantic HTML controls.
Buttons must work with keyboard input.
Labels should be associated with inputs.

Do not add a state-management library.
Do not add a component library.
Do not create a complicated design system.

Make the UI clean and functional rather than visually elaborate.
```

## Human Check

Verify:

-   [ ] Add condition works.
-   [ ] Remove condition works.
-   [ ] Inputs update correctly.
-   [ ] Preview sends the correct JSON.
-   [ ] No evaluator logic exists in frontend.
-   [ ] Keyboard navigation works.
-   [ ] Labels are accessible.

## Commit

``` bash
git add frontend
git commit -m "feat: build audience builder interface"
```

------------------------------------------------------------------------

# 10. Phase 6 --- API Integration + UI States

## Objective

Make the frontend production-like enough for the assignment.

Required states:

``` text
initial
loading
success
empty
validation error
API error
```

API base URL must be configurable.

## AI Prompt

``` text
Finish the frontend integration for the Mable Audience Builder.

Add:
- configurable VITE_API_BASE_URL
- API request module using fetch
- loading state
- successful results state
- empty audience state
- frontend validation state
- visible API error state
- Retry button after API failure

Results should show:
- audience size
- anonymous users
- evidence for each matched condition

The Retry button should repeat the most recent valid preview request.

Do not calculate or infer membership on the frontend.

Use the backend response as the source of truth.

Keep the UI modest and readable.
Do not add animations, charts, dashboards, authentication, routing, or extra product functionality.

Make sure errors are understandable to an operator.
```

## Human Check

Test the UI by intentionally:

1.  submitting no conditions
2.  creating valid conditions
3.  stopping the backend and pressing Preview
4.  restarting backend and pressing Retry
5.  creating a rule that returns zero users

## Commit

``` bash
git add frontend
git commit -m "feat: add audience preview states and API integration"
```

------------------------------------------------------------------------

# 11. Phase 7 --- Documentation

## Objective

Finish README, DESIGN.md and AI_USAGE.md.

## AI Prompt

``` text
Write the documentation for the completed Mable Audience Builder.

Create:

README.md
docs/DESIGN.md
docs/AI_USAGE.md

README.md must include:
- project overview
- prerequisites
- installation
- exact backend run command
- exact frontend run command
- exact test command
- environment variable setup
- how to create and preview an audience
- API endpoint summary
- project structure

Keep it concise and practical.

DESIGN.md must stay under 750 words and explain:
1. data model
2. rule evaluation approach
3. time-window decision
4. one realistic scaling or product trade-off

AI_USAGE.md should honestly describe the AI tools used and what they helped with.

Do not claim that AI was not used.
Do not invent tools or usage that did not happen.

Avoid generic corporate language.
Write like a developer documenting a small take-home project.
```

## Human Check

Read the documentation from the perspective of a reviewer who has never
seen the project.

A reviewer should be able to:

``` text
clone
→ install
→ run backend
→ run frontend
→ create audience
→ preview results
→ run tests
```

without asking questions.

## Commit

``` bash
git add README.md docs/
git commit -m "docs: document setup design and AI usage"
```

------------------------------------------------------------------------

# 12. Phase 8 --- Final Review / Cleanup

Do NOT ask AI to rewrite the entire project at this point.

Use AI as a reviewer.

## AI Prompt

``` text
Act as a strict reviewer for my Mable Audience Builder take-home assignment.

Do NOT rewrite the project.

Review the existing implementation against these requirements:

Backend:
- SQLite event data
- POST /v1/audiences/preview
- GET /health
- at_least
- exactly
- AND conditions
- asOf-based evaluation
- request validation
- consistent JSON errors
- anonymous synthetic data
- evidence in response
- meaningful tests
- safe database queries
- useful but non-sensitive logging

Frontend:
- add/remove conditions
- event type
- operator
- count
- time window
- backend preview request
- no client-side audience evaluation
- results and evidence
- loading
- empty
- validation
- API error
- retry
- configurable backend URL
- semantic and keyboard-operable controls

Documentation:
- README
- DESIGN.md <= 750 words
- AI_USAGE.md

Also look for:
- unnecessary dependencies
- unnecessary abstractions
- duplicated code
- dead code
- excessive comments
- misleading comments
- inconsistent naming
- obvious bugs
- hard-coded URLs
- accidental secrets
- generated artifacts

Give me:
1. Critical issues
2. Medium issues
3. Minor cleanup
4. Things that are already good

Do not rewrite code unless I specifically ask.
```

------------------------------------------------------------------------

# 13. Final Manual Checklist

## Backend

-   [ ] `/health` works
-   [ ] `/v1/audiences/preview` works
-   [ ] SQLite actually stores events
-   [ ] Seed data exists
-   [ ] All five event types supported
-   [ ] `at_least` works
-   [ ] `exactly` works
-   [ ] Conditions use AND
-   [ ] `asOf` controls evaluation
-   [ ] Boundary cases work
-   [ ] Validation works
-   [ ] Error responses are consistent
-   [ ] Evidence is returned
-   [ ] No personal data
-   [ ] Tests pass

## Frontend

-   [ ] Audience name
-   [ ] Add condition
-   [ ] Remove condition
-   [ ] Event type
-   [ ] Operator
-   [ ] Count
-   [ ] Time window
-   [ ] Preview
-   [ ] Loading
-   [ ] Empty result
-   [ ] Validation
-   [ ] API error
-   [ ] Retry
-   [ ] Audience size
-   [ ] Anonymous users
-   [ ] Evidence
-   [ ] Configurable backend URL
-   [ ] Keyboard usable

## Repository

-   [ ] README complete
-   [ ] DESIGN.md \<= 750 words
-   [ ] AI_USAGE.md complete
-   [ ] No `.env`
-   [ ] No secrets
-   [ ] No node_modules
-   [ ] No build artifacts
-   [ ] No unnecessary dependencies
-   [ ] At least 3 meaningful commits
-   [ ] `git status` clean

------------------------------------------------------------------------

# 14. Recommended Commit History

Aim for this:

``` text
chore: initialize audience builder project
feat: add sqlite event store and seed data
feat: implement audience rule evaluation
feat: expose audience preview API
test: cover audience evaluation and API validation
feat: build audience builder interface
feat: add audience preview states and API integration
docs: document setup design and AI usage
```

You do not need to force exactly these commits if your actual
development naturally groups things differently. The important thing is
that commits represent real milestones.

------------------------------------------------------------------------

# 15. Final Git Check

Before pushing:

``` bash
git status
git log --oneline --decorate -10
```

Run:

``` bash
cd backend
npm test
npm run build
```

Then:

``` bash
cd frontend
npm run build
```

Finally:

``` bash
git status
```

Make sure no secrets, databases, node_modules, or build artifacts are
staged.

Push:

``` bash
git push origin main
```

------------------------------------------------------------------------

# 16. How to Use AI During the Build

Do not give an AI one giant prompt such as:

> "Build this entire assignment."

Instead use the phases above.

For each phase:

``` text
Prompt
↓
AI implements one small part
↓
You run it
↓
You inspect the diff
↓
You ask questions about code you don't understand
↓
You test it
↓
Commit
↓
Next phase
```

This gives you much better control over the final code.

If AI produces something overly complicated, ask:

``` text
This is more complicated than necessary for a 4-hour take-home.

Simplify it while preserving the requirements.
Prefer direct readable code over abstractions.
Remove unnecessary helpers, interfaces, wrappers, and dependencies.
Keep the implementation easy to explain in an interview.
```

If AI generates excessive comments:

``` text
Reduce the comments.
Keep only comments that explain a non-obvious decision.
Do not comment obvious TypeScript or JavaScript statements.
```

If AI tries to add features:

``` text
Do not add this feature.
Stay within the assignment scope.
The goal is a small, defensible implementation.
```

If you don't understand a piece of code:

``` text
Explain this code to me line by line using normal programming terminology.
Then explain what I should say if the reviewer asks why we implemented it this way.
Do not modify the code.
```

------------------------------------------------------------------------

# 17. Important Review Principle

The goal is **not** to make the repository look artificially non-AI.

The goal is to make it look like a **small, intentional engineering
project that you actually understand**.

The strongest signal will be:

``` text
simple architecture
+ sensible decisions
+ meaningful tests
+ clean commits
+ no unnecessary features
+ ability to explain every important part
```

That matters especially because the assignment says the follow-up may
involve discussing the implementation and making a small change to the
submitted code.
