# Vireon

Vireon is a full-stack urban development simulator:
- `frontend/` is a Next.js app for 3D building preview, map placement, deterministic impact scoring, and simulation UI.
- `backend/` is a FastAPI service that runs stakeholder-agent reactions through Backboard and returns aggregate sentiment.

This README intentionally documents only `frontend` and `backend`.

## What It Does

1. Pick a building in the 3D renderer (`/renderer`).
2. Send it to the simulation map (`/sim`) with optional height override.
3. Compute deterministic local impact scores in the frontend (environment, infrastructure, livability, economics, acceptance).
4. Start backend simulation jobs for stakeholder reactions.
5. Aggregate agent sentiment with deterministic acceptance into a final score.

## Tech Stack

- Frontend: Next.js 15, React 19, TypeScript, deck.gl, maplibre-gl, react-three-fiber
- Backend: FastAPI, Pydantic v2, httpx, uvicorn
- External services:
  - Backboard API (agent inference)
  - Sketchfab API (model search/details/download via Next API routes)

## Project Structure

```text
frontend/
  src/app/                 # Pages (/ , /renderer, /sim) + Next API routes
  src/components/          # Map, renderer, UI components
  src/hooks/               # Simulation and app state hooks
  src/lib/                 # Impact engine + API client helpers
  public/data/             # GeoJSON layers + footprint/building data
  scripts/                 # Data refresh scripts

backend/
  main.py                  # FastAPI app + routes
  simulation.py            # Job orchestration + aggregation
  agents.py                # Stakeholder archetypes + prompt builders
  backboard.py             # Backboard API client
  schemas.py               # Request/response models
  config.py                # Env + runtime config
```

## Prerequisites

- Node.js 18+ (20+ recommended)
- npm (or bun/pnpm if you prefer)
- Python 3.9+

## Environment Variables

### Root `.env` (used by backend)

```bash
BACKBOARD_API_KEY=your_backboard_api_key
# Optional (default shown):
# BACKBOARD_BASE_URL=https://app.backboard.io/api
```

### Frontend env (`frontend/.env.local`)

```bash
# Frontend -> backend API base (client-side)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Required for /api/sketchfab/* routes in Next.js
SKETCHFAB_API_KEY=your_sketchfab_api_key
```

## Run Locally

### 1) Start backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend should be available at `http://localhost:8000`.

### 2) Start frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend should be available at `http://localhost:3000`.

## Backend API

- `GET /health` -> service health
- `GET /api/models` -> allowed model list for simulation
- `POST /api/simulate` -> start async simulation job
- `GET /api/simulate/{job_id}/status` -> poll progress
- `GET /api/simulate/{job_id}/result` -> fetch completed result

### Example `POST /api/simulate`

```json
{
  "model_id": "amazon/nova-micro-v1",
  "building": {
    "id": "bldg_midrise_tower",
    "name": "Mid-Rise Tower",
    "type": "mixed_use",
    "description": "Mid-rise mixed-use tower...",
    "height_m": 24,
    "cost_estimate": 14000000
  },
  "impacts": {
    "scores": {
      "environmental_sensitivity": 32,
      "infrastructure_strain": 41,
      "livability_proxy": 27,
      "economic_benefit": 71,
      "deterministic_acceptance": 64
    },
    "drivers": {
      "d_to_park_m": 180,
      "d_to_water_m": 420,
      "overlap_sensitive_m2": 0,
      "d_to_major_road_m": 90,
      "d_to_residential_m": 160,
      "intensity": 82000,
      "center_proximity_score": 1.4
    },
    "flags": {
      "near_sensitive_zone": true,
      "near_residential": false,
      "near_major_road": true
    }
  }
}
```

## Notes

- Backend jobs are stored in memory (`backend/simulation.py`), so restarting the backend clears in-flight/completed jobs.
- CORS is currently configured for `http://localhost:3000` and `http://127.0.0.1:3000` in `backend/config.py`.
- The frontend uses local GeoJSON files in `frontend/public/data/layers/` for deterministic impact computation.

## Useful Frontend Data Scripts

From `frontend/`:

```bash
node scripts/fetch-layers.mjs
node scripts/fetch-footprints.mjs
```

These regenerate local layer/footprint data under `frontend/public/data/`.
