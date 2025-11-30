import sqlite3
from datetime import datetime
from collections import defaultdict
from database import get_db_connection

def read_sql_query_tool(query: str) -> str:
    """
    Executes a READ-ONLY SQL query on the expense database.
    Useful for answering questions 
    
    To answer budget or transaction related questions, either join transactions.category with categories.name 
    and use SUM(amount) to compute spent and remaining or for transactions use table 'transactions' with columns: id, timestamp,
    description, amount, category, split_details. for example :
    "How much did I spend on food?" or "List recent transactions" or "What is my Dining Budget and how much is left ?".

    To answer debt related questions for example :
    "Whom do I have to pay?" or "Who has to pay me?" or "who settled ?" etc
    query table 'debts' with columns: id, debtor, creditor, amount, description, timestamp, status with appropriate filters 
    on debtor and creditor and status. where for user ALWAYS use 'Me' in creditor or debtor according to question and for status
    use 'unsettled' for open or unsettled debts/transcations and 'settled' for settled debts/transactions
    
    Args: 
        query: A valid SQL SELECT statement.
    """
    try:
        if not query.strip().upper().startswith("SELECT"):
            return "ERROR: Only SELECT queries are allowed."
            
        conn = get_db_connection()
        c = conn.cursor()
        c.execute(query)
        rows = c.fetchall()
        columns = [description[0] for description in c.description]
        conn.close()
        
        if not rows:
            return "No results found."
            
        result = [dict(zip(columns, row)) for row in rows]
        return str(result)
    except Exception as e:
        return f"ERROR: Query failed. {str(e)}"

def execute_sql_update_tool(query: str, params: dict={}) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(query, params or {})
    conn.commit()
    rows_affected = cur.rowcount
    conn.close()
    return {"rows_affected": rows_affected}

def save_transaction_tool(description: str, amount: float, category: str, split_details: str = "None") -> str:
    """
    Saves a validated transaction to the persistent SQLite database.
    
    Args:
        description: What was bought (e.g., "Starbucks Coffee").
        amount: The cost as a float (e.g., 5.50).
        category: The category determined by the Classifier (e.g., "Dining").
        split_details: (Optional) Text describing who owes what (e.g., "Bob owes $2.75").
    
    Returns:
        A success message with the Transaction ID.
    """
    if amount <= 0:
        return "ERROR: Amount must be positive."
    
    if not category or category == "Unknown":
        return "ERROR: Category is missing. Please categorize before saving."

    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Check budget
        c.execute("SELECT budget FROM categories WHERE name = ?", (category,))
        row = c.fetchone()
        budget_msg = ""
        if row:
            budget = row['budget']
            c.execute("SELECT SUM(amount) FROM transactions WHERE category = ?", (category,))
            result = c.fetchone()
            spent = result[0] if result[0] else 0
            if spent + float(amount) > budget:
                budget_msg = f" WARNING: You have exceeded your {category} budget of ${budget}!"
        
        c.execute("INSERT INTO transactions (timestamp, description, amount, category, split_details) VALUES (?, ?, ?, ?, ?)",
                  (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), description, float(amount), category, split_details))
        trans_id = c.lastrowid
        conn.commit()
        conn.close()
        return f"SUCCESS: Transaction #{trans_id} saved. {description} - ${amount} ({category}).{budget_msg}"
    except Exception as e:
            return f"ERROR: Failed to save transaction. {str(e)}"

def add_debt_tool(debtor: str, creditor: str, amount: float,
                  description: str, status: str) -> str:
    """
    Low-level tool: record a SINGLE one-to-one debt row.

    Args:
        debtor: Person who owes money.
        creditor: Person who is owed money.
        amount: Amount owed.
        description: What the debt is for.
        status: "unsettled" or "settled".
    """
    if amount <= 0:
        return "ERROR: Amount must be positive."

    try:
        conn = get_db_connection()
        c = conn.cursor()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        c.execute(
            "INSERT INTO debts (debtor, creditor, amount, description, status, timestamp) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (debtor.strip(), creditor.strip(), float(amount), description, status, now)
        )
        conn.commit()
        conn.close()
        return f"SUCCESS: Recorded that {debtor} owes {creditor} {amount} for {description} ({status})."
    except Exception as e:
        return f"ERROR: Failed to record debt. {str(e)}"

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
    """
    High-level tool: expand group expense into one-to-one debts involving Me.

    Args:
        creditors: Comma-separated people who paid (e.g., "Me" or "Me, John").
        debtors: Comma-separated people who did not pay but consumed
                 (e.g., "John, Sarah, Bob" or "Sarah, Bob, Rafael").
        total_amount: Total bill.
        description: What the expense was for.
        status: "unsettled" or "settled".
        split_mode:
            - "equal": equal fair share among all consumers (creditors + debtors).
            - "custom": use fair_shares string.
        fair_shares:
            - For "custom": per-person FAIR share, e.g.
              "Me:205, John:50, Bob:100, Rafael:70, Sarah:75".
        paid_shares:
            - Optional: who actually paid how much, e.g.
              "Me:300, John:200". If omitted:
              - in "equal" mode, assume equal payment among creditors;
              - in "custom" mode, assume each person paid exactly their fair share.
    
    Behavior:
        - Computes net = paid - fair_share for each participant.
        - Builds debts ONLY where ME_NAME is debtor or creditor.
        - Uses add_debt_tool() to insert each edge.
    """
    ME_NAME = "Me"
    
    # 1) Parse lists
    creditor_list = [c.strip() for c in creditors.split(",") if c.strip()]
    debtor_list = [d.strip() for d in debtors.split(",") if d.strip()]
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
        # fair_shares like "Me:205, John:50, Bob:100, Rafael:70, Sarah:75"
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
        # paid_shares like "Me:300, John:200"
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
                # proportional share of what they owe to Me
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

