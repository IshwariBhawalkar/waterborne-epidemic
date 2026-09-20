"""
Waterborne Epidemic — FastAPI Backend
Deployed on Render. Handles quiz score submissions and serves
basic statistics for the frontend.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import json, os

app = FastAPI(
    title="Waterborne Epidemic API",
    description="Backend for the Waterborne Epidemic interactive presentation.",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────
# Update the origins list with your actual Cloudflare Pages URL
# after deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:5500",   # Live Server (VS Code)
        "https://*.pages.dev",      # Cloudflare Pages preview
        # Add your production URL here, e.g.:
        # "https://waterborne.pages.dev",
        "*",  # Remove this line in production and add your exact URL above
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory store (no database needed for this scale) ───────
quiz_submissions: list[dict] = []

# ── Models ────────────────────────────────────────────────────

class QuizSubmission(BaseModel):
    score: int
    total: int
    timestamp: Optional[str] = None

class QuizResult(BaseModel):
    received: bool
    score: int
    total: int
    percentage: float
    message: str

# ── Routes ────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "online",
        "project": "Waterborne Epidemic — Interactive Presentation",
        "author": "Ishwari Bhawalkar",
        "endpoints": ["/api/quiz/submit", "/api/stats", "/api/health"],
    }

@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/quiz/submit", response_model=QuizResult)
def submit_quiz(body: QuizSubmission):
    if body.score < 0 or body.total <= 0 or body.score > body.total:
        raise HTTPException(status_code=400, detail="Invalid score values.")

    pct = round((body.score / body.total) * 100, 1)

    if pct == 100:
        message = "Perfect score. Outstanding."
    elif pct >= 80:
        message = "Strong result."
    elif pct >= 60:
        message = "Good effort."
    else:
        message = "Worth another read-through."

    submission = {
        "score":      body.score,
        "total":      body.total,
        "percentage": pct,
        "received_at": datetime.utcnow().isoformat(),
    }
    quiz_submissions.append(submission)

    return QuizResult(
        received=True,
        score=body.score,
        total=body.total,
        percentage=pct,
        message=message,
    )

@app.get("/api/stats")
def get_stats():
    """
    Returns aggregate quiz stats and key global statistics for
    waterborne diseases. Numbers sourced from WHO 2023 estimates.
    """
    total_submissions = len(quiz_submissions)
    avg_score = 0.0
    if total_submissions > 0:
        avg_score = round(
            sum(s["percentage"] for s in quiz_submissions) / total_submissions, 1
        )

    return {
        "quiz": {
            "total_submissions": total_submissions,
            "average_score_percent": avg_score,
        },
        "global_waterborne_facts": {
            "annual_deaths_estimate":     2_000_000,
            "children_under5_daily":      1_400,
            "people_without_clean_water": 785_000_000,
            "people_using_contaminated":  2_000_000_000,
            "source": "WHO Global Burden of Disease, 2023",
        },
        "case_studies": {
            "broad_street_1854": {
                "deaths": 616,
                "days_to_peak": 11,
                "pathogen": "Vibrio cholerae",
                "location": "Soho, London, England",
            },
            "walkerton_2000": {
                "deaths": 7,
                "illnesses": 2300,
                "pathogen": "E. coli O157:H7 and Campylobacter jejuni",
                "location": "Walkerton, Ontario, Canada",
                "days_delay_in_advisory": 4,
            },
        },
    }
