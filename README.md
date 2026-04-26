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
|   |   |-- api/             # API routes grouped by feature (auth, tournaments, ai)
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
AI_CHATBOT_OCR_MODEL=qwen3-vl:235b-cloud
AI_CHATBOT_HELP_CHATBOT_TEMPERATURE=0.05
```

Create `frontend/.env` for frontend settings:

```env
VITE_APP_NAME=Tournaments
VITE_API_BASE_URL=http://localhost:8000/api
```

Important: use `frontend/.env.local` (or `frontend/.env`) and restart the frontend dev server after changes.

## Running the Project

### ⭐ Quick Start (Recommended)

Run all microservices from the root directory:

```bash
# Activate virtual environment first
.venv\Scripts\activate

# Start all services
python run.py
```

This starts **three microservices** simultaneously:

1. **Frontend Service** (React + Vite) → http://localhost:5173
2. **Backend Service** (FastAPI) → http://localhost:8000
   - 📚 API Docs: http://localhost:8000/docs
3. **AI Services**:
   - Help Chatbot (Document QA) → http://localhost:8002
     - 📚 Docs: http://localhost:8002/docs
   - OCR Service (Image to Text) → http://localhost:8001
     - 📚 Docs: http://localhost:8001/docs

### Alternative: Start Individual Services

```bash
# Start only frontend
python run.py --service frontend

# Start only backend
python run.py --service backend

# Start only help chatbot
python run.py --service help-chatbot

# Start only OCR service
python run.py --service ocr-service

# List all available services
python run.py --list
```

### Manual Setup (If Needed)

#### Backend Setup and Run

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
python services/ai-chatbot/imgtotext.py
```

Service default URL: `http://localhost:8001`

Key endpoints:

- `GET /health`
- `POST /chat`

## Optional Help Chatbot Service

A document-based Q&A chatbot that answers questions strictly from uploaded documents (PDF, DOCX, TXT).

Run separately if needed:

```bash
python services/ai-helpchat/chatbot.py
```

Service default URL: `http://localhost:8002`

### Setup Steps:

1. **Install dependencies:**
   ```bash
   pip install PyPDF2 python-docx
   ```

2. **Configure Ollama:** Ensure Ollama is running with a model that supports chat (e.g., deepseek-v3.1)

3. **Environment variables:** Set these in your `.env` file:
   ```
   AI_CHATBOT_OLLAMA_BASE_URL=http://localhost:11434
   AI_CHATBOT_OLLAMA_MODEL=deepseek-v3.1:671b-cloud
   AI_CHATBOT_OLLAMA_TIMEOUT_SECONDS=180
   AI_CHATBOT_HELP_CHATBOT_TEMPERATURE=0.05
   VITE_HELP_CHATBOT_BASE_URL=http://localhost:8002
   ```

### Key Features:

- **Backend-Managed Help Document:** The chatbot reads `services/ai-helpchat/Help&Support.pdf`
- **Strict Context:** Answers only from document content (default temperature: 0.05)
- **Smart Matching:** Relevance-based chunk retrieval
- **Floating UI:** Help icon in bottom-right corner with popup chat

### Key Endpoints:

- `GET /health` - Service status and loaded document info
- `POST /ask` - Ask a question about the document

### Frontend Integration:

The help chatbot is integrated into the frontend as a floating help icon. Users can:
1. Click the floating help icon (bottom-right corner)
2. Ask questions about the backend-managed help document
3. Receive accurate answers based strictly on the document

## Notes and Best Practices

- Keep backend and frontend env files explicit (`.env` and `frontend/.env`).
- Avoid committing secrets in `.env`.
- Use lock files and pin backend dependencies in `requirements.txt`.
- For production, tighten CORS and disable debug/reload.
- Add tests for API routes and frontend feature modules before release.

## OCR Troubleshooting

- OCR needs a vision-capable Ollama model.
- `deepseek-v3.1:671b-cloud` is not vision-capable, so it can return unrelated fabricated text for image OCR.
- Set `AI_CHATBOT_OCR_MODEL` to a vision model (example: `qwen3-vl:235b-cloud`) and pull it:
  - `ollama pull qwen3-vl:235b-cloud`
