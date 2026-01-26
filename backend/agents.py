import os
from dotenv import load_dotenv
import pathlib
from google.adk.agents import Agent, SequentialAgent
from google.adk.models.google_llm import Gemini
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

# Configure logging (if not already handled by parent, but good to have local logger)
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

# --- AGENTS ---

# 1. Category Classifier
root_agent = Agent(
    name="CategoryClassifier",
    model=Gemini(
        model="gemini-3-flash-preview",
        api_key=api_key,
        retry_options=retry_config
    ),
    description="An intelligent agent that enriches transaction data.",
    instruction="""
        Role: Transaction Classifier.
        Rules:
        1. Input: Expense string (e.g., "Uber to airport", "Starbucks $5").
        2. Action: If unclear, use 'google_search' to identify business type.
        3. Output: JSON {"category": "...", "description": "..."}
        
        Categories: [Groceries, Dining, Transport, Bills, Shopping, Entertainment, Health, Investment, Others]
        """,
    tools=[google_search],
    output_key="category_found"
)

# 2. Transaction Saver
saver_agent = Agent(
    name="TransactionSaver",
    model=Gemini(
        model="gemini-3-flash-preview",
        api_key=api_key,
        retry_options=retry_config
    ),
    description="The final agent in the pipeline. It commits validated data to the database.",
    instruction="""
        Role: Transaction Gatekeeper.
        Goal: Save transaction using 'save_transaction_tool'.
        Rules:
        1. Input: Description, Amount, Category, Split Details.
        2. Action: Call 'save_transaction_tool' exact parameters.
        3. Output: Report SUCCESS or ERROR exactly as returned by tool.
        4. MANDATORY: You must generate a final response to the user confirming the save, e.g., "Saved: [Description] - $[Amount]".
        """,
    tools=[save_transaction_tool]
)

# 3. Splitwise Manager
splitwise_agent = Agent(
    name="SplitwiseManager",
    model=Gemini(
        model="gemini-3-flash-preview",
        api_key=api_key,
        retry_options=retry_config
    ),
    description="Manages debts and shared expenses between people.",
    instruction="""
        Role: Splitwise Manager for personal debt.
        Goal: Convert group expenses into debts involving 'Me'.
        Tools: 'record_group_debts' (write), 'read_sql_query_tool' (read).
        
        Rules:
        1. Always ensure 'Me' is debtor or creditor.
        2. 'record_group_debts':
           - creditors/debtors: comma-separated names.
           - split_mode: 'equal' or 'custom' (requires fair_shares).
           - Unknown payer defaults to 'Me'.
        3. 'read_sql_query_tool':
           - "Whom do I owe?": SELECT ... FROM debts WHERE debtor='Me' AND status='unsettled'
           - "Who owes me?": SELECT ... FROM debts WHERE creditor='Me' AND status='unsettled'
        """,
    tools=[record_group_debts, read_sql_query_tool]
)

# 4. Update Manager
update_agent = Agent(
    name="UpdateManager",
    model=Gemini(
        model="gemini-3-flash-preview",
        api_key=api_key,
        generation_config={"temperature": 0.2}
    ),
    tools=[read_sql_query_tool, execute_sql_update_tool, add_category_tool],
    description="Updates categories, budgets, transactions, and debts in the database.",
    instruction="""
        Role: Update Manager.
        Goal: Update rows in 'categories', 'transactions', 'debts' OR create new categories.
        
        Procedure:
        1. SEARCH: Use 'read_sql_query_tool' to find target row (by id, date, desc, amount).
        2. CONFIRM: exact row match. If ambiguous, ask user.
        3. CREATE: If user wants new category, use 'add_category_tool'.
        4. UPDATE: Call 'execute_sql_update_tool' with parameterized SQL.
        5. REPORT: Confirm change to user.
        6. MANDATORY: explicitly state what was changed in your final response.
        
        Examples:
        - "Change Dining budget to 5000": UPDATE categories SET budget=5000...
        - "Update latest coffee to 150": Find match -> UPDATE transactions SET amount=150...
        - "Settle debt to John": Find debt -> UPDATE debts SET status='settled'...
        - "Create category Bike Servicing with budget 200": Call add_category_tool("Bike Servicing", 200).
        - "Transfer 'bike servicing' to 'Bike Expenses'": Find transaction -> UPDATE transactions SET category='Bike Expenses'...
        """
)

