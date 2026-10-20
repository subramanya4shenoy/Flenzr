# Flenzr Backend Service

Modular monolith backend built on FastAPI, SQLAlchemy 2.0 (asyncio + asyncpg), Alembic, Pydantic v2, and Supabase Auth.

## Getting Started

### 1. Prerequisites
- Python 3.11+
- Virtual environment tool (`venv`)
- PostgreSQL instance (or local Supabase CLI)

### 2. Setup Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Run Migrations
```bash
alembic upgrade head
```

### 4. Run Development Server
```bash
./run-dev.sh
```

The backend listens on `http://127.0.0.1:8210`; the frontend origin allowed by CORS is `http://localhost:3210`.

### 5. Run Test Suite
```bash
pytest -v
```

### 6. Export OpenAPI Specification
```bash
python -m app.export_openapi
```
This exports the OpenAPI 3.1.0 JSON contract directly to `contracts/openapi.json`.
