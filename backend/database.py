import math
import os
import re
import json
import hashlib
import secrets
import urllib.request
import logging
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("yolovchi_database")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 5432))
DB_NAME = os.getenv("DB_NAME", "yo_lovchi")
DB_USER = os.getenv("DB_USER", "yolovchi")
DB_PASSWORD = os.getenv("DB_PASSWORD", "yolovchi")

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        cursor_factory=RealDictCursor
    )

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, key_hex = hashed.split('$')
        key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'admin',
            is_superuser BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Candidates table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS candidates (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            surname VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            pending_message_id BIGINT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Messages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            sender_type VARCHAR(50) DEFAULT 'admin',
            target_type VARCHAR(50) DEFAULT 'all',
            driver_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'system',
            audience VARCHAR(50) DEFAULT 'drivers',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Ensure audience column exists in messages if table was created previously
    cursor.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'messages' AND column_name = 'audience'
            ) THEN
                ALTER TABLE messages ADD COLUMN audience VARCHAR(50) DEFAULT 'drivers';
            END IF;
        END $$;
    """)

    # Support inquiries table (for driver Help Center and passenger Contact)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS support_inquiries (
            id SERIAL PRIMARY KEY,
            sender_type VARCHAR(50) NOT NULL,
            driver_id INTEGER REFERENCES candidates(id) ON DELETE SET NULL,
            sender_name VARCHAR(255) NOT NULL,
            sender_phone VARCHAR(50),
            telegram_id BIGINT,
            message TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'new',
            admin_reply TEXT,
            replied_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Message reads table (tracks which driver read which message)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS message_reads (
            id SERIAL PRIMARY KEY,
            message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
            driver_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
            read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_driver_message_read UNIQUE (message_id, driver_id)
        );
    """)

    # Routes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS routes (
            id SERIAL PRIMARY KEY,
            number VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            direction VARCHAR(255),
            color VARCHAR(50) DEFAULT 'var(--route-blue)',
            price VARCHAR(50) DEFAULT '3 000 so''m',
            stops JSONB DEFAULT '[]'::jsonb,
            polyline JSONB DEFAULT '[]'::jsonb,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Add assigned_route_id to candidates if missing
    cursor.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'candidates' AND column_name = 'assigned_route_id'
            ) THEN
                ALTER TABLE candidates ADD COLUMN assigned_route_id INTEGER REFERENCES routes(id) ON DELETE SET NULL;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'candidates' AND column_name = 'car_number'
            ) THEN
                ALTER TABLE candidates ADD COLUMN car_number VARCHAR(50);
            END IF;
            ALTER TABLE candidates ALTER COLUMN surname DROP NOT NULL;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'routes' AND column_name = 'arrow_color_forward'
            ) THEN
                ALTER TABLE routes ADD COLUMN arrow_color_forward VARCHAR(50) DEFAULT '#0066FF';
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'routes' AND column_name = 'arrow_color_backward'
            ) THEN
                ALTER TABLE routes ADD COLUMN arrow_color_backward VARCHAR(50) DEFAULT '#10B981';
            END IF;
        EXCEPTION
            WHEN OTHERS THEN NULL;
        END $$;
    """)

    # Driver live locations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS driver_locations (
            driver_id INTEGER PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
            route_id INTEGER REFERENCES routes(id) ON DELETE SET NULL,
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
            heading DOUBLE PRECISION DEFAULT 0.0,
            speed DOUBLE PRECISION DEFAULT 0.0,
            capacity VARCHAR(50) DEFAULT 'bosh',
            is_online BOOLEAN DEFAULT TRUE,
            active_on_route BOOLEAN DEFAULT FALSE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Ensure shift, active_on_route and terminal tracking columns exist in driver_locations
    cursor.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'driver_locations' AND column_name = 'active_on_route'
            ) THEN
                ALTER TABLE driver_locations ADD COLUMN active_on_route BOOLEAN DEFAULT FALSE;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'driver_locations' AND column_name = 'shift_started_at'
            ) THEN
                ALTER TABLE driver_locations ADD COLUMN shift_started_at TIMESTAMP;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'driver_locations' AND column_name = 'shift_ended_at'
            ) THEN
                ALTER TABLE driver_locations ADD COLUMN shift_ended_at TIMESTAMP;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'driver_locations' AND column_name = 'last_terminal'
            ) THEN
                ALTER TABLE driver_locations ADD COLUMN last_terminal VARCHAR(20);
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'driver_locations' AND column_name = 'last_terminal_time'
            ) THEN
                ALTER TABLE driver_locations ADD COLUMN last_terminal_time TIMESTAMP;
            END IF;
        END $$;
    """)

    # Driver completed trips (reyslar) table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS driver_trips (
            id SERIAL PRIMARY KEY,
            driver_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
            route_id INTEGER REFERENCES routes(id) ON DELETE SET NULL,
            direction VARCHAR(20) DEFAULT 'forward',
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()



    # Seed superuser (yolovchi / yolovchi)
    cursor.execute("SELECT id FROM users WHERE username = %s;", ('yolovchi',))
    if not cursor.fetchone():
        pwd_hash = hash_password('yolovchi')
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, is_superuser)
            VALUES (%s, %s, 'admin', TRUE);
        """, ('yolovchi', pwd_hash))
        conn.commit()
        print("Superuser 'yolovchi' created successfully.")

    cursor.close()
    conn.close()

def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash, role, is_superuser FROM users WHERE username = %s;", (username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user:
        return None
    if verify_password(password, user["password_hash"]):
        user_dict = dict(user)
        del user_dict["password_hash"]
        return user_dict
    return None

def format_row(row: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not row:
        return {}
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, (datetime, date)):
            d[k] = v.strftime("%Y-%m-%d %H:%M:%S")
    if "surname" in d and ("car_number" not in d or not d.get("car_number")):
        d["car_number"] = d.get("surname") or ""
    return d

def get_candidates(status: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT 
            c.*, 
            COALESCE(c.car_number, c.surname, '') as car_number,
            r.number as route_number, 
            r.name as route_name, 
            r.color as route_color,
            r.direction as route_direction,
            dl.is_online as dl_is_online,
            dl.active_on_route as dl_active_on_route,
            dl.updated_at as location_updated_at,
            dl.shift_started_at,
            dl.shift_ended_at,
            COALESCE(trips_stat.trips_today, 0) as trips_today,
            COALESCE(trips_stat.trips_total, 0) as trips_total
        FROM candidates c
        LEFT JOIN routes r ON c.assigned_route_id = r.id
        LEFT JOIN driver_locations dl ON c.id = dl.driver_id
        LEFT JOIN (
            SELECT 
                driver_id,
                COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE) as trips_today,
                COUNT(*) as trips_total
            FROM driver_trips
            GROUP BY driver_id
        ) trips_stat ON c.id = trips_stat.driver_id
    """
    if status:
        query += " WHERE c.status = %s ORDER BY c.id DESC;"
        cursor.execute(query, (status,))
    else:
        query += " ORDER BY c.id DESC;"
        cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    formatted_rows = []
    now = datetime.now()
    for r in rows:
        loc_updated = r.get("location_updated_at")
        dl_online = r.get("dl_is_online")
        is_online = bool(dl_online)

        d = format_row(r)
        d["is_online"] = is_online
        formatted_rows.append(d)
        
    return formatted_rows

