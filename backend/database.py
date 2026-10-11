import os
import hashlib
import secrets
from datetime import datetime
from typing import Optional, List, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

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
    if status:
        cursor.execute("SELECT * FROM candidates WHERE status = %s ORDER BY id DESC;", (status,))
    else:
        cursor.execute("SELECT * FROM candidates ORDER BY id DESC;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [format_row(r) for r in rows]

def get_candidate_by_id(candidate_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM candidates WHERE id = %s;", (candidate_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return format_row(row) if row else None

def get_candidate_by_telegram_id(telegram_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM candidates WHERE telegram_id = %s;", (telegram_id,))
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
