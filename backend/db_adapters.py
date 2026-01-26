import sqlite3
import psycopg2
import psycopg2.extras
import os
import re
from typing import List, Dict, Any, Optional, Tuple
from contextvars import ContextVar

# Shared context for storage mode
storage_mode_ctx = ContextVar("storage_mode", default="local")
user_id_ctx = ContextVar("user_id", default="local_user")

def set_storage_context(mode: str):
    storage_mode_ctx.set(mode)

def get_storage_mode() -> str:
    return storage_mode_ctx.get()

def set_user_context(user_id: str):
    user_id_ctx.set(user_id)

def get_user_context() -> str:
    return user_id_ctx.get()

class DBAdapter:
    def connect(self):
        raise NotImplementedError

    def close(self):
        raise NotImplementedError

    def fetch_one(self, query: str, params: tuple = ()) -> Optional[Dict]:
        raise NotImplementedError

    def fetch_all(self, query: str, params: tuple = ()) -> List[Dict]:
        raise NotImplementedError

    def execute(self, query: str, params: tuple = ()) -> int:
        """Executes a query (UPDATE, DELETE) and returns rows affected."""
        raise NotImplementedError

    def insert(self, query: str, params: tuple = ()) -> int:
        """Executes an INSERT and returns the new ID."""
        raise NotImplementedError
        
    def init_schema(self, schema_queries: List[str]):
        """Runs DDL statements."""
        raise NotImplementedError

    def add_column_safe(self, table: str, column_def: str):
        """Adds a column if it doesn't exist."""
        raise NotImplementedError

class SQLiteAdapter(DBAdapter):
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = None

    def connect(self):
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row

    def close(self):
        if self.conn:
            self.conn.close()

    def fetch_one(self, query: str, params: tuple = ()) -> Optional[Dict]:
        c = self.conn.cursor()
        c.execute(query, params)
        row = c.fetchone()
        return dict(row) if row else None

    def fetch_all(self, query: str, params: tuple = ()) -> List[Dict]:
        c = self.conn.cursor()
        c.execute(query, params)
        rows = c.fetchall()
        return [dict(row) for row in rows]

    def execute(self, query: str, params: tuple = ()) -> int:
        c = self.conn.cursor()
        c.execute(query, params)
        self.conn.commit()
        return c.rowcount

    def insert(self, query: str, params: tuple = ()) -> int:
        c = self.conn.cursor()
        c.execute(query, params)
        self.conn.commit()
        return c.lastrowid
        
    def init_schema(self, schema_queries: List[str]):
        c = self.conn.cursor()
        for q in schema_queries:
            # Simple retry/ignore for "already exists" if it's a create table
            try:
                c.execute(q)
            except sqlite3.OperationalError as e:
                # Ignore "table already exists"
                if "already exists" not in str(e):
                    raise
        self.conn.commit()

    def add_column_safe(self, table: str, column_def: str):
        c = self.conn.cursor()
        try:
            # SQLite doesn't support IF NOT EXISTS for columns in older versions,
            # but we can try and catch.
            # Format: ALTER TABLE {table} ADD COLUMN {column_def}
            c.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")
            self.conn.commit()
        except sqlite3.OperationalError as e:
            # Ignore "duplicate column name"
            if "duplicate column" not in str(e).lower():
                raise

class PostgresAdapter(DBAdapter):
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.conn = None

    def connect(self):
        self.conn = psycopg2.connect(self.db_url)

    def close(self):
        if self.conn:
            self.conn.close()

    def _sanitize_query(self, query: str) -> str:
        # Convert ? placeholders to %s
        return query.replace("?", "%s")

    def fetch_one(self, query: str, params: tuple = ()) -> Optional[Dict]:
        c = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        query = self._sanitize_query(query)
        c.execute(query, params)
        row = c.fetchone()
        return dict(row) if row else None

    def fetch_all(self, query: str, params: tuple = ()) -> List[Dict]:
        c = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        query = self._sanitize_query(query)
        c.execute(query, params)
        rows = c.fetchall()
        return [dict(row) for row in rows]

    def execute(self, query: str, params: tuple = ()) -> int:
        c = self.conn.cursor()
        query = self._sanitize_query(query)
        c.execute(query, params)
        self.conn.commit()
        return c.rowcount

    def insert(self, query: str, params: tuple = ()) -> int:
        c = self.conn.cursor()
        query = self._sanitize_query(query)
        
        # Check if RETURNING id is already present (unlikely if generic query)
        if "RETURNING" not in query.upper():
            query += " RETURNING id"
            
        c.execute(query, params)
        self.conn.commit()
        row = c.fetchone()
        # row is a tuple since we used standard cursor
        return row[0] if row else 0

    def init_schema(self, schema_queries: List[str]):
        c = self.conn.cursor()
        for q in schema_queries:
            # Postgres uses SERIAL instead of INTEGER PRIMARY KEY AUTOINCREMENT
            # We replace it with a simple regex or string replace for minimal compatibility
            # Or assume the caller passes dialect-specific queries. 
            # For this simple app, we can do some basic replacement.
            q_pg = q.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
            q_pg = q_pg.replace("?", "%s") # just in case
            try:
                c.execute(q_pg)
            except psycopg2.errors.DuplicateTable:
                self.conn.rollback()
            except Exception as e:
                # Rough check for "already exists"
                if "already exists" in str(e):
                    self.conn.rollback()
                else:
                    raise
        self.conn.commit()

    def add_column_safe(self, table: str, column_def: str):
        c = self.conn.cursor()
        # Postgres: ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column_def}
        # But 'IF NOT EXISTS' is PG 9.6+.
        try:
            c.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column_def}")
            self.conn.commit()
        except Exception:
            self.conn.rollback()
            # fallback
            try:
                c.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")
                self.conn.commit()
            except psycopg2.errors.DuplicateColumn:
                self.conn.rollback()
            except Exception:
                raise

def get_adapter() -> DBAdapter:
    mode = get_storage_mode()
    if mode == "cloud":
        db_url = os.getenv("SUPABASE_DB_URL")
        # Ensure we don't crash if env missing, though meaningful error is better
        if not db_url:
             raise ValueError("SUPABASE_DB_URL not set")
        adapter = PostgresAdapter(db_url)
    else:
        adapter = SQLiteAdapter("expense.db")
    
    adapter.connect()
    return adapter
