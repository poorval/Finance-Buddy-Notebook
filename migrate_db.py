import sqlite3

DB_FILE = "expense.db"

def migrate():
    print(f"Checking {DB_FILE} schema...")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Check if debts table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='debts'")
    if not c.fetchone():
        print("Debts table does not exist. It will be created by init_db.")
        conn.close()
        return

    # Check columns in debts table
    c.execute("PRAGMA table_info(debts)")
    columns = [row[1] for row in c.fetchall()]
    print(f"Current columns in debts: {columns}")
    
    if "status" not in columns:
        print("Adding 'status' column to debts table...")
        try:
            c.execute("ALTER TABLE debts ADD COLUMN status TEXT DEFAULT 'unsettled'")
            conn.commit()
            print("Column added successfully.")
        except Exception as e:
            print(f"Error adding column: {e}")
    else:
        print("'status' column already exists.")
        
    conn.close()

if __name__ == "__main__":
    migrate()
