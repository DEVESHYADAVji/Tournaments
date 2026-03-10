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
|   |   |-- api/             # API routes (v1: auth, tournaments, ocr, ai)
|   |   |-- core/            # config, database setup
|   |   |-- models/          # SQLAlchemy ORM models
|   |   `-- main.py          # FastAPI app entry
|-- frontend/
|   |-- src/
|   |   |-- compoments/      # React components (Header, NavBar, etc.)
|   |   |-- features/        # domain logic + API calls (auth, tournaments, ocr)
|   |   |-- pages/           # page components (Home, Profile, Tournaments, etc.)
|   |   |-- routes/          # route definitions
|   |   |-- services/        # shared HTTP client
|   |   |-- config/          # env helpers, profile icons
|   |   |-- main.tsx         # React entry point
|   |   `-- App.tsx          # main app component
|   `-- package.json
|-- services/
|   `-- ai-chatbot/          # standalone FastAPI chatbot service
|-- README.md
`-- requirements.txt
```

## Quick Navigation (Simplified)

When working daily, focus on these folders only:

- `backend/app/api/` for API routes and endpoints
- `backend/app/models/` for database models
- `frontend/src/pages/` for page/screen components
- `frontend/src/features/` for feature-specific API calls and business logic
- `frontend/src/compoments/` for reusable UI components
- `frontend/src/routes/` for route configuration

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
AI_CHATBOT_OLLAMA_BASE_URL=http://localhost:11434
AI_CHATBOT_OLLAMA_MODEL=deepseek-v3.1:671b-cloud
AI_CHATBOT_OCR_MODEL=qwen2.5vl:7b
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

## OCR Troubleshooting

- OCR needs a vision-capable Ollama model.
- `deepseek-v3.1:671b-cloud` is not vision-capable, so it can return unrelated fabricated text for image OCR.
- Set `AI_CHATBOT_OCR_MODEL` to a vision model (example: `qwen2.5vl:7b`) and pull it:
  - `ollama pull qwen2.5vl:7b`
