import time
from database import get_dashboard_stats, get_category_totals, set_storage_context, set_user_context

def check_perf():
    set_storage_context("local")
    set_user_context("local_user")
    
    print("Checking Dashboard Stats Performance...")
    start = time.time()
    stats = get_dashboard_stats()
    end = time.time()
    print(f"Time taken: {end - start:.4f}s")
    print(stats)
    
    print("\nChecking Category Totals Performance...")
    start = time.time()
    totals = get_category_totals()
    end = time.time()
    print(f"Time taken: {end - start:.4f}s")
    print(f"Categories returned: {len(totals)}")

if __name__ == "__main__":
    check_perf()
