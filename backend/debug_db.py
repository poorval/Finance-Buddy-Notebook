import sqlite3
import os

DB_PATH = "expense.db"

def run_debug():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    with open("debug_output.txt", "w", encoding="utf-8") as f:
        print("--- User IDs Present ---", file=f)
        cursor.execute("SELECT DISTINCT user_id FROM transactions")
        users = cursor.fetchall()
        for u in users:
            print(f"User: {u['user_id']}", file=f)

        for u in users:
            uid = u['user_id']
            print(f"\n--- Analyzing for User: {uid} ---", file=f)
            
            # 1. Total Sum
            cursor.execute("SELECT SUM(amount) FROM transactions WHERE user_id = ?", (uid,))
            res = cursor.fetchone()
            total = res[0] if res else 0
            print(f"Total Spent (SQL SUM): {total}", file=f)

            # 2. Category Sums
            print("Category Totals:", file=f)
            cursor.execute("SELECT category, SUM(amount) FROM transactions WHERE user_id = ? GROUP BY category", (uid,))
            cats = cursor.fetchall()
            calc_sum = 0
            for c in cats:
                print(f"  {c[0]}: {c[1]}", file=f)
                if c[1]:
                    calc_sum += c[1]
            print(f"Sum of Category Totals: {calc_sum}", file=f)

            # 3. List Transactions
            print("Transactions:", file=f)
            cursor.execute("SELECT id, amount, category, description, typeof(amount) as type FROM transactions WHERE user_id = ?", (uid,))
            rows = cursor.fetchall()
            for r in rows:
                print(f"  #{r['id']}: {r['amount']} ({r['type']}) - {r['category']} - {r['description']}", file=f)

    conn.close()

if __name__ == "__main__":
    run_debug()
