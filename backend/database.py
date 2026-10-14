import os
import re
import json
import hashlib
import secrets
import urllib.request
import logging
from datetime import datetime
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()

    # Seed initial routes if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM routes;")
    res_cnt = cursor.fetchone()
    if res_cnt and res_cnt.get("cnt", 0) == 0:
        default_routes = [
            {
                "number": "12",
                "name": "12-marshrut",
                "direction": "Andijon (Eski shahar) → Asaka",
                "color": "var(--route-blue)",
                "price": "3 000 so'm",
                "stops": json.dumps([
                    {"name": "Eski shahar (Bosh bekat)", "raw": "40.7821, 72.3442", "lat": 40.7821, "lng": 72.3442},
                    {"name": "Navoiy shoh ko'chasi", "raw": "40.7650, 72.3550", "lat": 40.7650, "lng": 72.3550},
                    {"name": "Viloyat shifoxonasi", "raw": "40.7420, 72.3680", "lat": 40.7420, "lng": 72.3680},
                    {"name": "Asaka avtoshoxbekat", "raw": "40.6415, 72.2389", "lat": 40.6415, "lng": 72.2389}
                ]),
                "polyline": json.dumps([
                    [40.7821, 72.3442],
                    [40.7650, 72.3550],
                    [40.7420, 72.3680],
                    [40.6415, 72.2389]
                ])
            },
            {
                "number": "15",
                "name": "15-marshrut",
                "direction": "Andijon vokzal → Oltinko'l",
                "color": "var(--route-green)",
                "price": "2 500 so'm",
                "stops": json.dumps([
                    {"name": "Andijon Temiryo'l Vokzali", "raw": "40.7950, 72.3620", "lat": 40.7950, "lng": 72.3620},
                    {"name": "Yangi bozor", "raw": "40.7780, 72.3410", "lat": 40.7780, "lng": 72.3410},
                    {"name": "Oltinko'l markaz", "raw": "40.8010, 72.1850", "lat": 40.8010, "lng": 72.1850}
                ]),
                "polyline": json.dumps([
                    [40.7950, 72.3620],
                    [40.7780, 72.3410],
                    [40.8010, 72.1850]
                ])
            }
        ]
        for r in default_routes:
            cursor.execute("""
                INSERT INTO routes (number, name, direction, color, price, stops, polyline)
                VALUES (%s, %s, %s, %s, %s, %s, %s);
            """, (r["number"], r["name"], r["direction"], r["color"], r["price"], r["stops"], r["polyline"]))
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

def format_row(row: Dict[str, Any]) -> Dict[str, Any]:
    d = dict(row)
    if isinstance(d.get("created_at"), datetime):
        d["created_at"] = d["created_at"].strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(d.get("updated_at"), datetime):
        d["updated_at"] = d["updated_at"].strftime("%Y-%m-%d %H:%M:%S")
    return d

