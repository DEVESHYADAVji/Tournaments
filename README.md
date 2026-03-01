# Tournaments

Full-stack tournament management project with a FastAPI backend and a React + Vite frontend.

## Feature Pack (Implemented)

- Role-based auth: admin and user login + user registration
- Tournament lifecycle: create, list, details, status, schedule
- Participant flow: user joins tournaments and tracks registrations
- Match operations: admin schedules matches and submits results
- Standings: automatic points table updates from match winners
- Announcements: admin posts updates per tournament
- Admin console UI: tournament creation, match + result management, announcements
- Profile UI: user registration history from DB

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy (async), MySQL (`asyncmy`)
- Frontend: React 19, TypeScript, Vite, Axios, React Router
- Optional service: AI chatbot (FastAPI)

## Prerequisites

- Python 3.11+
- Node.js 20+
- npm 10+
- MySQL 8+ (if using DB-backed flows)

## Project Structure

```text
Tournaments/
|-- backend/
|   |-- app/
|   |   |-- api/
|   |   |-- core/
|   |   |-- models/
|   |   |-- schemas/
|   |   |-- services/
|   |   `-- main.py
|-- frontend/
|   |-- src/
|   |   |-- features/        # domain logic + API calls
|   |   |-- pages/
|   |   |-- routes/
|   |   |-- services/        # shared HTTP client
|   |   `-- config/          # env helpers
|   `-- package.json
|-- services/
|   |-- ai-chatbot/
|   |-- analytics/
|   `-- matchmaking/
`-- README.md
```

## Quick Navigation (Simplified)

When working daily, focus on these folders only:

- `backend/app/` for API and backend logic
- `frontend/src/pages/` for screens
- `frontend/src/features/` for feature-specific API and logic
- `frontend/src/routes/` for route wiring

You can usually ignore generated folders:

- `.venv/`
- `frontend/node_modules/`
- `frontend/dist/`
- `backend/app/__pycache__/`

## Environment Variables

Create `./.env` (root) for backend settings:

```env
ENV=development
PORT=8000
DEBUG=true
SQLALCHEMY_DATABASE_URI=mysql+asyncmy://root:password@127.0.0.1:3306/tournaments
SECRET_KEY=change-this-in-real-environments
```

Create `frontend/.env` for frontend settings:

```env
VITE_APP_NAME=Tournaments
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Important: use `frontend/.env.local` (or `frontend/.env`) and restart the frontend dev server after changes.

## Backend Setup and Run

From repo root:

```bash
python -m venv .venv
.venv\Scripts\activate
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

```

Backend runs on `http://localhost:8000`.

Health check:

- `GET http://localhost:8000/health`

## Frontend Setup and Run

From repo root:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

Build for production:

```bash
cd frontend
npm run build
npm run preview
```

## Optional AI Chatbot Service

Run separately if needed:

```bash
python services/ai-chatbot/app.py
```

Service default URL: `http://localhost:8001`

Key endpoints:

- `GET /health`
- `POST /chat`

## Notes and Best Practices

- Keep backend and frontend env files explicit (`.env` and `frontend/.env`).
- Avoid committing secrets in `.env`.
- Use lock files and pin backend dependencies in `requirements.txt`.
- For production, tighten CORS and disable debug/reload.
- Add tests for API routes and frontend feature modules before release.
