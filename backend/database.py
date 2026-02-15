import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from collections import defaultdict

# Use the new adapter layer
from db_adapters import get_adapter, set_storage_context, get_storage_mode, get_user_context, set_user_context

# Re-export context helpers so main.py doesn't break
__all__ = [
    'set_storage_context', 'get_storage_mode', 'get_user_context', 'set_user_context',
    'init_db', 
    'read_sql_query_tool', 'execute_sql_update_tool',
    'save_transaction_tool', 'add_debt_tool', 'add_category_tool',
    'get_all_transactions', 'update_transaction', 'get_category_totals', 'get_dashboard_stats',
    'record_group_debts',
    'record_group_debts',
    'analyze_spending_personality'
]

class Transaction(BaseModel):
    id: int
    timestamp: str
    description: str
    amount: float
    category: str
    split_details: Optional[str] = None
    user_id: Optional[str] = None

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
    # Deprecated but kept for compatibility if needed.
    # It returns a raw connection which breaks abstraction.
    # Ideally should not be used.
    # We return the adapter instead, but callers expecting cursor() will fail.
    # Let's fix callers in this file to use adapter directly.
    pass

def init_db():
    adapter = get_adapter()
    try:
        # Schema definition (SQLite dialect primarily, adapter handles basic conversion)
        # Added user_id to tables
        queries = [
            '''CREATE TABLE IF NOT EXISTS transactions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                   timestamp TEXT,
                   description TEXT,
                   amount REAL,
                   category TEXT,
                   split_details TEXT,
                   user_id TEXT)''',
            '''CREATE TABLE IF NOT EXISTS categories
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                   name TEXT UNIQUE,
                   budget REAL,
                   user_id TEXT)''',
            '''CREATE TABLE IF NOT EXISTS debts
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                   debtor TEXT,
                   creditor TEXT,
                   amount REAL,
                   description TEXT,
                   timestamp TEXT,
                   status TEXT,
                   user_id TEXT)''',
            '''CREATE TABLE IF NOT EXISTS user_settings
                 (user_id TEXT PRIMARY KEY,
                   monthly_budget REAL)'''
        ]
        
        adapter.init_schema(queries)
        
        # Migrations for existing databases
        adapter.add_column_safe("transactions", "user_id TEXT")
        adapter.add_column_safe("debts", "user_id TEXT")
        adapter.add_column_safe("categories", "user_id TEXT")
        
        # Seed data (defaults, global for now as user_id will be NULL)
        count_res = adapter.fetch_one("SELECT count(*) as count FROM categories")
        
        count = 0
        if count_res:
            count = list(count_res.values())[0]

        if count == 0:
            defaults = [('Dining', 200), ('Groceries', 300), ('Transport', 100), 
                        ('Entertainment', 150), ('Shopping', 200), ('Bills', 500), ('Others', 100)]
            
            for name, budget in defaults:
                # Seeding globally (user_id=None)
                adapter.execute("INSERT INTO categories (name, budget) VALUES (?, ?)", (name, budget))
                
    finally:
        adapter.close()

def set_monthly_budget(amount: float) -> str:
    adapter = get_adapter()
    user_id = get_user_context()
    try:
        # Upsert
        exists = adapter.fetch_one("SELECT * FROM user_settings WHERE user_id = ?", (user_id,))
        if exists:
            adapter.execute("UPDATE user_settings SET monthly_budget = ? WHERE user_id = ?", (float(amount), user_id))
        else:
            adapter.execute("INSERT INTO user_settings (user_id, monthly_budget) VALUES (?, ?)", (user_id, float(amount)))
        return "SUCCESS"
    except Exception as e:
        return f"ERROR: {str(e)}"
    finally:
        adapter.close()

# --- Tools from Notebook ---

def read_sql_query_tool(query: str) -> str:
    """
    Executes a READ-ONLY SQL query on the expense database.
    """
    try:
        if not query.strip().upper().startswith("SELECT"):
            return "ERROR: Only SELECT queries are allowed."
            
        adapter = get_adapter()
        try:
            results = adapter.fetch_all(query)
            if not results:
                return "No results found."
            return str(results)
        finally:
            adapter.close()
            
    except Exception as e:
        return f"ERROR: Query failed. {str(e)}"

