"""FastAPI application – Vireon Agent Reactions Layer."""

from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS, ALLOWED_MODELS
from schemas import (
    JobCreated,
    PartialProgress,
    SimulateRequest,
    SimulateResult,
    SimulateStatus,
)
from simulation import create_job, get_job, run_simulation

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Vireon Simulation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Models list (for frontend dropdown) ──────────────────

@app.get("/api/models")
async def list_models():
    return {"models": ALLOWED_MODELS}


# ── POST /api/simulate ───────────────────────────────────

@app.post("/api/simulate", response_model=JobCreated)
async def start_simulation(req: SimulateRequest):
    # Validate model
    if req.model_id not in ALLOWED_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{req.model_id}' is not in the allowlist. "
                   f"Allowed: {ALLOWED_MODELS}",
        )

    # Create job
    job = create_job(
        model_id=req.model_id,
        building=req.building,
        impacts=req.impacts,
    )

    # Fire background task
    asyncio.create_task(run_simulation(job))

    return JobCreated(job_id=job.id)


# ── GET /api/simulate/{job_id}/status ─────────────────────

@app.get("/api/simulate/{job_id}/status", response_model=SimulateStatus)
async def simulation_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return SimulateStatus(
        status=job.status,
        progress=job.progress,
        phase=job.phase,
        message=job.message,
        partial=PartialProgress(
            agents_done=job.agents_done,
            agents_total=job.agents_total,
        ),
    )


# ── GET /api/simulate/{job_id}/result ─────────────────────

@app.get("/api/simulate/{job_id}/result", response_model=SimulateResult)
async def simulation_result(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status == "error":
        raise HTTPException(status_code=500, detail=job.error or "Simulation failed")

    if job.status != "complete" or job.result is None:
        raise HTTPException(status_code=409, detail="Simulation not yet complete")

    return job.result