def get_candidates(status: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT c.*, r.number as route_number, r.name as route_name, r.color as route_color
        FROM candidates c
        LEFT JOIN routes r ON c.assigned_route_id = r.id
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
    return [format_row(r) for r in rows]

def get_candidate_by_id(candidate_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, r.number as route_number, r.name as route_name, r.color as route_color
        FROM candidates c
        LEFT JOIN routes r ON c.assigned_route_id = r.id
        WHERE c.id = %s;
    """, (candidate_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return format_row(row) if row else None

def get_candidate_by_telegram_id(telegram_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, r.number as route_number, r.name as route_name, r.color as route_color
        FROM candidates c
        LEFT JOIN routes r ON c.assigned_route_id = r.id
        WHERE c.telegram_id = %s;
    """, (telegram_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return format_row(row) if row else None

def save_candidate(telegram_id: int, name: str, surname: str, phone: str, pending_message_id: Optional[int] = None) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now()
    
    cursor.execute("SELECT id FROM candidates WHERE telegram_id = %s;", (telegram_id,))
    existing = cursor.fetchone()
    
    if existing:
        cursor.execute("""
            UPDATE candidates 
            SET name = %s, surname = %s, phone = %s, status = 'pending', pending_message_id = %s, updated_at = %s
            WHERE telegram_id = %s
            RETURNING id;
        """, (name, surname, phone, pending_message_id, now, telegram_id))
        candidate_id = cursor.fetchone()["id"]
    else:
        cursor.execute("""
            INSERT INTO candidates (telegram_id, name, surname, phone, status, pending_message_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, 'pending', %s, %s, %s)
            RETURNING id;
        """, (telegram_id, name, surname, phone, pending_message_id, now, now))
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
        SELECT c.*, r.number as route_number, r.name as route_name, r.color as route_color
        FROM candidates c
        LEFT JOIN routes r ON c.assigned_route_id = r.id
        WHERE regexp_replace(c.phone, '[^0-9]', '', 'g') = %s 
        OR c.phone = %s;
    """, (clean_phone, phone))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return format_row(row) if row else None

def save_message(
    title: str,
    message: str,
    type: str = "system",
    target_type: str = "all",
    driver_id: Optional[int] = None,
    sender_type: str = "admin"
) -> Dict[str, Any]:
    """Save an admin-sent message to the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO messages (title, message, type, target_type, driver_id, sender_type, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        RETURNING id, title, message, type, target_type, driver_id, sender_type, created_at;
    """, (title, message, type, target_type, driver_id, sender_type))
    row = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return format_row(row)

def get_admin_messages() -> List[Dict[str, Any]]:
    """Get list of messages sent from Admin Panel."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.id, m.title, m.message, m.type, m.target_type, m.driver_id, m.sender_type, m.created_at,
               c.name as driver_name, c.surname as driver_surname, c.phone as driver_phone
        FROM messages m
        LEFT JOIN candidates c ON m.driver_id = c.id
        ORDER BY m.created_at DESC;
    """)
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
        WHERE m.target_type = 'all' OR m.driver_id = %s
        ORDER BY m.created_at DESC;
    """, (driver_id, driver_id))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [format_row(r) for r in rows]

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
             AND dl.updated_at >= NOW() - INTERVAL '3 minutes'
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
             AND dl.updated_at >= NOW() - INTERVAL '3 minutes'
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
    **kwargs
) -> Dict[str, Any]:
    """Create a new route with parsed stops and polyline."""
    processed_stops, processed_polyline = process_stops_and_polyline(stops or [], polyline)
    
    dir_name = direction or name
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO routes (number, name, direction, color, price, stops, polyline, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *;
    """, (
        str(number),
        str(name),
        str(dir_name),
        str(color),
        str(price),
        json.dumps(processed_stops),
        json.dumps(processed_polyline),
        bool(is_active)
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
            stops = %s, polyline = %s, is_active = %s, updated_at = CURRENT_TIMESTAMP
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
    if updated and route_id:
        cursor.execute("""
            UPDATE driver_locations
            SET route_id = %s
            WHERE driver_id = %s;
        """, (route_id, driver_id))
        
    conn.commit()
    cursor.close()
    conn.close()
    return bool(updated)

def update_driver_location(
    driver_id: int,
    latitude: float,
    longitude: float,
    heading: float = 0.0,
    speed: float = 0.0,
    capacity: str = "bosh",
    route_id: Optional[int] = None
) -> Dict[str, Any]:
    """Upsert driver real-time GPS location."""
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
        INSERT INTO driver_locations (driver_id, route_id, latitude, longitude, heading, speed, capacity, is_online, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, true, CURRENT_TIMESTAMP)
        ON CONFLICT (driver_id) DO UPDATE
        SET route_id = COALESCE(EXCLUDED.route_id, driver_locations.route_id),
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            heading = EXCLUDED.heading,
            speed = EXCLUDED.speed,
            capacity = EXCLUDED.capacity,
            is_online = true,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *;
    """, (driver_id, target_route_id, latitude, longitude, heading, speed, capacity))
    row = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return format_row(row)

def set_driver_offline(driver_id: int) -> bool:
    """Mark driver offline in driver_locations."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE driver_locations 
        SET is_online = false, updated_at = CURRENT_TIMESTAMP
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
        SELECT dl.*, c.name, c.surname, c.phone, r.number as route_number, r.name as route_name, r.color as route_color, r.stops as route_stops, r.polyline as route_polyline
        FROM driver_locations dl
        JOIN candidates c ON dl.driver_id = c.id
        LEFT JOIN routes r ON dl.route_id = r.id
        WHERE dl.route_id = %s 
          AND dl.is_online = true 
          AND dl.updated_at >= NOW() - INTERVAL '5 minutes'
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
        SELECT dl.*, c.name, c.surname, c.phone, r.number as route_number, r.name as route_name, r.color as route_color, r.stops as route_stops, r.polyline as route_polyline
        FROM driver_locations dl
        JOIN candidates c ON dl.driver_id = c.id
        LEFT JOIN routes r ON dl.route_id = r.id
        WHERE dl.is_online = true 
          AND dl.updated_at >= NOW() - INTERVAL '5 minutes'
        ORDER BY dl.updated_at DESC;
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [format_row(r) for r in rows]

