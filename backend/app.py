# Vercel entrypoint — re-exports the FastAPI app from main.py
# This file exists because Vercel auto-detects app.py as the entrypoint.
# Local dev continues to use: uvicorn main:app --reload
from main import app  # noqa: F401
