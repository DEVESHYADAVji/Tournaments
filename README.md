# Tournaments

Full-stack tournament management project with a FastAPI backend and a React + Vite frontend.

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
|   |   |-- features/
|   |   |-- pages/
|   |   |-- routes/
|   |   |-- services/
|   |   `-- config/
|   `-- package.json
|-- services/
|   |-- ai-chatbot/
|   |-- analytics/
|   `-- matchmaking/
`-- README.md
```

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
VITE_API_BASE_URL=http://localhost:8000
```

Important: frontend defaults to `http://localhost:5000/api` in code if `VITE_API_BASE_URL` is not set, so define this variable to avoid connection issues.

## Backend Setup and Run

From repo root:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy asyncmy pydantic email-validator
python backend/app/main.py
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
