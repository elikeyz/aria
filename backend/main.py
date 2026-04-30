import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from agent import run_assistant_agent
from mcp_server import create_meridian_mcp_server
from schemas import ChatRequest

load_dotenv(override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(name="Backend ApI", version="0.1.0")

# Configure CORS for development and production
cors_origins = [
    "http://localhost:3000",  # Local development
    "http://frontend:3000",  # Docker development
]

# In production, allow same-origin requests (static files served from same domain)
if os.getenv("ENVIRONMENT") == "production":
    cors_origins.append(
        "*"
    )  # Allow all origins in production since we serve frontend from same domain

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": "Invalid request", "errors": exc.errors()},
    )

@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "An unexpected error occurred. Please try again."},
    )

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Backend API!",
        "success": True,
    }

@app.get("/health")
def read_health():
    return {
        "message": "Backend API is healthy!",
        "success": True,
    }

@app.get("/mcp-test")
async def mcp_test():
    try:
        async with create_meridian_mcp_server() as mcp_server:
            tools = await mcp_server.list_tools()

            return {
                "message": "MCP tools retrieved successfully!",
                "success": True,
                "tools": tools,
            }
    except Exception as e:
        logger.exception("Error during MCP test: %s", e)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Failed to retrieve MCP tools. Please try again."},
        )

@app.post("/api/v1/chat")
async def chat_assistant(request: ChatRequest):
    try:
        response = await run_assistant_agent(request.messages)
        return {
            "message": "Agent response generated successfully!",
            "success": True,
            "response": response,
        }
    except Exception as e:
        logger.exception("Error during chat processing: %s", e)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Failed to process chat request. Please try again."},
        )

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