def execute_sql_update_tool(query: str, params: dict={}) -> dict:
    # Restrict users from updating arbitrary rows not owned by them?
    # This tool is raw SQL, so it's dangerous in multi-user mode.
    # For now, we assume the Agent is trusted or we append user_id filter if possible?
    # Parsing SQL to inject user_id is hard.
    # We will log a warning or leave it as "Admin tool".
    # Ideally, we should wrap this to strict logic.
    return {"error": "Raw SQL updates are disabled in multi-user mode for safety."}
    # adapter = get_adapter()
    # try:
    #     rows = adapter.execute(query, params or {})
    #     return {"rows_affected": rows}
    # finally:
    #     adapter.close()

def save_transaction_tool(description: str, amount: str, category: str, split_details: str = "None") -> str:
    try:
        amount_val = float(amount)
    except (ValueError, TypeError):
        return f"ERROR: Invalid amount '{amount}'. Must be a number."
    if amount_val <= 0:
        return "ERROR: Amount must be positive."
    
    if not category or category == "Unknown":
        return "ERROR: Category is missing. Please categorize before saving."

    adapter = get_adapter()
    user_id = get_user_context()
    try:
        # Check budget (Global categories for now, or match schema)
        row = adapter.fetch_one("SELECT budget FROM categories WHERE name = ?", (category,))
        budget_msg = ""
        if row:
            budget = row['budget']
            res = adapter.fetch_one("SELECT SUM(amount) as total FROM transactions WHERE category = ? AND user_id = ?", (category, user_id))
            # res is {'total': 123} or {'total': None}
            spent = 0
            if res:
                 val = list(res.values())[0]
                 spent = val if val else 0
            
            if spent + amount_val > budget:
                budget_msg = f" WARNING: You have exceeded your {category} budget of ₹{budget}!"
        
        # Insert
        insert_query = "INSERT INTO transactions (timestamp, description, amount, category, split_details, user_id) VALUES (?, ?, ?, ?, ?, ?)"
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        trans_id = adapter.insert(insert_query, (current_time, description, amount_val, category, split_details, user_id))
        
        return f"SUCCESS: Transaction #{trans_id} saved. {description} - ₹{amount_val} ({category}).{budget_msg}"

    except Exception as e:
        return f"ERROR: Failed to save transaction. {str(e)}"
    finally:
        adapter.close()

def add_debt_tool(debtor: str, creditor: str, amount: float,
                  description: str, status: str) -> str:
    if amount <= 0:
        return "ERROR: Amount must be positive."

    adapter = get_adapter()
    user_id = get_user_context()
    try:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        adapter.execute(
            "INSERT INTO debts (debtor, creditor, amount, description, status, timestamp, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (debtor.strip(), creditor.strip(), float(amount), description, status, now, user_id)
        )
        return f"SUCCESS: Recorded that {debtor} owes {creditor} {amount} for {description} ({status})."
    except Exception as e:
        return f"ERROR: Failed to record debt. {str(e)}"
    finally:
        adapter.close()

def add_category_tool(name: str, budget: float = 100.0) -> str:
    """
    Creates a new category for the current user.
    
    Args:
        name: Category name (e.g., "Bike Servicing", "Subscriptions")
        budget: Monthly budget for this category (default: 100.0)
    
    Returns:
        SUCCESS or ERROR message
    """
    if not name or not name.strip():
        return "ERROR: Category name is required."
    
    adapter = get_adapter()
    user_id = get_user_context()
    try:
        # Check if category already exists for this user
        existing = adapter.fetch_one(
            "SELECT id FROM categories WHERE name = ? AND (user_id = ? OR user_id IS NULL)",
            (name.strip(), user_id)
        )
        if existing:
            return f"ERROR: Category '{name}' already exists."
        
        adapter.execute(
            "INSERT INTO categories (name, budget, user_id) VALUES (?, ?, ?)",
            (name.strip(), float(budget), user_id)
        )
        return f"SUCCESS: Category '{name}' created with budget ₹{budget}."
    except Exception as e:
        return f"ERROR: Failed to create category. {str(e)}"
    finally:
        adapter.close()

def get_all_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    min_amount: Optional[float] = None
) -> List[Dict]:
    adapter = get_adapter()
    user_id = get_user_context()
    
    query = "SELECT * FROM transactions WHERE user_id = ?"
    params = [user_id]
    
    if start_date:
        query += " AND timestamp >= ?"
        params.append(start_date)
    if end_date:
        query += " AND timestamp <= ?"
        # Check if end_date is just YYYY-MM-DD and append time to make it inclusive
        if len(end_date) == 10:
             params.append(f"{end_date} 23:59:59")
        else:
             params.append(end_date)
    if category and category != "All":
        query += " AND category = ?"
        params.append(category)
    if min_amount is not None:
        query += " AND amount >= ?"
        params.append(min_amount)
        
    query += " ORDER BY id DESC"
    
    try:
        return adapter.fetch_all(query, tuple(params))
    finally:
        adapter.close()

