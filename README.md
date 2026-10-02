# Mable Audience Builder

A full-stack application for defining audience segments against synthetic anonymous event data and previewing audience membership.

## Project Structure

```text
mable-audience-builder/
├── backend/       # Node.js + TypeScript + Express backend
├── frontend/      # React + TypeScript + Vite frontend
├── docs/          # Architecture and design documentation
├── README.md      # Root setup & run instructions
└── .gitignore     # Root git ignore
```

## Prerequisites

- Node.js (v18+ recommended)
- npm (v9+ recommended)

## Quick Start

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend server runs at `http://localhost:3001`.

Available scripts in `backend/`:
- `npm run dev`: Start development server with live reload
- `npm run build`: Compile TypeScript to `dist/`
- `npm test`: Run test suite with Vitest
- `npm run db:seed`: Initialize SQLite schema and seed synthetic events

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs at `http://localhost:5173`.

Available scripts in `frontend/`:
- `npm run dev`: Start Vite development server
- `npm run build`: Build production assets with type checking
