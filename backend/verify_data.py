from database import get_adapter, set_storage_context, set_user_context

def verify():
    set_storage_context("local")
    set_user_context("local_user")
    adapter = get_adapter()
    try:
        res = adapter.fetch_one("SELECT COUNT(*) as count FROM transactions WHERE user_id = 'local_user'")
        count = list(res.values())[0]
        print(f"Total transactions for local_user: {count}")
    finally:
        adapter.close()

if __name__ == "__main__":
    verify()
