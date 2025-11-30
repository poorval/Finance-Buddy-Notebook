import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from collections import defaultdict

DB_FILE = "expense.db"

class Transaction(BaseModel):
    id: int
    timestamp: str
    description: str
    amount: float
    category: str
    split_details: Optional[str] = None

class Category(BaseModel):
    id: int
    name: str
    budget: float

class Debt(BaseModel):
    id: int
    debtor: str
    creditor: str
    amount: float
    description: str
    timestamp: str
    status: str

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS transactions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  timestamp TEXT,
                  description TEXT,
                  amount REAL,
                  category TEXT,
                  split_details TEXT)''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS categories
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT UNIQUE,
                  budget REAL)''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS debts
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  debtor TEXT,
                  creditor TEXT,
                  amount REAL,
                  description TEXT,
                  timestamp TEXT,
                  status TEXT)''')
    
    c.execute("SELECT count(*) FROM categories")
    if c.fetchone()[0] == 0:
        defaults = [('Dining', 200), ('Groceries', 300), ('Transport', 100), 
                    ('Entertainment', 150), ('Shopping', 200), ('Bills', 500), ('Others', 100)]
        c.executemany("INSERT INTO categories (name, budget) VALUES (?, ?)", defaults)
        
    conn.commit()
    conn.close()

# --- Helper functions for API ---

def get_all_transactions() -> List[Dict]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM transactions ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_category_totals() -> List[Dict]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT category, SUM(amount) as total FROM transactions GROUP BY category")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]