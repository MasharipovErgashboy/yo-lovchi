from fastapi import FastAPI, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
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
    delete_candidate,
    save_message,
    get_admin_messages,
    get_driver_messages,
    get_passenger_messages,
    delete_message,
    mark_message_as_read,
    create_support_inquiry,
    get_support_inquiries,
    update_support_inquiry,
    delete_support_inquiry,
    get_routes,
    get_route_by_id,
    create_route,
    update_route,
    delete_route,
    assign_driver_to_route,
    update_driver_location,
    set_driver_offline,
    update_driver_capacity,
    get_live_drivers_for_route,
    get_all_live_drivers,
    get_dashboard_stats
)
from telegram_service import (
    send_approval_message,
    send_rejection_message,
    reset_driver_bot_state,
    send_driver_notification
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

class MessageCreate(BaseModel):
    title: str
    message: str
    type: Optional[str] = "system"
    target_type: Optional[str] = "all"
    driver_id: Optional[int] = None
    audience: Optional[str] = "drivers"  # "drivers" | "passengers"

class SupportInquiryCreate(BaseModel):
    sender_type: str = "driver"  # "driver" | "passenger"
    sender_name: str
    sender_phone: Optional[str] = None
    telegram_id: Optional[int] = None
    driver_id: Optional[int] = None
    message: str

class SupportInquiryUpdate(BaseModel):
    status: Optional[str] = None
    admin_reply: Optional[str] = None

class RouteCreate(BaseModel):
    number: str
    name: str
    direction: Optional[str] = ""
    color: Optional[str] = "var(--route-blue)"
    price: Optional[str] = ""
    stops: Optional[List[Any]] = []
    polyline: Optional[List[List[float]]] = []
    is_active: Optional[bool] = True

class RouteUpdate(BaseModel):
    number: Optional[str] = None
    name: Optional[str] = None
    direction: Optional[str] = None
    color: Optional[str] = None
    price: Optional[str] = None
    stops: Optional[List[Any]] = None
    polyline: Optional[List[List[float]]] = None
    is_active: Optional[bool] = None

class AssignRouteRequest(BaseModel):
    route_id: Optional[int] = None

class DriverLocationUpdate(BaseModel):
    driver_id: Optional[int] = None
    telegram_id: Optional[int] = None
    phone: Optional[str] = None
    route_id: Optional[int] = None
    latitude: float
    longitude: float
    heading: Optional[float] = 0.0
    speed: Optional[float] = 0.0
    capacity: Optional[str] = "bosh"

class DriverCapacityRequest(BaseModel):
    driver_id: Optional[int] = None
    telegram_id: Optional[int] = None
    phone: Optional[str] = None
    capacity: str

class DriverOfflineRequest(BaseModel):
    driver_id: Optional[int] = None
    telegram_id: Optional[int] = None
    phone: Optional[str] = None

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
def check_driver_status(
    driver_id: Optional[int] = None,
    phone: Optional[str] = None,
    telegram_id: Optional[int] = None
):
    """Check if driver is currently approved in the system and return full assigned route."""
    candidate = None
    if driver_id:
        candidate = get_candidate_by_id(driver_id)
    elif telegram_id:
        candidate = get_candidate_by_telegram_id(telegram_id)
    elif phone:
        candidate = get_candidate_by_phone(phone)
    
    if not candidate or candidate.get("status") != "approved":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver is not approved or not found")
    
    # Resolve assigned route
    assigned_route = None
    if candidate.get("assigned_route_id"):
        assigned_route = get_route_by_id(candidate["assigned_route_id"])
    
    # If no route is assigned yet, check active routes and assign to the first active route
    if not assigned_route:
        all_routes = get_routes(active_only=True)
        if all_routes:
            first_route = all_routes[0]
            assign_driver_to_route(candidate["id"], first_route["id"])
            assigned_route = first_route
            candidate["assigned_route_id"] = first_route["id"]
            candidate["route_number"] = first_route.get("number")
            candidate["route_name"] = first_route.get("name")
            candidate["route_color"] = first_route.get("color")

    return {
        "status": "approved",
        "driver": candidate,
        "assigned_route": assigned_route
    }

@app.post("/api/driver/capacity")
def set_capacity(payload: DriverCapacityRequest):
    """Driver instantly changes vehicle capacity (bosh, ozroq, tola)."""
    target_driver = None
    if payload.driver_id:
        target_driver = get_candidate_by_id(payload.driver_id)
    elif payload.telegram_id:
        target_driver = get_candidate_by_telegram_id(payload.telegram_id)
    elif payload.phone:
        target_driver = get_candidate_by_phone(payload.phone)

    if not target_driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

    success = update_driver_capacity(target_driver["id"], payload.capacity)
    return {"success": success, "driver_id": target_driver["id"], "capacity": payload.capacity}

@app.post("/api/driver/offline")
def set_offline(payload: DriverOfflineRequest):
    """Driver turns off GPS tracking."""
    target_driver = None
    if payload.driver_id:
        target_driver = get_candidate_by_id(payload.driver_id)
    elif payload.telegram_id:
        target_driver = get_candidate_by_telegram_id(payload.telegram_id)
    elif payload.phone:
        target_driver = get_candidate_by_phone(payload.phone)

    if not target_driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

    success = set_driver_offline(target_driver["id"])
    return {"success": success, "driver_id": target_driver["id"], "is_online": False}

@app.get("/api/messages")
def list_messages(audience: Optional[str] = None):
    """Admin gets list of all messages sent, optionally filtered by audience ('drivers' | 'passengers')."""
    return get_admin_messages(audience=audience)

@app.post("/api/messages", status_code=status.HTTP_201_CREATED)
async def create_message(payload: MessageCreate):
    """Admin sends a message to all drivers, a specific driver, or passengers."""
    audience = payload.audience or "drivers"
    msg = save_message(
        title=payload.title,
        message=payload.message,
        type=payload.type or "system",
        target_type=payload.target_type or ("passengers" if audience == "passengers" else "all"),
        driver_id=payload.driver_id,
        audience=audience
    )
    
    # If audience is drivers, send real-time notification to Telegram Bot
    if audience == "drivers":
        if payload.target_type == "driver" and payload.driver_id:
            driver = get_candidate_by_id(payload.driver_id)
            if driver and driver.get("telegram_id"):
                await send_driver_notification(
                    telegram_id=driver["telegram_id"],
                    title=payload.title,
                    message=payload.message,
                    msg_type=payload.type or "system"
                )
        elif payload.target_type == "all":
            approved_drivers = get_candidates(status="approved")
            for driver in approved_drivers:
                tg_id = driver.get("telegram_id")
                if tg_id:
                    try:
                        await send_driver_notification(
                            telegram_id=tg_id,
                            title=payload.title,
                            message=payload.message,
                            msg_type=payload.type or "system"
                        )
                    except Exception:
                        pass

    return msg

@app.delete("/api/messages/{message_id}")
def remove_message(message_id: int):
    """Delete a message."""
    delete_message(message_id)
    return {"success": True}

@app.get("/api/passenger-messages")
def list_passenger_messages():
    """Fetch system messages visible to passengers."""
    return get_passenger_messages()

# --- SUPPORT INQUIRY ENDPOINTS (Qo'llab-quvvatlash) ---

@app.get("/api/support-inquiries")
def list_support_inquiries(sender_type: Optional[str] = None):
    """Admin lists all support inquiries (filtered by sender_type: 'driver' | 'passenger')."""
    return get_support_inquiries(sender_type=sender_type)

@app.post("/api/support-inquiries", status_code=status.HTTP_201_CREATED)
def submit_support_inquiry(payload: SupportInquiryCreate):
    """Driver or Passenger submits a support inquiry."""
    return create_support_inquiry(
        sender_type=payload.sender_type,
        sender_name=payload.sender_name,
        sender_phone=payload.sender_phone,
        telegram_id=payload.telegram_id,
        driver_id=payload.driver_id,
        message=payload.message
    )

@app.patch("/api/support-inquiries/{inquiry_id}")
def patch_support_inquiry(inquiry_id: int, payload: SupportInquiryUpdate):
    """Admin updates inquiry status or sets admin reply."""
    res = update_support_inquiry(inquiry_id, status=payload.status, admin_reply=payload.admin_reply)
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")
    return res

@app.delete("/api/support-inquiries/{inquiry_id}")
def remove_support_inquiry(inquiry_id: int):
    """Admin deletes an inquiry."""
    delete_support_inquiry(inquiry_id)
    return {"success": True}

@app.get("/api/drivers/{driver_id}/messages")
def get_messages_for_single_driver(driver_id: int):
    """Fetch messages for a specific driver by id."""
    return get_driver_messages(driver_id)

@app.get("/api/driver-messages")
def get_driver_messages_by_query(
    phone: Optional[str] = None,
    telegram_id: Optional[int] = None,
    driver_id: Optional[int] = None
):
    """Fetch messages for Mini App by phone, telegram_id, or driver_id."""
    target_driver = None
    if driver_id:
        target_driver = get_candidate_by_id(driver_id)
    elif telegram_id:
        target_driver = get_candidate_by_telegram_id(telegram_id)
    elif phone:
        target_driver = get_candidate_by_phone(phone)
    
    target_id = target_driver["id"] if target_driver else 0
    return get_driver_messages(target_id)

@app.post("/api/messages/{message_id}/read")
def read_message(
    message_id: int,
    phone: Optional[str] = None,
    telegram_id: Optional[int] = None,
    driver_id: Optional[int] = None
):
    """Mark a message as read by a driver."""
    d_id = driver_id
    if not d_id:
        target_driver = None
        if telegram_id:
            target_driver = get_candidate_by_telegram_id(telegram_id)
        elif phone:
            target_driver = get_candidate_by_phone(phone)
        if target_driver:
            d_id = target_driver["id"]
    
    if d_id:
        mark_message_as_read(message_id, d_id)
    return {"success": True}

# --- ROUTES & GPS ENDPOINTS ---

@app.get("/api/routes")
def list_routes(is_active: Optional[bool] = None):
    """List all routes, optionally filtered by is_active."""
    return get_routes(is_active=is_active)

@app.get("/api/routes/{route_id}")
def get_route(route_id: int):
    """Get single route by ID."""
    route = get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    return route

@app.post("/api/routes", status_code=status.HTTP_201_CREATED)
def create_new_route(payload: RouteCreate):
    """Admin creates a new route."""
    try:
        route = create_route(
            number=payload.number,
            name=payload.name,
            direction=payload.direction or "",
            color=payload.color or "var(--route-blue)",
            price=payload.price or "",
            stops=payload.stops or [],
            polyline=payload.polyline or [],
            is_active=payload.is_active if payload.is_active is not None else True
        )
        return route
    except Exception as e:
        logger.error(f"Error creating route: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.put("/api/routes/{route_id}")
def update_existing_route(route_id: int, payload: RouteUpdate):
    """Admin updates an existing route."""
    route = get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    
    updated = update_route(
        route_id=route_id,
        number=payload.number,
        name=payload.name,
        direction=payload.direction,
        color=payload.color,
        price=payload.price,
        stops=payload.stops,
        polyline=payload.polyline,
        is_active=payload.is_active
    )
    return updated

@app.delete("/api/routes/{route_id}")
def delete_existing_route(route_id: int):
    """Admin deletes a route."""
    route = get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    deleted = delete_route(route_id)
    return {"success": deleted, "deleted_id": route_id}

@app.post("/api/drivers/{driver_id}/assign-route")
def assign_route(driver_id: int, payload: AssignRouteRequest):
    """Assign or unassign a route to an approved driver."""
    driver = get_candidate_by_id(driver_id)
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")
    
    if payload.route_id:
        route = get_route_by_id(payload.route_id)
        if not route:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target route not found")
            
    success = assign_driver_to_route(driver_id, payload.route_id)
    return {"success": success, "driver_id": driver_id, "route_id": payload.route_id}

@app.post("/api/driver/location")
def update_location(payload: DriverLocationUpdate):
    """Driver mobile/mini-app transmits live GPS coordinates."""
    target_driver = None
    if payload.driver_id:
        target_driver = get_candidate_by_id(payload.driver_id)
    elif payload.telegram_id:
        target_driver = get_candidate_by_telegram_id(payload.telegram_id)
    elif payload.phone:
        target_driver = get_candidate_by_phone(payload.phone)

    if not target_driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

    loc = update_driver_location(
        driver_id=target_driver["id"],
        latitude=payload.latitude,
        longitude=payload.longitude,
        heading=payload.heading or 0.0,
        speed=payload.speed or 0.0,
        capacity=payload.capacity or "bosh",
        route_id=payload.route_id
    )
    return {"success": True, "location": loc}

@app.get("/api/routes/{route_id}/live-drivers")
def get_route_live_drivers(route_id: int, response: Response):
    """Get active online drivers transmitting coordinates for a specific route."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return get_live_drivers_for_route(route_id)

@app.get("/api/live-drivers")
def get_all_active_drivers(response: Response):
    """Get all active online drivers transmitting coordinates across all routes."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return get_all_live_drivers()

@app.get("/api/dashboard/stats")
def get_stats(response: Response):
    """Get real-time statistics for the admin dashboard."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return get_dashboard_stats()