def get_candidate_by_id(candidate_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            c.*, 
            COALESCE(c.car_number, c.surname, '') as car_number,
            r.number as route_number, 
            r.name as route_name, 
            r.color as route_color,
            r.direction as route_direction,
            dl.is_online as dl_is_online,
            dl.active_on_route as dl_active_on_route,
            dl.updated_at as location_updated_at,
            dl.shift_started_at,
            dl.shift_ended_at,
            COALESCE(trips_stat.trips_today, 0) as trips_today,
            COALESCE(trips_stat.trips_total, 0) as trips_total
        FROM candidates c
        LEFT JOIN routes r ON c.assigned_route_id = r.id
        LEFT JOIN driver_locations dl ON c.id = dl.driver_id
        LEFT JOIN (
            SELECT 
                driver_id,
                COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE) as trips_today,
                COUNT(*) as trips_total
            FROM driver_trips
            GROUP BY driver_id
        ) trips_stat ON c.id = trips_stat.driver_id
        WHERE c.id = %s;
    """, (candidate_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row:
        return None

    dl_online = row.get("dl_is_online")
    is_online = bool(dl_online)

    d = format_row(row)
    d["is_online"] = is_online
    return d

def get_candidate_by_telegram_id(telegram_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            c.*, 
            COALESCE(c.car_number, c.surname, '') as car_number,
            r.number as route_number, 
            r.name as route_name, 
            r.color as route_color,
            r.direction as route_direction,
            dl.is_online as dl_is_online,
            dl.active_on_route as dl_active_on_route,
            dl.updated_at as location_updated_at,
            dl.shift_started_at,
            dl.shift_ended_at,
            COALESCE(trips_stat.trips_today, 0) as trips_today,
            COALESCE(trips_stat.trips_total, 0) as trips_total
        FROM candidates c
        LEFT JOIN routes r ON c.assigned_route_id = r.id
        LEFT JOIN driver_locations dl ON c.id = dl.driver_id
        LEFT JOIN (
            SELECT 
                driver_id,
                COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE) as trips_today,
                COUNT(*) as trips_total
            FROM driver_trips
            GROUP BY driver_id
        ) trips_stat ON c.id = trips_stat.driver_id
        WHERE c.telegram_id = %s;
    """, (telegram_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row:
        return None

    dl_online = row.get("dl_is_online")
    is_online = bool(dl_online)

    d = format_row(row)
    d["is_online"] = is_online
    return d

def save_candidate(telegram_id: int, name: str, surname: str, phone: str, pending_message_id: Optional[int] = None, car_number: Optional[str] = None) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now()
    
    final_car_number = (car_number or surname or "").strip()
    final_surname = (surname or car_number or "").strip()
    
    cursor.execute("SELECT id FROM candidates WHERE telegram_id = %s;", (telegram_id,))
    existing = cursor.fetchone()
    
    if existing:
        cursor.execute("""
            UPDATE candidates 
            SET name = %s, surname = %s, car_number = %s, phone = %s, status = 'pending', pending_message_id = %s, updated_at = %s
            WHERE telegram_id = %s
            RETURNING id;
        """, (name, final_surname, final_car_number, phone, pending_message_id, now, telegram_id))
        candidate_id = cursor.fetchone()["id"]
    else:
        cursor.execute("""
            INSERT INTO candidates (telegram_id, name, surname, car_number, phone, status, pending_message_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, 'pending', %s, %s, %s)
            RETURNING id;
        """, (telegram_id, name, final_surname, final_car_number, phone, pending_message_id, now, now))
        candidate_id = cursor.fetchone()["id"]
        
    conn.commit()
    cursor.close()
    conn.close()
    return get_candidate_by_id(candidate_id)

def update_candidate_status(candidate_id: int, status: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now()
    cursor.execute("""
        UPDATE candidates
        SET status = %s, updated_at = %s
        WHERE id = %s;
    """, (status, now, candidate_id))
    conn.commit()
    cursor.close()
    conn.close()
    return get_candidate_by_id(candidate_id)

def delete_candidate(candidate_id: int) -> bool:
    """Delete candidate/driver completely from database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM candidates WHERE id = %s RETURNING id;", (candidate_id,))
    deleted = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return bool(deleted)

def get_candidate_by_phone(phone: str) -> Optional[Dict[str, Any]]:
    """Get candidate by formatted or raw phone number."""
    conn = get_connection()
    cursor = conn.cursor()
    # Normalize phone: extract numbers
    clean_phone = "".join(filter(str.isdigit, phone))
    cursor.execute("""
        SELECT c.*, r.number as route_number, r.name as route_name, r.color as route_color,
               dl.is_online as dl_is_online
        FROM candidates c
        LEFT JOIN routes r ON c.assigned_route_id = r.id
        LEFT JOIN driver_locations dl ON c.id = dl.driver_id
        WHERE regexp_replace(c.phone, '[^0-9]', '', 'g') = %s 
        OR c.phone = %s;
    """, (clean_phone, phone))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row:
        return None
    d = format_row(row)
    d["is_online"] = bool(row.get("dl_is_online"))
    return d

def save_message(
    title: str,
    message: str,
    type: str = "system",
    target_type: str = "all",
    driver_id: Optional[int] = None,
    sender_type: str = "admin",
    audience: str = "drivers"
) -> Dict[str, Any]:
    """Save an admin-sent message to the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO messages (title, message, type, target_type, driver_id, sender_type, audience, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        RETURNING id, title, message, type, target_type, driver_id, sender_type, audience, created_at;
    """, (title, message, type, target_type, driver_id, sender_type, audience))
    row = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return format_row(row)

def get_admin_messages(audience: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get list of messages sent from Admin Panel, optionally filtered by audience."""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT m.id, m.title, m.message, m.type, m.target_type, m.driver_id, m.sender_type, m.created_at,
               COALESCE(m.audience, 'drivers') as audience,
               c.name as driver_name, c.surname as driver_surname,
               COALESCE(c.car_number, c.surname, '') as driver_car_number,
               c.phone as driver_phone
        FROM messages m
        LEFT JOIN candidates c ON m.driver_id = c.id
    """
    params = []
    if audience:
        query += " WHERE COALESCE(m.audience, 'drivers') = %s"
        params.append(audience)
    query += " ORDER BY m.created_at DESC;"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [format_row(r) for r in rows]

def get_driver_messages(driver_id: int) -> List[Dict[str, Any]]:
    """Get all messages visible to a specific driver ('all' or targeted to driver_id), with read status."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.id, m.title, m.message, m.type, m.target_type, m.created_at,
               CASE WHEN mr.id IS NOT NULL THEN true ELSE false END as is_read
        FROM messages m
        LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.driver_id = %s
        WHERE (m.target_type = 'all' OR m.driver_id = %s) AND COALESCE(m.audience, 'drivers') = 'drivers'
        ORDER BY m.created_at DESC;
    """, (driver_id, driver_id))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [format_row(r) for r in rows]

def get_passenger_messages() -> List[Dict[str, Any]]:
    """Get all system messages published for passengers."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.id, m.title, m.message, m.type, m.created_at
        FROM messages m
        WHERE m.audience = 'passengers'
        ORDER BY m.created_at DESC;
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [format_row(r) for r in rows]

def delete_message(message_id: int) -> bool:
    """Delete a message by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE id = %s;", (message_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return True

def mark_message_as_read(message_id: int, driver_id: int) -> bool:
    """Mark a message as read by a specific driver."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO message_reads (message_id, driver_id, read_at)
        VALUES (%s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (message_id, driver_id) DO NOTHING;
    """, (message_id, driver_id))
    conn.commit()
    cursor.close()
    conn.close()
    return True

# --- SUPPORT INQUIRY FUNCTIONS (Qo'llab-quvvatlash) ---

def create_support_inquiry(
    sender_type: str,
    sender_name: str,
    sender_phone: Optional[str] = None,
    telegram_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    message: str = ""
) -> Dict[str, Any]:
    """Create a new support inquiry from driver or passenger."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO support_inquiries (sender_type, sender_name, sender_phone, telegram_id, driver_id, message, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, 'new', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, sender_type, sender_name, sender_phone, telegram_id, driver_id, message, status, admin_reply, replied_at, created_at, updated_at;
    """, (sender_type, sender_name, sender_phone, telegram_id, driver_id, message))
    row = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return format_row(row)

def get_support_inquiries(sender_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """List all support inquiries, optionally filtered by sender_type ('driver' | 'passenger')."""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT si.*,
               c.name as profile_driver_name,
               c.surname as profile_driver_surname,
               COALESCE(c.car_number, c.surname, '') as profile_driver_car_number,
               c.phone as profile_driver_phone,
               c.telegram_id as profile_driver_tg,
               r.number as route_number,
               r.name as route_name
        FROM support_inquiries si
        LEFT JOIN candidates c ON si.driver_id = c.id
        LEFT JOIN routes r ON c.assigned_route_id = r.id
    """
    params = []
    if sender_type:
        query += " WHERE si.sender_type = %s"
        params.append(sender_type)
    query += " ORDER BY si.created_at DESC;"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [format_row(r) for r in rows]

def update_support_inquiry(inquiry_id: int, status: Optional[str] = None, admin_reply: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Update status or set admin reply for a support inquiry."""
    conn = get_connection()
    cursor = conn.cursor()
    updates = ["updated_at = CURRENT_TIMESTAMP"]
    params = []
    if status:
        updates.append("status = %s")
        params.append(status)
    if admin_reply is not None:
        updates.append("admin_reply = %s")
        params.append(admin_reply)
        updates.append("replied_at = CURRENT_TIMESTAMP")
    params.append(inquiry_id)
    cursor.execute(f"""
        UPDATE support_inquiries
        SET {', '.join(updates)}
        WHERE id = %s
        RETURNING *;
    """, tuple(params))
    row = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return format_row(row) if row else None

def delete_support_inquiry(inquiry_id: int) -> bool:
    """Delete a support inquiry by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM support_inquiries WHERE id = %s;", (inquiry_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return True

# --- ROUTE & GPS FUNCTIONS ---

def extract_coords_from_text(text: str) -> Tuple[Optional[float], Optional[float]]:
    """Extracts latitude and longitude from any coordinate or URL string."""
    if not text:
        return None, None
        
    # 1. Google 3d/4d params (exact pin coordinates)
    m = re.search(r'!3d(-?\d{1,2}\.\d{2,})!4d(-?\d{1,3}\.\d{2,})', text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng
    
    # 2. @lat,lng
    m = re.search(r'@(-?\d{1,2}\.\d{2,}),(-?\d{1,3}\.\d{2,})', text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng
        
    # 3. /search/lat,+lng or ?q=lat,lng
    m = re.search(r'(?:search/|[?&]q=)(-?\d{1,2}\.\d{2,})[,\s\+]+(-?\d{1,3}\.\d{2,})', text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng

    # 4. Yandex ll=lng,lat
    m = re.search(r'll=(-?\d{1,3}\.\d{2,})(?:%2C|,)(-?\d{1,2}\.\d{2,})', text)
    if m:
        lng, lat = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng

    # 5. Direct coordinate string: lat, lng
    m = re.search(r'(-?\d{1,2}\.\d{2,})[\s,]+(-?\d{1,3}\.\d{2,})', text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng

    return None, None

def parse_coordinate_or_link(raw_text: str) -> Dict[str, Any]:
    """Parses latitude and longitude from coordinate string or Google/Yandex maps URLs, following short URLs if needed."""
    if not raw_text:
        return {"raw": "", "lat": None, "lng": None}
    
    text = str(raw_text).strip()
    
    # Fast path: check if text already contains direct coordinates
    lat, lng = extract_coords_from_text(text)
    if lat is not None and lng is not None:
        return {"raw": text, "lat": lat, "lng": lng}
        
    # If it is a web URL, try to follow redirects (especially short links like maps.app.goo.gl, goo.gl, etc.)
    if text.startswith("http://") or text.startswith("https://"):
        try:
            req = urllib.request.Request(
                text,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                final_url = resp.geturl()
                lat, lng = extract_coords_from_text(final_url)
                if lat is not None and lng is not None:
                    return {"raw": text, "lat": lat, "lng": lng}
        except Exception as e:
            logger.warning(f"Error resolving map link redirect for {text}: {e}")

    return {"raw": text, "lat": None, "lng": None}

def fetch_road_polyline(coords_lat_lng: List[List[float]]) -> List[List[float]]:
    """Fetches real road-following polyline using OSRM for points [ [lat, lng], ... ]."""
    if len(coords_lat_lng) < 2:
        return coords_lat_lng
    try:
        # OSRM expects: {lng1},{lat1};{lng2},{lat2}...
        coord_str = ";".join([f"{c[1]},{c[0]}" for c in coords_lat_lng])
        url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}?overview=full&geometries=geojson"
        req = urllib.request.Request(url, headers={'User-Agent': 'Yolovchi-App/1.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            if data.get("code") == "Ok" and data.get("routes"):
                geo_coords = data["routes"][0]["geometry"]["coordinates"]
                # geojson is [lng, lat], convert back to [lat, lng] for Leaflet
                return [[round(pt[1], 6), round(pt[0], 6)] for pt in geo_coords]
    except Exception as e:
        logger.warning(f"OSRM road routing fallback: {e}")
    return coords_lat_lng

def process_stops_and_polyline(stops: List[Any], polyline: Optional[List[Any]] = None) -> Tuple[List[Dict[str, Any]], List[List[float]]]:
    """Processes stops array and generates/cleans polyline coordinates."""
    processed_stops = []
    stop_points = []

    for i, s in enumerate(stops):
        raw_val = ""
        name_val = f"{i + 1}-bekat"
        if isinstance(s, dict):
            raw_val = s.get("raw") or s.get("coordinates") or ""
            name_val = s.get("name") or name_val
            lat_val = s.get("lat")
            lng_val = s.get("lng")
            if lat_val is not None and lng_val is not None:
                parsed = {"raw": raw_val, "lat": float(lat_val), "lng": float(lng_val)}
            else:
                parsed = parse_coordinate_or_link(raw_val)
        else:
            raw_val = str(s)
            parsed = parse_coordinate_or_link(raw_val)

        stop_obj = {
            "order": i + 1,
            "name": name_val,
            "raw": parsed["raw"],
            "lat": parsed["lat"],
            "lng": parsed["lng"]
        }
        processed_stops.append(stop_obj)
        if parsed["lat"] is not None and parsed["lng"] is not None:
            stop_points.append([parsed["lat"], parsed["lng"]])

    # If polyline is explicitly provided, validate it; otherwise fetch road polyline from stops
    final_polyline = []
    if polyline and isinstance(polyline, list) and len(polyline) > 0:
        for pt in polyline:
            if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                try:
                    final_polyline.append([float(pt[0]), float(pt[1])])
                except (ValueError, TypeError):
                    pass
    if not final_polyline and len(stop_points) >= 2:
        final_polyline = fetch_road_polyline(stop_points)
    elif not final_polyline:
        final_polyline = stop_points

    return processed_stops, final_polyline

def get_routes(is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
    """Get all routes with active drivers count."""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT r.*,
               COUNT(DISTINCT dl.driver_id) as active_buses
        FROM routes r
        LEFT JOIN driver_locations dl ON r.id = dl.route_id 
             AND dl.is_online = true 
    """
    if is_active is not None:
        query += " WHERE r.is_active = %s"
        query += " GROUP BY r.id ORDER BY r.id ASC;"
        cursor.execute(query, (is_active,))
    else:
        query += " GROUP BY r.id ORDER BY r.id ASC;"
        cursor.execute(query)
    
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    for r in rows:
        row_dict = format_row(r)
        if isinstance(row_dict.get("stops"), str):
            try:
                row_dict["stops"] = json.loads(row_dict["stops"])
            except:
                row_dict["stops"] = []
        if isinstance(row_dict.get("polyline"), str):
            try:
                row_dict["polyline"] = json.loads(row_dict["polyline"])
            except:
                row_dict["polyline"] = []
        
        row_dict["total_stops"] = len(row_dict.get("stops") or [])
        row_dict["active_buses"] = int(row_dict.get("active_buses") or 0)
        result.append(row_dict)
    return result

def get_route_by_id(route_id: int) -> Optional[Dict[str, Any]]:
    """Get single route by id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.*,
               COUNT(DISTINCT dl.driver_id) as active_buses
        FROM routes r
        LEFT JOIN driver_locations dl ON r.id = dl.route_id 
             AND dl.is_online = true 
        WHERE r.id = %s
        GROUP BY r.id;
    """, (route_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row:
        return None
    row_dict = format_row(row)
    if isinstance(row_dict.get("stops"), str):
        try:
            row_dict["stops"] = json.loads(row_dict["stops"])
        except:
            row_dict["stops"] = []
    if isinstance(row_dict.get("polyline"), str):
        try:
            row_dict["polyline"] = json.loads(row_dict["polyline"])
        except:
            row_dict["polyline"] = []
    row_dict["total_stops"] = len(row_dict.get("stops") or [])
    row_dict["active_buses"] = int(row_dict.get("active_buses") or 0)
    return row_dict

def create_route(
    number: str,
    name: str,
    direction: Optional[str] = None,
    color: str = "var(--route-blue)",
    price: str = "3 000 so'm",
    stops: Optional[List[Any]] = None,
    polyline: Optional[List[Any]] = None,
    is_active: bool = True,
    arrow_color_forward: str = "#0066FF",
    arrow_color_backward: str = "#10B981",
    **kwargs
) -> Dict[str, Any]:
    """Create a new route with parsed stops and polyline."""
    processed_stops, processed_polyline = process_stops_and_polyline(stops or [], polyline)
    
    dir_name = direction or name
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO routes (number, name, direction, color, price, stops, polyline, is_active, arrow_color_forward, arrow_color_backward, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *;
    """, (
        str(number),
        str(name),
        str(dir_name),
        str(color),
        str(price),
        json.dumps(processed_stops),
        json.dumps(processed_polyline),
        bool(is_active),
        str(arrow_color_forward or "#0066FF"),
        str(arrow_color_backward or "#10B981")
    ))
    row = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return get_route_by_id(row["id"])

def update_route(
    route_id: int,
    number: Optional[str] = None,
    name: Optional[str] = None,
    direction: Optional[str] = None,
    color: Optional[str] = None,
    price: Optional[str] = None,
    stops: Optional[List[Any]] = None,
    polyline: Optional[List[Any]] = None,
    is_active: Optional[bool] = None,
    arrow_color_forward: Optional[str] = None,
    arrow_color_backward: Optional[str] = None,
    **kwargs
) -> Optional[Dict[str, Any]]:
    """Update existing route."""
    existing = get_route_by_id(route_id)
    if not existing:
        return None

    new_number = number if number is not None else existing["number"]
    new_name = name if name is not None else existing["name"]
    new_direction = direction if direction is not None else existing["direction"]
    new_color = color if color is not None else existing["color"]
    new_price = price if price is not None else existing["price"]
    new_is_active = is_active if is_active is not None else existing["is_active"]
    new_arrow_forward = arrow_color_forward if arrow_color_forward is not None else existing.get("arrow_color_forward", "#0066FF")
    new_arrow_backward = arrow_color_backward if arrow_color_backward is not None else existing.get("arrow_color_backward", "#10B981")

    if stops is not None:
        target_stops = stops
        target_poly = polyline  # Re-route through all stops if polyline not explicitly passed
        processed_stops, processed_poly = process_stops_and_polyline(target_stops, target_poly)
    elif polyline is not None:
        target_stops = existing.get("stops", [])
        processed_stops, processed_poly = process_stops_and_polyline(target_stops, polyline)
    else:
        processed_stops = existing.get("stops", [])
        processed_poly = existing.get("polyline", [])

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE routes
        SET number = %s, name = %s, direction = %s, color = %s, price = %s,
            stops = %s, polyline = %s, is_active = %s,
            arrow_color_forward = %s, arrow_color_backward = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING id;
    """, (
        str(new_number),
        str(new_name),
        str(new_direction),
        str(new_color),
        str(new_price),
        json.dumps(processed_stops),
        json.dumps(processed_poly),
        bool(new_is_active),
        str(new_arrow_forward or "#0066FF"),
        str(new_arrow_backward or "#10B981"),
        route_id
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return get_route_by_id(route_id)

def delete_route(route_id: int) -> bool:
    """Delete a route."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM routes WHERE id = %s RETURNING id;", (route_id,))
    deleted = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return bool(deleted)

def assign_driver_to_route(driver_id: int, route_id: Optional[int]) -> bool:
    """Assign or unassign an approved driver to a route."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE candidates
        SET assigned_route_id = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING id;
    """, (route_id, driver_id))
    updated = cursor.fetchone()
    
    # Also update route_id in driver_locations if exists
    if updated:
        if route_id:
            cursor.execute("""
                UPDATE driver_locations
                SET route_id = %s
                WHERE driver_id = %s;
            """, (route_id, driver_id))
        else:
            cursor.execute("""
                UPDATE driver_locations
                SET is_online = FALSE, route_id = NULL
                WHERE driver_id = %s;
            """, (driver_id,))
        
    conn.commit()
    cursor.close()
    conn.close()
    return bool(updated)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in meters between two lat/lng coordinates using Haversine formula."""
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def distance_to_segment(p_lat: float, p_lng: float, a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    """Distance in meters from point P to line segment AB."""
    d_ab = haversine_distance(a_lat, a_lng, b_lat, b_lng)
    if d_ab == 0:
        return haversine_distance(p_lat, p_lng, a_lat, a_lng)

    mid_lat_rad = math.radians((a_lat + b_lat) / 2.0)
    cos_lat = math.cos(mid_lat_rad)

    dx = (b_lng - a_lng) * cos_lat
    dy = b_lat - a_lat

    seg_len_sq = dx * dx + dy * dy
    if seg_len_sq == 0:
        return haversine_distance(p_lat, p_lng, a_lat, a_lng)

    px = (p_lng - a_lng) * cos_lat
    py = p_lat - a_lat

    t = (px * dx + py * dy) / seg_len_sq
    t = max(0.0, min(1.0, t))

    closest_lat = a_lat + t * (b_lat - a_lat)
    closest_lng = a_lng + t * (b_lng - a_lng)

    return haversine_distance(p_lat, p_lng, closest_lat, closest_lng)

def calculate_distance_to_route_polyline(lat: float, lng: float, route_id: int) -> Optional[float]:
    """Calculate minimum distance in meters from (lat, lng) to the assigned route's polyline or stops."""
    route = get_route_by_id(route_id)
    if not route:
        return None

    polyline = route.get("polyline")
    stops = route.get("stops")

    min_dist = float('inf')

    # 1. Check polyline
    if polyline and isinstance(polyline, list) and len(polyline) > 0:
        for i in range(len(polyline)):
            p = polyline[i]
            if len(p) >= 2:
                p_lat, p_lng = float(p[0]), float(p[1])
                d = haversine_distance(lat, lng, p_lat, p_lng)
                if d < min_dist:
                    min_dist = d
                if i < len(polyline) - 1:
                    next_p = polyline[i + 1]
                    if len(next_p) >= 2:
                        n_lat, n_lng = float(next_p[0]), float(next_p[1])
                        seg_d = distance_to_segment(lat, lng, p_lat, p_lng, n_lat, n_lng)
                        if seg_d < min_dist:
                            min_dist = seg_d

    # 2. Check stops if polyline did not yield a valid distance
    if min_dist == float('inf') and stops and isinstance(stops, list) and len(stops) > 0:
        for i in range(len(stops)):
            s = stops[i]
            s_lat = s.get("lat")
            s_lng = s.get("lng")
            if s_lat is not None and s_lng is not None:
                d = haversine_distance(lat, lng, float(s_lat), float(s_lng))
                if d < min_dist:
                    min_dist = d
                if i < len(stops) - 1:
                    next_s = stops[i + 1]
                    n_lat = next_s.get("lat")
                    n_lng = next_s.get("lng")
                    if n_lat is not None and n_lng is not None:
                        seg_d = distance_to_segment(
                            lat, lng,
                            float(s_lat), float(s_lng),
                            float(n_lat), float(n_lng)
                        )
                        if seg_d < min_dist:
                            min_dist = seg_d

    return min_dist if min_dist != float('inf') else None

def check_and_record_trip(cursor, driver_id: int, route_id: Optional[int], lat: float, lng: float):
    """Detect when a driver reaches start or end terminal of route and records completed trips."""
    if not route_id or not lat or not lng:
        return
    
    cursor.execute("SELECT stops, polyline FROM routes WHERE id = %s;", (route_id,))
    route = cursor.fetchone()
    if not route:
        return

    stops_data = route.get("stops")
    polyline_data = route.get("polyline")
    
    start_pt = None
    end_pt = None
    
    # 1. From polyline
    if polyline_data:
        try:
            poly = json.loads(polyline_data) if isinstance(polyline_data, str) else polyline_data
            if poly and len(poly) >= 2:
                start_pt = (float(poly[0][0]), float(poly[0][1]))
                end_pt = (float(poly[-1][0]), float(poly[-1][1]))
        except Exception:
            pass

    # 2. From stops if polyline not parsed
    if not start_pt and stops_data:
        try:
            stops = json.loads(stops_data) if isinstance(stops_data, str) else stops_data
            if stops and len(stops) >= 2:
                start_pt = (float(stops[0].get("lat")), float(stops[0].get("lng")))
                end_pt = (float(stops[-1].get("lat")), float(stops[-1].get("lng")))
        except Exception:
            pass

    if not start_pt or not end_pt:
        return

    dist_to_start = haversine_distance(lat, lng, start_pt[0], start_pt[1])
    dist_to_end = haversine_distance(lat, lng, end_pt[0], end_pt[1])
    threshold = 500.0  # 500 meters terminal radius

    cursor.execute("SELECT last_terminal, last_terminal_time FROM driver_locations WHERE driver_id = %s;", (driver_id,))
    loc_row = cursor.fetchone()
    last_term = loc_row.get("last_terminal") if loc_row else None

    # Near Start Terminal
    if dist_to_start <= threshold:
        if last_term == 'end':
            # Driver arrived at start terminal from end terminal -> 1 trip completed!
            cursor.execute("""
                INSERT INTO driver_trips (driver_id, route_id, direction, completed_at)
                VALUES (%s, %s, 'backward', CURRENT_TIMESTAMP);
            """, (driver_id, route_id))
            cursor.execute("""
                UPDATE driver_locations 
                SET last_terminal = 'start', last_terminal_time = CURRENT_TIMESTAMP
                WHERE driver_id = %s;
            """, (driver_id,))
        elif last_term is None:
            cursor.execute("""
                UPDATE driver_locations 
                SET last_terminal = 'start', last_terminal_time = CURRENT_TIMESTAMP
                WHERE driver_id = %s;
            """, (driver_id,))

    # Near End Terminal
    elif dist_to_end <= threshold:
        if last_term == 'start':
            # Driver arrived at end terminal from start terminal -> 1 trip completed!
            cursor.execute("""
                INSERT INTO driver_trips (driver_id, route_id, direction, completed_at)
                VALUES (%s, %s, 'forward', CURRENT_TIMESTAMP);
            """, (driver_id, route_id))
            cursor.execute("""
                UPDATE driver_locations 
                SET last_terminal = 'end', last_terminal_time = CURRENT_TIMESTAMP
                WHERE driver_id = %s;
            """, (driver_id,))
        elif last_term is None:
            cursor.execute("""
                UPDATE driver_locations 
                SET last_terminal = 'end', last_terminal_time = CURRENT_TIMESTAMP
                WHERE driver_id = %s;
            """, (driver_id,))

def record_driver_trip(driver_id: int, route_id: Optional[int] = None, direction: str = "forward") -> Dict[str, Any]:
    """Manually or explicitly record a trip for a driver."""
    conn = get_connection()
    cursor = conn.cursor()
    target_route = route_id
    if not target_route:
        cursor.execute("SELECT assigned_route_id FROM candidates WHERE id = %s;", (driver_id,))
        c = cursor.fetchone()
        if c:
            target_route = c.get("assigned_route_id")
    
    cursor.execute("""
        INSERT INTO driver_trips (driver_id, route_id, direction, completed_at)
        VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
        RETURNING *;
    """, (driver_id, target_route, direction))
    row = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return format_row(row)

def get_driver_location(driver_id: int) -> Optional[Dict[str, Any]]:
    """Get the current live location and online state of a driver."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT dl.*, 
               c.name as driver_name, 
               COALESCE(c.car_number, c.surname, '') as driver_car_number,
               c.assigned_route_id
        FROM driver_locations dl
        JOIN candidates c ON dl.driver_id = c.id
        WHERE dl.driver_id = %s;
    """, (driver_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return format_row(row) if row else None

def update_driver_location(
    driver_id: int,
    latitude: float,
    longitude: float,
    heading: float = 0.0,
    speed: float = 0.0,
    capacity: str = "bosh",
    route_id: Optional[int] = None
) -> Dict[str, Any]:
    """Upsert driver real-time GPS location, update shift and detect completed route trips."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # If route_id not supplied, get from candidates
    target_route_id = route_id
    if not target_route_id:
        cursor.execute("SELECT assigned_route_id FROM candidates WHERE id = %s;", (driver_id,))
        cand = cursor.fetchone()
        if cand:
            target_route_id = cand.get("assigned_route_id")

    cursor.execute("""
        INSERT INTO driver_locations (
            driver_id, route_id, latitude, longitude, heading, speed, capacity,
            is_online, active_on_route, shift_started_at, shift_ended_at, updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, true, true, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
        ON CONFLICT (driver_id) DO UPDATE
        SET route_id = COALESCE(EXCLUDED.route_id, driver_locations.route_id),
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            heading = EXCLUDED.heading,
            speed = EXCLUDED.speed,
            capacity = EXCLUDED.capacity,
            is_online = true,
            active_on_route = true,
            shift_started_at = CASE 
                WHEN driver_locations.is_online = false OR driver_locations.shift_started_at IS NULL OR driver_locations.shift_ended_at IS NOT NULL 
                THEN CURRENT_TIMESTAMP 
                ELSE driver_locations.shift_started_at 
            END,
            shift_ended_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *;
    """, (driver_id, target_route_id, latitude, longitude, heading, speed, capacity))
    row = cursor.fetchone()

    try:
        check_and_record_trip(cursor, driver_id, target_route_id, latitude, longitude)
    except Exception as e:
        logger.warning(f"Error checking trips for driver {driver_id}: {e}")

    conn.commit()
    cursor.close()
    conn.close()
    return format_row(row)

def set_driver_offline(driver_id: int) -> bool:
    """Mark driver offline in driver_locations and set shift_ended_at."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE driver_locations 
        SET is_online = false,
            active_on_route = false,
            shift_ended_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = %s;
    """, (driver_id,))
    updated = cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    return bool(updated)

def update_driver_capacity(driver_id: int, capacity: str) -> bool:
    """Update driver vehicle capacity status."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE driver_locations 
        SET capacity = %s, updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = %s;
    """, (capacity, driver_id))
    updated = cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    return bool(updated)

def get_live_drivers_for_route(route_id: int) -> List[Dict[str, Any]]:
    """Get currently active online drivers transmitting GPS for a specific route."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT dl.*, c.name, c.surname, COALESCE(c.car_number, c.surname, '') as car_number, c.phone, 
               r.number as route_number, r.name as route_name, r.color as route_color, r.stops as route_stops, r.polyline as route_polyline
        FROM driver_locations dl
        JOIN candidates c ON dl.driver_id = c.id
        LEFT JOIN routes r ON dl.route_id = r.id
        WHERE dl.route_id = %s 
          AND dl.is_online = true 
          AND c.status = 'approved'
        ORDER BY dl.updated_at DESC;
    """, (route_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [format_row(r) for r in rows]

def get_all_live_drivers() -> List[Dict[str, Any]]:
    """Get all currently active online drivers across all routes."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT dl.*, c.name, c.surname, COALESCE(c.car_number, c.surname, '') as car_number, c.phone, 
               r.number as route_number, r.name as route_name, r.color as route_color, r.stops as route_stops, r.polyline as route_polyline
        FROM driver_locations dl
        JOIN candidates c ON dl.driver_id = c.id
        LEFT JOIN routes r ON dl.route_id = r.id
        WHERE dl.is_online = true 
          AND c.status = 'approved'
        ORDER BY dl.updated_at DESC;
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [format_row(r) for r in rows]



def get_dashboard_stats() -> Dict[str, Any]:
    """Calculate real-time dashboard stats from the database."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Total approved drivers
    cursor.execute("SELECT COUNT(*) as count FROM candidates WHERE status = 'approved';")
    row = cursor.fetchone()
    total_drivers = row.get("count", 0) if row else 0

    # 2. Online drivers (is_online = true)
    cursor.execute("""
        SELECT COUNT(DISTINCT dl.driver_id) as count
        FROM driver_locations dl
        JOIN candidates c ON dl.driver_id = c.id
        WHERE c.status = 'approved'
          AND dl.is_online = true;
    """)
    row = cursor.fetchone()
    online_drivers = row.get("count", 0) if row else 0

    # 3. Offline drivers
    offline_drivers = max(0, total_drivers - online_drivers)

    # 4. Hozir yo'lda (active online drivers on an assigned route)
    cursor.execute("""
        SELECT COUNT(DISTINCT dl.driver_id) as count
        FROM driver_locations dl
        JOIN candidates c ON dl.driver_id = c.id
        WHERE c.status = 'approved'
          AND dl.is_online = true 
          AND dl.route_id IS NOT NULL;
    """)
    row = cursor.fetchone()
    on_road = row.get("count", 0) if row else 0
    if on_road > online_drivers:
        on_road = online_drivers

    # 5. Total active routes
    cursor.execute("SELECT COUNT(*) as count FROM routes WHERE is_active = true;")
    row = cursor.fetchone()
    total_routes = row.get("count", 0) if row else 0

    # 6. Pending candidates
    cursor.execute("SELECT COUNT(*) as count FROM candidates WHERE status = 'pending';")
    row = cursor.fetchone()
    pending_candidates = row.get("count", 0) if row else 0

    # 7. Recent activities
    activities = []
    cursor.execute("""
        SELECT name, surname, status, created_at, updated_at
        FROM candidates
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 6;
    """)
    for r in cursor.fetchall():
        is_approved = r.get("status") == "approved"
        action = "tasdiqlandi" if is_approved else "ariza topshirdi"
        time_val = r.get("updated_at") if is_approved else r.get("created_at")
        activities.append({
            "title": f"{r.get('name', '')} {r.get('surname', '')} {action}",
            "time": str(time_val or ''),
            "status": r.get("status")
        })

    cursor.close()
    conn.close()

    return {
        "total_drivers": total_drivers,
        "online_drivers": online_drivers,
        "offline_drivers": offline_drivers,
        "on_road": on_road,
        "total_routes": total_routes,
        "pending_candidates": pending_candidates,
        "recent_activities": activities
    }