def update_transaction(transaction_id: int, data: Dict[str, Any]) -> str:
    adapter = get_adapter()
    user_id = get_user_context()
    
    # Allowed fields to update
    allowed_fields = {'description', 'amount', 'category', 'timestamp'}
    updates = []
    params = []
    
    for key, value in data.items():
        if key in allowed_fields:
            updates.append(f"{key} = ?")
            params.append(value)
            
    if not updates:
        return "ERROR: No valid fields to update."
        
    query = f"UPDATE transactions SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
    params.append(transaction_id)
    params.append(user_id)
    
    try:
        adapter.execute(query, tuple(params))
        return "SUCCESS"
    except Exception as e:
        return f"ERROR: Failed to update transaction. {str(e)}"
    finally:
        adapter.close()

def analyze_spending_personality() -> Dict[str, str]:
    """
    Analyzes the user's spending habits and returns a personality profile.
    """
    totals = get_category_totals() # Returns [{'category': 'X', 'total': 100}, ...]
    if not totals:
        return {
            "title": "The Blank Slate",
            "emoji": "📝",
            "description": "You haven't spent anything yet! Start tracking to see your persona."
        }
    
    # Sort by spend desc
    totals.sort(key=lambda x: x['total'], reverse=True)
    top_cat = totals[0]['category']
    total_spent = sum(t['total'] for t in totals)
    
    # Simple Heuristics
    if top_cat == "Dining":
        return {
            "title": "The Foodie",
            "emoji": "🍔",
            "description": "You love good food and good times. Your biggest investment is in your taste buds!"
        }
    elif top_cat == "Shopping":
        return {
            "title": "The Shopaholic",
            "emoji": "🛍️",
            "description": "Retail therapy is your go-to. You have great taste, but watch that budget!"
        }
    elif top_cat == "Transport":
        return {
            "title": "The Traveler",
            "emoji": "✈️",
            "description": "Always on the move! Your journey is just as important as the destination."
        }
    elif top_cat == "Entertainment":
        return {
            "title": "The Social Butterfly",
            "emoji": "🦋",
            "description": "You live for the moment. Fun and experiences are your top priority."
        }
    elif top_cat == "Bills":
        return {
            "title": "The Responsible Adult",
            "emoji": "💼",
            "description": "You take care of business first. Your stability is admirable!"
        }
    elif top_cat == "Investments" or top_cat == "Savings": # If these cats existed
         return {
            "title": "The Future Tycoon",
            "emoji": "📈",
            "description": "You're playing the long game. Your future self will thank you."
        }
    
    # fallback
    return {
        "title": "The Balanced Spender",
        "emoji": "⚖️",
        "description": f"You have a diverse spending portfolio, led slightly by {top_cat}."
    }

def get_category_totals() -> List[Dict]:
    adapter = get_adapter()
    user_id = get_user_context()
    try:
        return adapter.fetch_all("SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? GROUP BY category", (user_id,))
    finally:
        adapter.close()

def get_dashboard_stats() -> Dict[str, float]:
    adapter = get_adapter()
    user_id = get_user_context()
    try:
        # 1. Total Spent
        res = adapter.fetch_one("SELECT SUM(amount) as val FROM transactions WHERE user_id = ?", (user_id,))
        total_spent = list(res.values())[0] if res and list(res.values())[0] else 0.0
        
        # 2. Budget
        # Check user settings first
        settings = adapter.fetch_one("SELECT monthly_budget FROM user_settings WHERE user_id = ?", (user_id,))
        if settings and settings['monthly_budget'] is not None:
             total_budget = float(settings['monthly_budget'])
        else:
             # Fallback to category sum
             res = adapter.fetch_one("SELECT SUM(budget) as val FROM categories") # Ideally filter by user too
             # If categories are per user, we should filter. If global, no filter.
             # Current init_db makes global categories.
             # But let's try to sum ONLY if table has user_id or is NULL.
             # For simplicity, fallback to old logic if no setting.
             val = list(res.values())[0] if res else 0.0
             total_budget = val if val else 0.0
        
        # 3. Active Debts
        # debts where user_id is mine. "creditor='Me'" depends on record_group_debts logic.
        # But here valid debts are filtered by user_id of the record owner.
        res = adapter.fetch_one("SELECT SUM(amount) as val FROM debts WHERE creditor = 'Me' AND status = 'unsettled' AND user_id = ?", (user_id,))
        active_debts = list(res.values())[0] if res and list(res.values())[0] else 0.0
        
        return {
            "total_spent": total_spent,
            "budget": total_budget,
            "remaining": total_budget - total_spent,
            "active_debts": active_debts
        }
    finally:
        adapter.close()

