import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "yo_lovchi.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE NOT NULL,
            name TEXT NOT NULL,
            surname TEXT NOT NULL,
            phone TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            pending_message_id INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def get_candidates(status: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if status:
        cursor.execute("SELECT * FROM candidates WHERE status = ? ORDER BY id DESC", (status,))
    else:
        cursor.execute("SELECT * FROM candidates ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_candidate_by_id(candidate_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_candidate_by_telegram_id(telegram_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM candidates WHERE telegram_id = ?", (telegram_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def save_candidate(telegram_id: int, name: str, surname: str, phone: str, pending_message_id: Optional[int] = None) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Check if exists
    cursor.execute("SELECT id FROM candidates WHERE telegram_id = ?", (telegram_id,))
    existing = cursor.fetchone()
    
    if existing:
        cursor.execute("""
            UPDATE candidates 
            SET name = ?, surname = ?, phone = ?, status = 'pending', pending_message_id = ?, updated_at = ?
            WHERE telegram_id = ?
        """, (name, surname, phone, pending_message_id, now, telegram_id))
        candidate_id = existing["id"]
    else:
        cursor.execute("""
            INSERT INTO candidates (telegram_id, name, surname, phone, status, pending_message_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
        """, (telegram_id, name, surname, phone, pending_message_id, now, now))
        candidate_id = cursor.lastrowid
        
    conn.commit()
    conn.close()
    return get_candidate_by_id(candidate_id)

def update_candidate_status(candidate_id: int, status: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        UPDATE candidates
        SET status = ?, updated_at = ?
        WHERE id = ?
    """, (status, now, candidate_id))
    conn.commit()
    conn.close()
    return get_candidate_by_id(candidate_id)