def analyze_spending_tool(start_date: str, end_date: str, group_by: str = "none", filter_category: str = None, limit: int = 10) -> str:
    """
    Analyzes spending within a date range, optionally grouped and filtered.
    
    Args:
        start_date: Start date in 'YYYY-MM-DD' format.
        end_date: End date in 'YYYY-MM-DD' format.
        group_by: How to group results: "category", "merchant" (uses description), "day", or "none".
        filter_category: Optional category to filter by.
        limit: Max number of results to return (for top spenders etc).
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        query = "SELECT "
        params = [start_date, end_date]
        
        if group_by == "category":
            query += "category, SUM(amount) as total_amount "
        elif group_by == "merchant":
            query += "description as merchant, SUM(amount) as total_amount "
        elif group_by == "day":
            query += "date(timestamp) as day, SUM(amount) as total_amount "
        else:
            query += "* "
            
        query += "FROM transactions WHERE date(timestamp) BETWEEN ? AND ? "
        
        if filter_category:
            query += "AND category = ? "
            params.append(filter_category)
            
        if group_by == "category":
            query += "GROUP BY category ORDER BY total_amount DESC "
        elif group_by == "merchant":
            query += "GROUP BY description ORDER BY total_amount DESC "
        elif group_by == "day":
            query += "GROUP BY date(timestamp) ORDER BY day ASC "
        else:
            query += "ORDER BY amount DESC "
            
        if limit:
            query += f"LIMIT {limit}"
            
        c.execute(query, params)
        rows = c.fetchall()
        columns = [description[0] for description in c.description]
        conn.close()
        
        if not rows:
            return "No transactions found for the given criteria."
            
        result = [dict(zip(columns, row)) for row in rows]
        return str(result)
    except Exception as e:
        return f"ERROR: Analysis failed. {str(e)}"

def get_budget_status_tool(month: str) -> str:
    """
    Checks budget status for a specific month.
    
    Args:
        month: Month in 'YYYY-MM' format.
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Get all categories and budgets
        c.execute("SELECT name, budget FROM categories")
        categories = {row['name']: row['budget'] for row in c.fetchall()}
        
        # Get spending for the month per category
        c.execute("""
            SELECT category, SUM(amount) as spent 
            FROM transactions 
            WHERE strftime('%Y-%m', timestamp) = ? 
            GROUP BY category
        """, (month,))
        
        spending = {row['category']: row['spent'] for row in c.fetchall()}
        conn.close()
        
        status_report = []
        for cat, budget in categories.items():
            spent = spending.get(cat, 0.0)
            remaining = budget - spent
            percent_used = (spent / budget * 100) if budget > 0 else 0
            
            status = "On Track"
            if spent > budget:
                status = "Over Budget"
            elif percent_used > 80:
                status = "Warning"
                
            status_report.append({
                "category": cat,
                "budget": budget,
                "spent": spent,
                "remaining": remaining,
                "percent_used": round(percent_used, 1),
                "status": status
            })
            
        return str(status_report)
    except Exception as e:
        return f"ERROR: Failed to check budget status. {str(e)}"

def compare_spending_tool(current_start: str, current_end: str, previous_start: str, previous_end: str, category: str = None) -> str:
    """
    Compares spending between two time periods.
    
    Args:
        current_start: Start date of current period (YYYY-MM-DD).
        current_end: End date of current period (YYYY-MM-DD).
        previous_start: Start date of previous period (YYYY-MM-DD).
        previous_end: End date of previous period (YYYY-MM-DD).
        category: Optional category to filter by.
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        def get_total(start, end, cat):
            query = "SELECT SUM(amount) FROM transactions WHERE date(timestamp) BETWEEN ? AND ?"
            params = [start, end]
            if cat:
                query += " AND category = ?"
                params.append(cat)
            c.execute(query, params)
            result = c.fetchone()
            return result[0] if result[0] else 0.0
            
        current_total = get_total(current_start, current_end, category)
        previous_total = get_total(previous_start, previous_end, category)
        conn.close()
        
        diff = current_total - previous_total
        percent_change = ((diff / previous_total) * 100) if previous_total > 0 else 0.0
        
        return str({
            "current_period": {"start": current_start, "end": current_end, "total": current_total},
            "previous_period": {"start": previous_start, "end": previous_end, "total": previous_total},
            "difference": diff,
            "percent_change": round(percent_change, 1),
            "verdict": "Higher" if diff > 0 else "Lower" if diff < 0 else "Same"
        })
    except Exception as e:
        return f"ERROR: Comparison failed. {str(e)}"
