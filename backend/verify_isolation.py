import requests
import jwt
import json
import time

BASE_URL = "http://localhost:8000"

def create_dummy_token(user_id):
    # Create a dummy token. Since signature verification is likely off or we don't have the secret,
    # we can try signing with a dummy key. If the backend checks signature with a specific key, this fails.
    # But if verify_signature=False is active (which we suspect), this works.
    payload = {"sub": user_id, "aud": "authenticated", "role": "authenticated"}
    return jwt.encode(payload, "dummy_secret", algorithm="HS256")

def chat(user_id, message):
    token = create_dummy_token(user_id)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {"message": message}
    print(f"\n[User: {user_id}] Sending: {message}")
    try:
        response = requests.post(f"{BASE_URL}/chat", headers=headers, json=data)
        if response.status_code == 200:
            print(f"[User: {user_id}] Response: {response.json().get('response')}")
            return response.json().get('response')
        else:
            print(f"[User: {user_id}] Error {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"Request failed: {e}")
        return None

def main():
    print("--- Starting Isolation Verification ---")
    
    # 1. User A sets context
    chat("user_A", "My name is Alice. Please remember that.")
    
    # 2. User B asks for context (Should NOT know about Alice)
    response_b = chat("user_B", "What is my name?")
    
    if "Alice" in str(response_b):
        print("\n❌ FAIL: User B saw User A's data!")
    else:
        print("\n✅ PASS: User B did not see User A's data.")
        
    # 3. User A asks for context (Should know about Alice)
    response_a = chat("user_A", "What is my name?")
    
    if "Alice" in str(response_a):
        print("\n✅ PASS: User A context retained.")
    else:
        print("\n❌ FAIL: User A context lost!")

if __name__ == "__main__":
    main()
