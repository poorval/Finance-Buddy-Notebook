from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from database import init_db, get_all_transactions, get_category_totals, get_dashboard_stats, set_storage_context, save_transaction_tool, add_debt_tool, set_user_context, analyze_spending_personality
from agents import process_chat
import os
import logging
import jwt
from fastapi import Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize databases on startup."""
    logger.info("Starting up application and initializing database...")
    from database import set_storage_context
    
    # Init Local
    set_storage_context("local")
    init_db()
    
    # Init Cloud if configured
    if os.getenv("SUPABASE_DB_URL"):
        try:
            logger.info("Initializing Cloud DB connection...")
            set_storage_context("cloud")
            init_db()
            logger.info("Cloud DB initialized.")
        except Exception as e:
            logger.warning(f"Failed to initialize Cloud DB: {e}")
            
    logger.info("Database initialized.")
    yield  # App runs here


app = FastAPI(title="FrugalAgent API", lifespan=lifespan)

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

class StorageModeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        from database import set_storage_context
        # Get mode from header, default to local
        mode = request.headers.get("X-Storage-Mode", "local")
        set_storage_context(mode)
        response = await call_next(request)
        return response

app.add_middleware(StorageModeMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Dependency
security = HTTPBearer(auto_error=False)

async def get_current_user(
    authorization: Optional[str] = Header(None),
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Extracts user_id from Supabase JWT.
    In 'local' mode with no token, defaults to 'local_user'.
    In 'cloud' mode, requires valid token.
    """
    token = None
    if creds:
        token = creds.credentials
    elif authorization and authorization.startswith("Bearer "):
         token = authorization.split(" ")[1]

    # Check mode
    from database import get_storage_mode
    mode = get_storage_mode()

    if not token:
        if mode == "local":
            logger.info("No token provided in local mode. Using default 'local_user'.")
            return "local_user"
        else:
            # Cloud mode requires auth
            raise HTTPException(status_code=401, detail="Authentication required in Cloud mode.")
    
    try:
        # Verify token. 
        # For Supabase, we should ideally verify signature using the JWT secret.
        # But for this MVP/Refactor step, checking the payload 'sub' is the primary goal.
        # We need SUPABASE_JWT_SECRET to verify signature.
        secret = os.getenv("SUPABASE_JWT_SECRET")
        options = {"verify_signature": False} if not secret else {}
        
        payload = jwt.decode(token, secret, algorithms=["HS256"], options=options)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no user_id found")
        
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

class ChatRequest(BaseModel):
    message: str

class ChatAction(BaseModel):
    type: str
    data: dict

class ChatResponse(BaseModel):
    response: str
    actions: List[ChatAction] = []

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {"message": "FrugalAgent API is running"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, req: Request, user_id: str = Depends(get_current_user)):
    logger.info(f"Chat endpoint called by {user_id}. Message: {request.message}")
    set_user_context(user_id)
    storage_mode = req.headers.get("X-Storage-Mode", "local")
    try:
        result = await process_chat(user_id, request.message, storage_mode=storage_mode)
        logger.info(f"Chat processed successfully. Actions: {len(result.get('actions', []))}")
        return {"response": result["response"], "actions": result.get("actions", [])}
    except Exception as e:
        logger.error(f"Error in chat_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/transactions")
def get_transactions_endpoint(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    min_amount: Optional[float] = None,
    user_id: str = Depends(get_current_user)
):
    logger.info(f"Transactions endpoint accessed by {user_id} with filters: start={start_date}, end={end_date}, cat={category}")
    set_user_context(user_id)
    try:
        data = get_all_transactions(start_date, end_date, category, min_amount)
        logger.info(f"Returning {len(data) if data else 0} transactions")
        return data
    except Exception as e:
        logger.error(f"Error in get_transactions_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/personality")
