#!/usr/bin/env python3
"""
Covenantrix Backend - Contract Intelligence Platform
FastAPI backend for document processing and AI analysis
"""

import sys
import os
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
import logging

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
except ImportError as e:
    print(f"Failed to import required packages: {e}")
    print("Please install required packages:")
    print("pip install fastapi uvicorn pydantic")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Covenantrix Backend",
    description="Contract Intelligence Platform Backend",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class QueryRequest(BaseModel):
    query: str
    context: Optional[str] = None

class QueryResponse(BaseModel):
    response: str
    processing_time: float
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    python_version: str
    working_directory: str
    platform: str
    dependencies: Dict[str, str]

# Global state
startup_time = datetime.now()

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Covenantrix Backend starting up...")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Working directory: {os.getcwd()}")
    logger.info(f"Python path: {sys.path}")
    
    # Check if we can import AI dependencies
    ai_status = check_ai_dependencies()
    if ai_status["available"]:
        logger.info("✅ AI dependencies available")
    else:
        logger.warning("⚠️  AI dependencies not available (development mode)")
    
    logger.info("✅ Backend startup complete!")

def check_ai_dependencies() -> Dict[str, Any]:
    """Check if AI/ML dependencies are available"""
    dependencies = {}
    available = True
    
    try:
        import openai
        dependencies["openai"] = openai.__version__
    except ImportError:
        dependencies["openai"] = "not installed"
        available = False
    
    try:
        import anthropic
        dependencies["anthropic"] = anthropic.__version__
    except ImportError:
        dependencies["anthropic"] = "not installed"
        available = False
    
    # Add other dependencies as needed
    dependencies["fastapi"] = "installed"
    dependencies["uvicorn"] = "installed"
    
    return {
        "available": available,
        "dependencies": dependencies
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint - verifies backend is running correctly"""
    
    try:
        ai_deps = check_ai_dependencies()
        
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now().isoformat(),
            python_version=sys.version.split()[0],
            working_directory=os.getcwd(),
            platform=sys.platform,
            dependencies=ai_deps["dependencies"]
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.post("/test-llm", response_model=QueryResponse)
async def test_llm_endpoint(request: QueryRequest):
    """Test endpoint for LLM functionality (mock for now)"""
    
    start_time = datetime.now()
    
    try:
        # Mock AI processing for now
        query = request.query.strip()
        
        if not query:
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Simulate processing time
        await asyncio.sleep(0.5)
        
        # Mock response based on query content
        if "contract" in query.lower():
            response = f"📄 Contract Analysis: I would analyze '{query}' for key clauses, risks, and opportunities. This is a mock response - AI integration coming soon!"
        elif "legal" in query.lower():
            response = f"⚖️ Legal Review: For the query '{query}', I would examine legal implications and compliance issues. Mock response for testing purposes."
        else:
            response = f"🤖 AI Response: Processed your query '{query}'. This is a test response to validate the communication pipeline between Electron and Python backend."
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return QueryResponse(
            response=response,
            processing_time=processing_time,
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LLM test endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint with basic info"""
    uptime = datetime.now() - startup_time
    
    return {
        "message": "Covenantrix Backend API",
        "version": "0.1.0",
        "status": "running",
        "uptime_seconds": uptime.total_seconds(),
        "endpoints": {
            "health": "/health",
            "test_llm": "/test-llm",
            "docs": "/docs"
        }
    }

@app.get("/status")
async def get_status():
    """Detailed status information"""
    ai_deps = check_ai_dependencies()
    uptime = datetime.now() - startup_time
    
    return {
        "backend": {
            "status": "running",
            "uptime_seconds": uptime.total_seconds(),
            "startup_time": startup_time.isoformat()
        },
        "environment": {
            "python_version": sys.version,
            "platform": sys.platform,
            "working_directory": os.getcwd()
        },
        "ai_capabilities": ai_deps,
        "memory_usage": {
            "available": True,
            "details": "Memory tracking not implemented"
        }
    }

if __name__ == "__main__":
    # Configuration
    HOST = "127.0.0.1"
    PORT = 8000
    
    logger.info(f"Starting Covenantrix Backend on {HOST}:{PORT}")
    logger.info(f"API documentation will be available at http://{HOST}:{PORT}/docs")
    
    try:
        uvicorn.run(
            app,
            host=HOST,
            port=PORT,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        logger.info("Backend shutdown requested")
    except Exception as e:
        logger.error(f"Failed to start backend: {e}")
        sys.exit(1)