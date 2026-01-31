import random
import datetime
from database import get_adapter, init_db, set_storage_context, set_user_context

# Constants
CATEGORIES = [
    "Dining", "Groceries", "Transport", "Entertainment", 
    "Shopping", "Bills", "Others", "Health", "Investments"
]
START_DATE = datetime.date(2023, 1, 1)
END_DATE = datetime.date(2025, 12, 31)
NUM_RECORDS = 5500
USER_ID = "local_user"

def random_date(start, end):
    return start + datetime.timedelta(
        days=random.randint(0, (end - start).days)
    )

def generate_transactions():
    print(f"Generating {NUM_RECORDS} dummy transactions...")
    
    set_storage_context("local")
    set_user_context(USER_ID)
    init_db() # Ensure tables exist
    
    adapter = get_adapter()
    
    transactions = []
    
    for i in range(NUM_RECORDS):
        date = random_date(START_DATE, END_DATE)
        timestamp = f"{date} {random.randint(0, 23):02d}:{random.randint(0, 59):02d}:{random.randint(0, 59):02d}"
        category = random.choice(CATEGORIES)
        amount = round(random.uniform(5.0, 500.0), 2)
        description = f"Dummy Transaction {i+1} for {category}"
        
        transactions.append((timestamp, description, amount, category, "None", USER_ID))
        
    print("Inserting records into database...")
    
    # Bulk insert for speed if adapter supports it, but our adapter interface assumes execute/insert one by one or we can do a manual bulk insert query
    # Looking at db_adapters.py (which I haven't fully read but assuming standard SQL)
    # Let's try to batch them to avoid 5000 commits if auto-commit is on, or just loop.
    # SQLite handle many single inserts fine if wrapped in transaction. 
    # The adapter might manage connection per call or global. 
    # Let's use a specialized query if possible, or just loop for simplicity as it's a one-off script.
    
    # Actually, let's peek at db_adapters.py to see if efficient insert is possible or if we should just loop.
    # For now, I'll loop but print progress.
    
    insert_query = "INSERT INTO transactions (timestamp, description, amount, category, split_details, user_id) VALUES (?, ?, ?, ?, ?, ?)"
    
    try:
        # We can reach into the underlying connection if we really need speed, 
        # but let's stick to the abstraction first.
        # If it's too slow, we'll optimize.
        
        batch_size = 500
        for i in range(0, len(transactions), batch_size):
            batch = transactions[i:i+batch_size]
            # It seems our adapter doesn't have executemany exposed directly in the interface I saw in `database.py`.
            # `database.py` only imports specific tools. 
            # I'll rely on the loop.
            for t in batch:
                adapter.execute(insert_query, t)
            print(f"Inserted {min(i+batch_size, NUM_RECORDS)} / {NUM_RECORDS}")
            
        print("Done!")
        
    except Exception as e:
        print(f"Error inserting data: {e}")
    finally:
        adapter.close()

if __name__ == "__main__":
    generate_transactions()