def get_personality_endpoint(user_id: str = Depends(get_current_user)):
    logger.info(f"Personality endpoint accessed by {user_id}")
    set_user_context(user_id)
    try:
        data = analyze_spending_personality()
        return data
    except Exception as e:
        logger.error(f"Error in get_personality_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class BudgetUpdate(BaseModel):
    amount: float

@app.post("/budget")
def update_budget_endpoint(budget: BudgetUpdate, user_id: str = Depends(get_current_user)):
    logger.info(f"Update budget request by {user_id}: {budget.amount}")
    set_user_context(user_id)
    try:
        from database import set_monthly_budget
        result = set_monthly_budget(budget.amount)
        if "ERROR:" in result:
             raise HTTPException(status_code=500, detail=result)
        return {"message": "Budget updated", "amount": budget.amount}
    except Exception as e:
        logger.error(f"Error in update_budget_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class TransactionCreate(BaseModel):
    description: str
    amount: float
    category: str
    split_details: Optional[str] = None

@app.post("/transactions")
def create_transaction_endpoint(transaction: TransactionCreate, user_id: str = Depends(get_current_user)):
    logger.info(f"Create transaction request by {user_id}: {transaction}")
    set_user_context(user_id)
    try:
        # Reuse the existing tool logic which handles validation and insertion
        result = save_transaction_tool(
            description=transaction.description,
            amount=transaction.amount,
            category=transaction.category,
            split_details=transaction.split_details or "None"
        )
        if "ERROR:" in result:
             raise HTTPException(status_code=400, detail=result)
        
        logger.info("Transaction created successfully")
        return {"message": "Transaction saved", "details": result}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in create_transaction_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    timestamp: Optional[str] = None

@app.put("/transactions/{transaction_id}")
def update_transaction_endpoint(transaction_id: int, transaction: TransactionUpdate, user_id: str = Depends(get_current_user)):
    logger.info(f"Update transaction {transaction_id} request by {user_id}: {transaction}")
    set_user_context(user_id)
    try:
        from database import update_transaction
        # filter out None
        data = {k: v for k, v in transaction.dict().items() if v is not None}
        result = update_transaction(transaction_id, data)
        
        if "ERROR:" in result:
             raise HTTPException(status_code=500, detail=result)
        
        return {"message": "Transaction updated"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in update_transaction_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/insights")
def get_insights_endpoint(user_id: str = Depends(get_current_user)):
    logger.info(f"Insights endpoint accessed by {user_id}")
    set_user_context(user_id)
    try:
        data = get_category_totals()
        logger.info("Returning category totals")
        return data
    except Exception as e:
        logger.error(f"Error in get_insights_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
def get_stats_endpoint(user_id: str = Depends(get_current_user)):
    logger.info(f"Stats endpoint accessed by {user_id}")
    set_user_context(user_id)
    try:
        from database import get_dashboard_stats
        data = get_dashboard_stats()
        logger.info("Returning dashboard stats")
        return data
    except Exception as e:
        logger.error(f"Error in get_stats_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/migrate")
def migrate_data(from_mode: str, to_mode: str):
    logger.info(f"Migration requested from {from_mode} to {to_mode}")
    
    # Validation
    if from_mode not in ["local", "cloud"] or to_mode not in ["local", "cloud"]:
        raise HTTPException(status_code=400, detail="Invalid mode")
    
    if from_mode == to_mode:
        return {"message": "Source and target modes are the same. No action needed."}

    from database import set_storage_context, get_all_transactions
    from db_adapters import get_adapter

    try:
        # 1. Read from Source
        set_storage_context(from_mode)
        transactions = get_all_transactions()
        logger.info(f"Read {len(transactions)} transactions from {from_mode}")

        # 2. Write to Target
        set_storage_context(to_mode)
        adapter = get_adapter()
        
        count = 0
        try:
            # Prepare query - compatible with adapter's sanitize
            insert_query = "INSERT INTO transactions (timestamp, description, amount, category, split_details) VALUES (?, ?, ?, ?, ?)"
            
            for t in transactions:
                # t is a dict
                desc = t['description']
                amt = float(t['amount'])
                cat = t['category']
                split = t.get('split_details', "")
                ts = t.get('timestamp')
                
                # Check for existing? (Optional dedupe logic could go here)
                
                adapter.insert(insert_query, (ts, desc, amt, cat, split))
                count += 1
                
        finally:
            adapter.close()
                
        logger.info(f"Migrated {count} transactions to {to_mode}")
        return {"message": f"Successfully migrated {count} transactions.", "count": count}

    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