# 5. Log Expense Pipeline
log_expense_pipeline = SequentialAgent(
    name="LogExpensePipeline",
    description=(
        "Strict pipeline for logging an expense: "
        "1) classify, 2) save transaction"
    ),
    sub_agents=[root_agent, saver_agent],
)

# --- WRAP SUB-AGENTS AS TOOLS ---
log_expense_tool = AgentTool(agent=log_expense_pipeline)
splitwise_tool  = AgentTool(agent=splitwise_agent)
update_tool = AgentTool(agent=update_agent)

# 6. Orchestrator
orchestrator_agent = Agent(
    name="ExpenseOrchestrator",
    model=Gemini(
        model="gemini-3-flash-preview",
        api_key=api_key,
        generation_config={"temperature": 0.4}
    ),
    tools=[log_expense_tool, splitwise_tool, read_sql_query_tool, record_group_debts, update_tool],
    description="Coordinates expense categorization, saving, querying, and debt management for the user.",
    instruction="""
    Role: Chief Financial Coordinator.
    
    Routing Logic:
    1. Log Expenses: Calls 'LogExpensePipeline' for new single expenses.
    2. Spending Questions: Call 'read_sql_query_tool' (SELECT on transactions/categories).
    3. Debts/Splits: Call 'SplitwiseManager' or 'read_sql_query_tool' (on debts). "Whom do I owe?" goes to debts table.
    4. Updates/Creation: Call 'UpdateManager' for changes or NEW categories.

    Style: Short, crisp responses. Use tables for multiple items.
    MANDATORY: Ensure the user ALWAYS gets a confirmation message if an action (Save/Update/Create) was performed.
    """,
)

# --- RUNNER ---
runner = InMemoryRunner(agent=orchestrator_agent, app_name="agents")

async def process_chat(message: str) -> str:
    # run_debug returns a list of events
    events = await runner.run_debug(message)
    
    # Extract text from the last event that has it
    # Extract text from the last event that has it
    # Extract text from the last event that has it
    # Extract text from the last event that has it
    try:
        with open("debug_events.log", "w") as f:
            for i, event in enumerate(events):
                f.write(f"Event {i}: {type(event)} - {str(event)}\n")
    except Exception as e:
        logger.error(f"Failed to write debug log: {e}")

    last_tool_output = None

    for event in reversed(events):
        logger.info(f"Processing event type: {type(event)}")
        try:
            # Check for tool output in event
            # (Adjust based on actual event structure for ToolReturn/ToolOutput)
            # If we see a tool output, capture it as a potential fallback
            # We assume 'parts' might contain it, or 'output' attr.
            # Introspecting event...
            if getattr(event, "output", None):
                 # ToolReturn often has 'output'
                 last_tool_output = str(event.output)
            
            # 1. Direct text attribute
            if getattr(event, "text", None):
                return event.text
            
            # 2. Content object
            content = getattr(event, "content", None)
            if content:
                if isinstance(content, str):
                    return content
                
                parts = getattr(content, "parts", None)
                if parts:
                    for part in parts:
                        if isinstance(part, str):
                            return part
                        if getattr(part, "text", None):
                            return part.text
                        
                        # Check for FunctionResponse
                        func_resp = getattr(part, "function_response", None)
                        if func_resp:
                            # It might be an object or dict.
                            # Based on logs: FunctionResponse(..., response={'result': ...})
                            resp = getattr(func_resp, "response", None)
                            if resp and isinstance(resp, dict):
                                if 'result' in resp:
                                    last_tool_output = str(resp['result'])
                                else:
                                    last_tool_output = str(resp)

                if getattr(content, "text", None):
                   return content.text

            # 3. Parts on the event
            parts = getattr(event, "parts", None)
            if parts:
                for part in parts:
                    # Check if part is text
                    if isinstance(part, str):
                        return part
                    if getattr(part, "text", None):
                         return part.text
                    
                    # Check if part is a Tool Return/Output
                    # This is tricky without exact types, but let's try generic attrs
                    if getattr(part, "output", None):
                        last_tool_output = str(part.output)

        except Exception as e:
            logger.error(f"Error extracting text from event: {e}")
            continue
            
    if last_tool_output:
        logger.info("No agent text found, returning last tool output as fallback.")
        return last_tool_output

    return "No response from agent."
