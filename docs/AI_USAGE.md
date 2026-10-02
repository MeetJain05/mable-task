# AI Usage

AI tools were used as development assistance during the task, mainly to reduce repetitive work and speed up implementation. The final code, testing, and changes were reviewed manually.

## Tools Used

- **Antigravity IDE** — used during development for coding, repository navigation, and AI-assisted implementation.
- **Gemini 3.8 Flash and GPT-5.6 Luna** — used for implementation discussions, scaffolding and boilerplate, repetitive coding and test implementation, debugging, QA planning, and documentation.

## Areas of Use

AI assistance was used for:

- Project scaffolding and boilerplate code
- Repetitive implementation work
- Test case and test implementation
- Understanding and navigating the existing codebase
- Debugging frontend/backend integration issues
- Suggesting manual QA scenarios and edge cases
- Reviewing code changes and git diffs
- Preparing project documentation

Core implementation decisions and final changes were reviewed against the requirements and actual codebase rather than being accepted blindly.

## Example

During manual testing, the frontend request to `/v1/audiences/preview` initially returned a `404`. The issue was traced to the Vite development server not forwarding `/v1` requests to the backend.

The Vite proxy was configured to forward:

`/v1` → `http://localhost:3001`

The application was then tested again and the request worked correctly.

## Verification

The implementation was verified using the project tests, builds, and manual testing:

- Database seeded successfully with 17 events
- Backend tests: 34/34 passed
- Backend build: passed
- Frontend build: passed
- Manual UI/integration testing: passed

AI-generated code and suggestions were reviewed and adjusted where necessary before being included in the final implementation.