def record_group_debts(
    creditors: str,
    debtors: str,
    total_amount: float,
    description: str,
    status: str = "unsettled",
    split_mode: str = "equal",
    fair_shares: str = "",
    paid_shares: str = "",
) -> str:
    # This logic is pure python calculation and calls add_debt_tool.
    # It does not direct DB access, so we can keep the logic largely as is.
    # But for cleaner file, I'll copy the logic.
    
    ME_NAME = "Me"
    
    # 1) Parse lists and normalize "me" -> "Me"
    def normalize_name(n):
        return ME_NAME if n.lower() == "me" else n

    creditor_list = [normalize_name(c.strip()) for c in creditors.split(",") if c.strip()]
    debtor_list = [normalize_name(d.strip()) for d in debtors.split(",") if d.strip()]
    
    # Default to Me as creditor if none specified (common in "split bill" context)
    if not creditor_list:
        creditor_list = [ME_NAME]

    participants = sorted(set(creditor_list + debtor_list))

    if ME_NAME not in participants:
        return "INFO: Me is not part of this transaction; nothing recorded."

    # 2) FAIR SHARE for each participant
    fair = {}

    if split_mode.lower() == "equal":
        per_person = float(total_amount) / len(participants)
        for p in participants:
            fair[p] = per_person
    elif split_mode.lower() == "custom":
        if not fair_shares:
            return "ERROR: fair_shares is required for split_mode='custom'."
        parts = [x.strip() for x in fair_shares.split(",") if x.strip()]
        for part in parts:
            name, val = [x.strip() for x in part.split(":", 1)]
            fair[name] = float(val)
        for p in participants:
            if p not in fair:
                return f"ERROR: No fair share specified for '{p}' in fair_shares."
    else:
        return "ERROR: split_mode must be 'equal' or 'custom'."

    # 3) PAID AMOUNTS
    paid = defaultdict(float)

    if paid_shares:
        parts = [x.strip() for x in paid_shares.split(",") if x.strip()]
        for part in parts:
            name, val = [x.strip() for x in part.split(":", 1)]
            paid[name] = float(val)
    else:
        if split_mode.lower() == "equal":
            # assume equal payment among creditors
            per_creditor_paid = float(total_amount) / len(creditor_list)
            for c in creditor_list:
                paid[c] = per_creditor_paid
        else:
            # custom mode, assume each pays exactly their fair share
            for p in participants:
                paid[p] = fair.get(p, 0.0)

    # 4) NET position for each participant
    net = {}
    for p in participants:
        net[p] = paid[p] - fair.get(p, 0.0)

    net_me = net.get(ME_NAME, 0.0)
    if abs(net_me) < 1e-6:
        return "INFO: Me is already settled; no debts recorded."

    calls_made = 0

    # Case A: Me is creditor (others owe Me)
    if net_me > 0:
        total_owing = sum(-net[p] for p in participants if net[p] < 0)
        if total_owing <= 0:
            return "INFO: No one owes Me after balancing."

        for p in participants:
            if p == ME_NAME:
                continue
            if net[p] < 0:
                share_to_me = net_me * (-net[p] / total_owing)
                if share_to_me > 0.01:
                    add_debt_tool(
                        debtor=p,
                        creditor=ME_NAME,
                        amount=round(share_to_me, 2),
                        description=description,
                        status=status
                    )
                    calls_made += 1

    # Case B: Me is debtor (I owe others)
    else:
        total_credit = sum(net[p] for p in participants if net[p] > 0)
        if total_credit <= 0:
            return "INFO: Me owes no one after balancing."

        for p in participants:
            if p == ME_NAME:
                continue
            if net[p] > 0:
                share_from_me = (-net_me) * (net[p] / total_credit)
                if share_from_me > 0.01:
                    add_debt_tool(
                        debtor=ME_NAME,
                        creditor=p,
                        amount=round(share_from_me, 2),
                        description=description,
                        status=status
                    )
                    calls_made += 1

    return f"SUCCESS: Recorded {calls_made} debt edges involving Me for '{description}'."
