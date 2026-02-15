import os
from dotenv import load_dotenv
import pathlib
from google.adk.agents import Agent, SequentialAgent
from google.adk.models.lite_llm import LiteLlm # Updated import
from google.adk.tools import google_search, AgentTool
from google.adk.runners import InMemoryRunner
from google.genai import types
from database import (
    save_transaction_tool, 
    add_debt_tool, 
    read_sql_query_tool, 
    record_group_debts,
    execute_sql_update_tool,
    add_category_tool
)
import logging
from typing import Dict

# Configure logging
logger = logging.getLogger(__name__)

# Load .env
env_path = pathlib.Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables.")

# Retry Config
retry_config = types.HttpRetryOptions(
    attempts=5,
    exp_base=7,
    initial_delay=1,
    http_status_codes=[429, 500, 503, 504]
)

# --- SINGLE FLATTENED AGENT ---

orchestrator_agent = Agent(
    name="FinanceAssistant",
    model=LiteLlm(
        model="groq/llama-3.3-70b-versatile", 
        # api_key is handled by os.getenv("GROQ_API_KEY") automatically by LiteLLM usually, 
        # or we might need to pass it if ADK's LiteLlm wrapper requires it explicitly.
        # Based on typical LiteLLM usage, env var is enough. 
        # Let's see if ADK wrapper needs anything specific.
        # The prompt mentioned: model="groq/...", acts as bridge.
    ),
    # ALL tools available to the main agent
    tools=[
        save_transaction_tool, 
        add_debt_tool, 
        read_sql_query_tool, 
        record_group_debts, 
        execute_sql_update_tool, 
        add_category_tool
    ],
    description="An intelligent finance assistant that handles transactions, debts, analysis, and database updates.",
    instruction="""
    Role: Personal Finance Assistant.
    Goal: Help the user manage money by saving transactions, tracking debts, and analyzing spending.
    Currency: Indian Rupees (₹ / INR). Always display amounts in ₹.

    DATABASE SCHEMA:
    - transactions(id INTEGER PK, timestamp TEXT, description TEXT, amount REAL, category TEXT, split_details TEXT, user_id TEXT)
      NOTE: The date/time column is called "timestamp" (format: "YYYY-MM-DD HH:MM:SS"). There is NO column called "date".
    - categories(id INTEGER PK, name TEXT, budget REAL, user_id TEXT)
    - debts(id INTEGER PK, from_person TEXT, to_person TEXT, amount REAL, description TEXT, timestamp TEXT, user_id TEXT)

    Categories: [Groceries, Dining, Transport, Entertainment, Shopping, Bills, Health, Investment, Education, Utilities, Others]

    PROCEDURES:

    1. LOGGING TRANSACTIONS ("Spent ₹50 on groceries")
       - Infer the Category from the description.
       - If unclear, use 'google_search' to check (e.g., "What kind of shop is X?").
       - CALL 'save_transaction_tool' with the correct details.
       - CONFIRM: "Saved: [Description] - [Amount]"

    2. MANAGING DEBTS ("I owe John ₹50", "Split lunch ₹20 with Mary")
       - Use 'record_group_debts' to record split bills.
       - Use 'add_debt_tool' for direct IOU logging if simpler.
       - Use 'read_sql_query_tool' to check "Who owes me?".

    3. SPENDING ANALYSIS ("How much did I spend on food?")
       - Use 'read_sql_query_tool' to run SQL queries on 'transactions' or 'categories' tables.
       - Summarize the result for the user.
    
    4. UPDATES ("Change dining budget to 500", "Update last transaction")
       - Use 'read_sql_query_tool' to find the row first.
       - User 'execute_sql_update_tool' (or 'add_category_tool') to modify.
       - Always confirm exactly what changed.

    GENERAL RULES:
    - Be concise.
    - If a tool fails, explain why.
    - ALWAYS confirm actions (Saved, Updated, etc.).
    """
)

# --- SESSION MANAGER ---

