from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import logging

from database import (
    init_db,
    authenticate_user,
    get_candidates,
    get_candidate_by_id,
    get_candidate_by_telegram_id,
    get_candidate_by_phone,
    save_candidate,
    update_candidate_status,
    delete_candidate
)
from telegram_service import (
    send_approval_message,
    send_rejection_message,
    reset_driver_bot_state
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="Yo'lovchi Backend API", version="1.0.0")

# Enable CORS for all local frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("Database initialized successfully.")

# Pydantic schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class CandidateCreate(BaseModel):
    telegram_id: int
    name: str
    surname: str
    phone: str
    pending_message_id: Optional[int] = None

class CandidateResponse(BaseModel):
    id: int
    telegram_id: int
    name: str
    surname: str
    phone: str
    status: str
    pending_message_id: Optional[int] = None
    created_at: str
    updated_at: str

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "yolovchi-backend"}

@app.post("/api/auth/login")
def login(payload: LoginRequest):
    """Authenticate admin/superuser against PostgreSQL database."""
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Noto'g'ri login yoki parol"
        )
    return {
        "success": True,
        "user": user,
        "token": f"session_token_{user['username']}_{user['id']}"
    }

@app.get("/api/candidates")
def list_candidates(status: Optional[str] = None):
    """Fetch all candidates, optionally filtered by status ('pending', 'approved', 'rejected')."""
    candidates = get_candidates(status=status)
    return candidates

@app.get("/api/candidates/{telegram_id}")
def get_candidate(telegram_id: int):
    """Fetch candidate by telegram ID."""
    candidate = get_candidate_by_telegram_id(telegram_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return candidate

@app.post("/api/candidates", status_code=status.HTTP_201_CREATED)
def register_candidate(payload: CandidateCreate):
    """Create or update a candidate application from the Telegram Bot."""
    candidate = save_candidate(
        telegram_id=payload.telegram_id,
        name=payload.name,
        surname=payload.surname,
        phone=payload.phone,
        pending_message_id=payload.pending_message_id
    )
    logger.info(f"Candidate registered: {candidate['name']} {candidate['surname']} ({candidate['phone']})")
    return candidate

@app.post("/api/candidates/{candidate_id}/approve")
async def approve_candidate(candidate_id: int):
    """Admin approves candidate: updates DB and sends Telegram notification with Mini App button."""
    candidate = get_candidate_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    
    updated = update_candidate_status(candidate_id, "approved")
    
    # Notify driver via Telegram bot
    notified = await send_approval_message(
        telegram_id=candidate["telegram_id"],
        name=candidate["name"],
        surname=candidate["surname"],
        phone=candidate["phone"],
        pending_message_id=candidate.get("pending_message_id")
    )
    
    logger.info(f"Candidate {candidate_id} approved. Telegram notification sent: {notified}")
    return {
        "success": True,
        "candidate": updated,
        "telegram_notified": notified
    }

@app.post("/api/candidates/{candidate_id}/reject")
async def reject_candidate(candidate_id: int):
    """Admin rejects candidate: updates DB and sends rejection notice."""
    candidate = get_candidate_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    
    updated = update_candidate_status(candidate_id, "rejected")
    
    # Send rejection message via Telegram bot
    notified = await send_rejection_message(
        telegram_id=candidate["telegram_id"],
        pending_message_id=candidate.get("pending_message_id")
    )
    
    logger.info(f"Candidate {candidate_id} rejected. Telegram notification sent: {notified}")
    return {
        "success": True,
        "candidate": updated,
        "telegram_notified": notified
    }

@app.get("/api/drivers")
def list_approved_drivers():
    """List all approved drivers."""
    return get_candidates(status="approved")

@app.delete("/api/drivers/{driver_id}")
async def remove_driver(driver_id: int):
    """Delete driver from system, reset their Telegram bot state, and kick out from Mini App."""
    candidate = get_candidate_by_id(driver_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")
    
    # 1. Reset driver bot state in Telegram (removes menu button, clears recent messages)
    telegram_id = candidate.get("telegram_id")
    pending_msg_id = candidate.get("pending_message_id")
    if telegram_id:
        await reset_driver_bot_state(telegram_id, pending_msg_id)
        
    # 2. Delete driver from database
    success = delete_candidate(driver_id)
    logger.info(f"Driver {driver_id} ({candidate['name']} {candidate['surname']}) deleted from database.")
    return {"success": success, "deleted_id": driver_id}

@app.get("/api/drivers/check")
def check_driver_status(phone: Optional[str] = None, telegram_id: Optional[int] = None):
    """Check if driver is currently approved in the system (used by Mini App)."""
    candidate = None
    if telegram_id:
        candidate = get_candidate_by_telegram_id(telegram_id)
    elif phone:
        candidate = get_candidate_by_phone(phone)
    
    if not candidate or candidate.get("status") != "approved":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver is not approved or not found")
    return {"status": "approved", "driver": candidate}