class UserSessionManager:
    def __init__(self, max_history_turns=10):
        self.sessions: Dict[str, InMemoryRunner] = {}
        self.turn_counts: Dict[str, int] = {}
        self.max_history_turns = max_history_turns

    def get_runner(self, user_id: str) -> InMemoryRunner:
        if user_id not in self.sessions:
            logger.info(f"Creating new session for user: {user_id}")
            self._create_runner(user_id)
        
        return self.sessions[user_id]

    def _create_runner(self, user_id: str):
        # Create a fresh runner
        runner = InMemoryRunner(agent=orchestrator_agent)
        self.sessions[user_id] = runner
        self.turn_counts[user_id] = 0

    def increment_turn(self, user_id: str):
        self.turn_counts[user_id] += 1
        current = self.turn_counts[user_id]
        
        # Check for history truncation limit
        if current >= self.max_history_turns:
            logger.info(f"User {user_id} reached {current} turns. Resetting history to save tokens.")
            # For InMemoryRunner, the easiest "reset" is often just recreating it or clearing its history list if accessible.
            # Recreating is safer to ensure clean state.
            self._create_runner(user_id)
            # Optional: You could try to inject a "Summary" here if the runner supported priming, 
            # but for now a hard reset is the requested optimization.

# Global Manager Instance
session_manager = UserSessionManager(max_history_turns=10)

async def process_chat(user_id: str, message: str, storage_mode: str = "cloud") -> dict:
    """
    Process a chat message for a specific user.
    Returns a dict with 'response' (str) and 'actions' (list of dicts).
    When storage_mode is 'local', tool calls like save_transaction are captured
    as actions instead of being executed server-side.
    """
    logger.info(f"Processing chat for user_id={user_id}, storage_mode={storage_mode}")
    
    actions = []
    
    # Get or create runner for this user
    runner = session_manager.get_runner(user_id)
    
    try:
        # Run the agent
        events = await runner.run_debug(message)
        
        # Increment turn count (and potentially reset for next time)
        session_manager.increment_turn(user_id)
        
        # Extract response text and capture tool calls
        last_tool_output = None
        response_text = None

        # First pass: capture all function calls as actions
        for event in events:
            try:
                content = getattr(event, "content", None)
                if not content:
                    continue
                parts = getattr(content, "parts", None)
                if not parts:
                    continue
                for part in parts:
                    func_call = getattr(part, "function_call", None)
                    if func_call:
                        fn_name = getattr(func_call, "name", None)
                        fn_args = getattr(func_call, "args", None)
                        if fn_name and fn_args:
                            # Convert args to plain dict
                            args_dict = dict(fn_args) if fn_args else {}
                            actions.append({
                                "type": fn_name,
                                "data": args_dict
                            })
            except Exception as e:
                logger.error(f"Error capturing function call: {e}")
                continue

        # Second pass (reversed): find the final text response
        for event in reversed(events):
            try:
                # 1. Direct text
                if getattr(event, "text", None):
                    response_text = event.text
                    break
                
                # 2. Content parts
                content = getattr(event, "content", None)
                if content:
                    if isinstance(content, str):
                        response_text = content
                        break
                    
                    parts = getattr(content, "parts", None)
                    if parts:
                        found = False
                        for part in parts:
                            if isinstance(part, str):
                                response_text = part
                                found = True
                                break
                            if getattr(part, "text", None):
                                response_text = part.text
                                found = True
                                break
                                
                            # Fallback for tool outputs if no text found yet
                            func_resp = getattr(part, "function_response", None)
                            if func_resp:
                                resp = getattr(func_resp, "response", None)
                                if resp:
                                    last_tool_output = str(resp)
                        if found:
                            break

            except Exception as e:
                logger.error(f"Error parsing event: {e}")
                continue
        
        if not response_text:
            if last_tool_output:
                response_text = f"(Tool Output): {last_tool_output}"
            else:
                response_text = "I processed that, but I'm not sure what to say. (No text response generated)"

        return {"response": response_text, "actions": actions}

    except Exception as e:
        logger.error(f"Error in process_chat: {e}")
        return {"response": f"Sorry, I encountered an error: {str(e)}", "actions": []}
