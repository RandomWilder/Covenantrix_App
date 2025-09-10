#!/usr/bin/env python3
"""
Covenantrix Backend - Contract Intelligence Platform
FastAPI backend for document processing and AI analysis with LightRAG integration
"""

import sys
import os
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
import logging
import tempfile
import shutil

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from fastapi import FastAPI, HTTPException, UploadFile, File, Form
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
    import aiofiles
except ImportError as e:
    print(f"Failed to import required packages: {e}")
    print("Please install required packages:")
    print("pip install fastapi uvicorn pydantic aiofiles")
    sys.exit(1)

# Import optimized models
try:
    from models.document_models import (
        DocumentUploadRequest, DocumentUploadResponse,
        DocumentQueryRequest, DocumentQueryResponse,
        SystemHealthResponse, QueryMode, DocumentType,
        OCRCostEstimateRequest, OCRCostEstimate,
        DocumentListResponse, DocumentDetailsResponse, DocumentDeleteRequest,
        DocumentDeleteResponse, ResetStorageRequest, ResetStorageResponse
    )
except ImportError as e:
    print(f"Warning: Document models not available: {e}")
    # Fallback basic models for development
    class DocumentUploadResponse(BaseModel):
        success: bool
        document_id: str
        filename: str
        char_count: int
        message: str
    
    class DocumentQueryResponse(BaseModel):
        success: bool
        query: str
        response: str
        mode: str
        processing_time: float
        timestamp: str
        documents_available: int

# Import API Key Manager
try:
    from api_key_manager import APIKeyManager, APIKeyRequest, APIKeyResponse
except ImportError as e:
    print(f"Warning: API Key Manager not available: {e}")
    APIKeyManager = None
    APIKeyRequest = None
    APIKeyResponse = None

# Import LightRAG Integration
try:
    from lightrag_integration.rag_engine import CovenantrixRAGEngine
    from lightrag_integration.document_processor import DocumentProcessor
    LIGHTRAG_AVAILABLE = True
except ImportError as e:
    print(f"Warning: LightRAG integration not available: {e}")
    CovenantrixRAGEngine = None
    DocumentProcessor = None
    LIGHTRAG_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Covenantrix Backend",
    description="Contract Intelligence Platform Backend with LightRAG",
    version="0.5.2"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models for backward compatibility
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

# Initialize components
api_key_manager = APIKeyManager() if APIKeyManager else None
rag_engine = None
document_processor = None

@app.on_event("startup")
async def startup_event():
    global rag_engine, document_processor
    
    logger.info("🚀 Covenantrix Backend starting up...")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Working directory: {os.getcwd()}")
    
    # Check dependencies
    ai_status = check_ai_dependencies()
    if ai_status["available"]:
        logger.info("✅ AI dependencies available")
    else:
        logger.warning("⚠️  AI dependencies not available (development mode)")
    
    # Initialize API Key Manager
    if api_key_manager:
        logger.info("✅ API Key Manager initialized")
    else:
        logger.warning("⚠️  API Key Manager not available")
    
    # Initialize LightRAG components
    if LIGHTRAG_AVAILABLE:
        logger.info("✅ LightRAG components available")
        
        # Initialize document processor
        document_processor = DocumentProcessor()
        
        # Initialize RAG engine if API key is configured
        if api_key_manager and api_key_manager.is_key_configured():
            api_key = api_key_manager.load_api_key()
            if api_key:
                rag_engine = CovenantrixRAGEngine()
                initialization_success = await rag_engine.initialize(api_key)
                if initialization_success:
                    logger.info("✅ LightRAG engine initialized successfully")
                else:
                    logger.warning("⚠️  LightRAG engine initialization failed")
                    rag_engine = None
            else:
                logger.warning("⚠️  API key configured but could not be loaded")
        else:
            logger.info("ℹ️  RAG engine not initialized - API key not configured")
    else:
        logger.warning("⚠️  LightRAG components not available")
    
    logger.info("✅ Backend startup complete!")

async def reinitialize_rag_engine():
    """Reinitialize RAG engine when API key is updated"""
    global rag_engine
    
    if not LIGHTRAG_AVAILABLE:
        logger.warning("⚠️  Cannot reinitialize - LightRAG components not available")
        return False
        
    if not api_key_manager or not api_key_manager.is_key_configured():
        logger.warning("⚠️  Cannot reinitialize - no API key configured")
        rag_engine = None
        return False
        
    try:
        api_key = api_key_manager.load_api_key()
        if not api_key:
            logger.warning("⚠️  Cannot reinitialize - failed to load API key")
            rag_engine = None
            return False
            
        # Create new RAG engine instance
        new_rag_engine = CovenantrixRAGEngine()
        initialization_success = await new_rag_engine.initialize(api_key)
        
        if initialization_success:
            rag_engine = new_rag_engine
            logger.info("✅ RAG engine reinitialized successfully")
            return True
        else:
            logger.warning("⚠️  RAG engine reinitialization failed")
            return False
            
    except Exception as e:
        logger.error(f"❌ RAG engine reinitialization error: {e}")
        return False

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
        from lightrag import LightRAG
        dependencies["lightrag"] = "installed"
    except ImportError:
        dependencies["lightrag"] = "not installed"
        available = False
    
    # Add other dependencies
    dependencies["fastapi"] = "installed"
    dependencies["uvicorn"] = "installed"
    
    return {
        "available": available,
        "dependencies": dependencies
    }

# =====================================
# LIGHTRAG DOCUMENT PROCESSING ENDPOINTS
# =====================================

@app.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document with LightRAG"""
    
    if not document_processor:
        raise HTTPException(status_code=503, detail="Document processor not available")
    
    if not rag_engine or not rag_engine.is_initialized:
        raise HTTPException(status_code=503, detail="RAG engine not initialized - please configure API key first")
    
    try:
        # Validate file type
        if not document_processor.is_supported_format(file.filename):
            supported_formats = list(document_processor.get_supported_formats().keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file format. Supported formats: {', '.join(supported_formats)}"
            )
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            # Save uploaded file
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name
        
        try:
            # Process document
            processing_result = document_processor.process_document_file(temp_file_path)
            
            if not processing_result["success"]:
                raise HTTPException(status_code=400, detail=processing_result["error"])
            
            # Prepare metadata for LightRAG
            metadata = {
                "filename": file.filename,
                "format": processing_result.get("format", "unknown"),
                "document_type": processing_result.get("document_type", "general"),
                "file_metadata": processing_result.get("file_metadata", {}),
                "document_metadata": processing_result.get("document_metadata", {}),
                "processing_stats": processing_result.get("processing_stats", {})
            }
            
            # Index with LightRAG (let LightRAG handle chunking)
            indexing_result = await rag_engine.process_document(
                processing_result["text"],
                file.filename,
                metadata=metadata
            )
            
            if not indexing_result["success"]:
                raise HTTPException(status_code=500, detail=f"Indexing failed: {indexing_result['error']}")
            
            logger.info(f"✅ Document processed successfully: {file.filename}")
            
            return DocumentUploadResponse(
                success=True,
                document_id=file.filename,
                document_type=DocumentType(processing_result.get("document_type", "general")),
                filename=file.filename,
                char_count=processing_result["processing_stats"]["char_count"],
                message=f"Document '{file.filename}' processed and indexed successfully"
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/documents/query", response_model=DocumentQueryResponse)
async def query_documents(request: DocumentQueryRequest):
    """Query indexed documents using LightRAG"""
    
    if not rag_engine or not rag_engine.is_initialized:
        raise HTTPException(status_code=503, detail="RAG engine not initialized - please configure API key first")
    
    try:
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Query documents with specified mode
        result = await rag_engine.query_documents(
            request.query, 
            mode=request.mode.value,  # Convert enum to string
            only_need_context=request.only_need_context
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=f"Query failed: {result['error']}")
        
        logger.info(f"✅ Query processed successfully: '{request.query}'")
        
        return DocumentQueryResponse(
            success=True,
            query=request.query,
            response=result["response"],
            mode=QueryMode(result["mode"]),  # Convert back to enum
            processing_time=result["processing_time"],
            timestamp=result["timestamp"],
            documents_available=result.get("documents_available", 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.get("/documents/status")
async def get_rag_status():
    """Get RAG engine and document processing status"""
    
    try:
        rag_status = {}
        if rag_engine:
            rag_status = await rag_engine.get_health_status()
        else:
            rag_status = {
                "is_initialized": False,
                "working_directory": "Not available",
                "documents_indexed": 0,
                "timestamp": datetime.now()
            }
        
        doc_processor_status = {}
        if document_processor:
            doc_processor_status = {
                "available": True,
                "supported_formats": document_processor.get_supported_formats(),
                "ocr_status": document_processor.get_ocr_status() if hasattr(document_processor, 'get_ocr_status') else {}
            }
        else:
            doc_processor_status = {
                "available": False,
                "supported_formats": {}
            }
        
        return {
            "rag_engine": rag_status,
            "document_processor": doc_processor_status,
            "api_key_configured": api_key_manager.is_key_configured() if api_key_manager else False,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"RAG status check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")


@app.get("/documents/query-modes")
async def get_query_modes():
    """Get available LightRAG query modes with descriptions"""
    
    if not rag_engine:
        return {
            "available": False,
            "message": "RAG engine not initialized"
        }
    
    try:
        modes = await rag_engine.get_available_modes()
        return {
            "available": True,
            "modes": modes,
            "default_mode": "hybrid",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get query modes: {e}")
        return {
            "available": False,
            "error": str(e)
        }


@app.get("/documents/list", response_model=DocumentListResponse)
async def list_documents():
    """List all processed documents with their metadata"""
    
    if not rag_engine or not rag_engine.is_initialized:
        raise HTTPException(status_code=503, detail="RAG engine not initialized - please configure API key first")
    
    try:
        result = await rag_engine.list_documents()
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to list documents"))
        
        # Convert to response model format
        from models.document_models import DocumentInfo
        
        documents = []
        for doc in result["documents"]:
            doc_info = {
                "document_id": doc["document_id"],
                "filename": doc["filename"],
                "document_type": DocumentType.GENERAL,  # Default, could be enhanced
                "document_hash": doc.get("track_id", ""),
                "file_size_mb": round(doc.get("content_length", 0) / 1024 / 1024, 2),
                "char_count": doc.get("content_length", 0),
                "chunk_count": doc.get("chunks_count", 0),
                "processed_at": datetime.fromisoformat(doc["created_at"].replace("Z", "+00:00")) if doc.get("created_at") else datetime.now(),
                "ocr_used": False,
                "metadata_summary": doc.get("metadata", {})
            }
            documents.append(DocumentInfo(**doc_info))
        
        return DocumentListResponse(
            success=True,
            documents=documents,
            total_count=result["total_count"],
            successful_count=result["successful_count"],
            failed_count=result["failed_count"],
            timestamp=result["timestamp"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document listing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Document listing failed: {str(e)}")


@app.get("/documents/{document_id}/details", response_model=DocumentDetailsResponse)
async def get_document_details(document_id: str):
    """Get detailed information about a specific document"""
    
    if not rag_engine or not rag_engine.is_initialized:
        raise HTTPException(status_code=503, detail="RAG engine not initialized - please configure API key first")
    
    try:
        result = await rag_engine.get_document_details(document_id)
        
        if not result["success"]:
            if "not found" in result.get("error", "").lower():
                raise HTTPException(status_code=404, detail=result["error"])
            else:
                raise HTTPException(status_code=500, detail=result.get("error", "Failed to get document details"))
        
        return DocumentDetailsResponse(
            success=True,
            document=result["document"],
            timestamp=result["timestamp"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document details retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Document details retrieval failed: {str(e)}")


@app.delete("/documents/{document_id}", response_model=DocumentDeleteResponse)
async def delete_document(document_id: str, force: bool = False):
    """Delete a specific document from the RAG storage"""
    
    if not rag_engine or not rag_engine.is_initialized:
        raise HTTPException(status_code=503, detail="RAG engine not initialized - please configure API key first")
    
    try:
        result = await rag_engine.delete_document(document_id, force=force)
        
        if not result["success"]:
            if "not found" in result.get("error", "").lower():
                raise HTTPException(status_code=404, detail=result["error"])
            elif "requires force" in result.get("error", "").lower():
                raise HTTPException(status_code=400, detail=result["error"] + " Use ?force=true to proceed.")
            else:
                raise HTTPException(status_code=500, detail=result.get("error", "Failed to delete document"))
        
        logger.info(f"⚠️ Document deleted by user: {document_id}")
        
        return DocumentDeleteResponse(
            success=True,
            document_id=result["document_id"],
            deleted_from=result["deleted_from"],
            message=result["message"],
            warning=result.get("warning"),
            timestamp=result["timestamp"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document deletion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Document deletion failed: {str(e)}")


@app.post("/documents/reset-all", response_model=ResetStorageResponse)
async def reset_all_documents(request: ResetStorageRequest):
    """Reset RAG storage and delete ALL documents"""
    
    if not rag_engine:
        raise HTTPException(status_code=503, detail="RAG engine not available")
    
    if not request.confirm:
        raise HTTPException(
            status_code=400, 
            detail="Reset not confirmed. Set 'confirm': true in request body to delete ALL documents."
        )
    
    try:
        result = await rag_engine.reset_storage(confirm=True)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to reset storage"))
        
        logger.warning("🗑️ ALL DOCUMENTS DELETED - RAG storage reset by user")
        
        return ResetStorageResponse(
            success=True,
            message=result["message"],
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Storage reset failed: {e}")
        raise HTTPException(status_code=500, detail=f"Storage reset failed: {str(e)}")

# =====================================
# API KEY MANAGEMENT ENDPOINTS
# =====================================

@app.post("/api-key/validate", response_model=APIKeyResponse)
async def validate_api_key(request: APIKeyRequest):
    """Validate OpenAI API key"""
    if not api_key_manager:
        raise HTTPException(status_code=503, detail="API Key Manager not available")
    
    start_time = datetime.now()
    
    try:
        if not request.api_key or not request.api_key.strip():
            raise HTTPException(status_code=400, detail="API key cannot be empty")
        
        # Validate the key
        result = await api_key_manager.validate_openai_key(request.api_key.strip())
        
        # If valid, save it and reinitialize RAG engine
        if result.is_valid:
            saved = api_key_manager.save_api_key(request.api_key.strip())
            if not saved:
                logger.warning("API key validation succeeded but saving failed")
            else:
                # Reinitialize RAG engine with new key
                await reinitialize_rag_engine()
        
        processing_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"API key validation completed in {processing_time:.2f}s - Valid: {result.is_valid}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API key validation error: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@app.get("/api-key/status")
async def get_api_key_status():
    """Check if API key is configured"""
    if not api_key_manager:
        raise HTTPException(status_code=503, detail="API Key Manager not available")
    
    try:
        is_configured = api_key_manager.is_key_configured()
        
        # If configured, test if it's still valid
        is_valid = False
        if is_configured:
            stored_key = api_key_manager.load_api_key()
            if stored_key:
                validation_result = await api_key_manager.validate_openai_key(stored_key)
                is_valid = validation_result.is_valid
        
        return {
            "configured": is_configured,
            "valid": is_valid,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"API key status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@app.delete("/api-key")
async def remove_api_key():
    """Remove stored API key"""
    global rag_engine
    
    if not api_key_manager:
        raise HTTPException(status_code=503, detail="API Key Manager not available")
    
    try:
        removed = api_key_manager.remove_api_key()
        if removed:
            # Clear RAG engine when API key is removed
            rag_engine = None
            logger.info("✅ API key removed and RAG engine cleared")
            return {"message": "API key removed successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to remove API key")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API key removal error: {e}")
        raise HTTPException(status_code=500, detail=f"Removal failed: {str(e)}")

# =====================================
# GENERAL ENDPOINTS
# =====================================

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
    """Test endpoint for LLM functionality"""
    
    start_time = datetime.now()
    
    try:
        query = request.query.strip()
        
        if not query:
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # If RAG engine is available, use it for testing
        if rag_engine and rag_engine.is_initialized:
            result = await rag_engine.query_documents(query, mode="hybrid")
            if result["success"]:
                response = result["response"]
            else:
                response = f"RAG Query failed: {result.get('error', 'Unknown error')}"
        else:
            # Fallback mock response for testing
            if "contract" in query.lower():
                response = f"📄 Contract Analysis: I would analyze '{query}' for key clauses, risks, and opportunities. RAG engine needs to be initialized for full functionality."
            elif "legal" in query.lower():
                response = f"⚖️ Legal Review: For the query '{query}', I would examine legal implications and compliance issues. Please configure API key for full analysis."
            else:
                response = f"🤖 AI Response: Processed your query '{query}'. This is a test response to validate the communication pipeline. Configure API key and upload documents for full functionality."
        
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
        "version": "0.5.2",
        "status": "running",
        "uptime_seconds": uptime.total_seconds(),
        "lightrag_available": LIGHTRAG_AVAILABLE,
        "endpoints": {
            "health": "/health",
            "test_llm": "/test-llm",
            "documents_upload": "/documents/upload",
            "documents_query": "/documents/query",
            "documents_status": "/documents/status",
            "documents_query_modes": "/documents/query-modes",
            "api_key_validate": "/api-key/validate",
            "api_key_status": "/api-key/status",
            "api_key_remove": "/api-key",
            "docs": "/docs"
        }
    }

@app.get("/status")
async def get_status():
    """Detailed status information"""
    ai_deps = check_ai_dependencies()
    uptime = datetime.now() - startup_time
    
    rag_info = {
        "available": LIGHTRAG_AVAILABLE,
        "initialized": False,
        "documents_indexed": 0
    }
    
    if rag_engine:
        try:
            health_status = await rag_engine.get_health_status()
            rag_info.update({
                "initialized": health_status.get("is_initialized", False),
                "documents_indexed": health_status.get("documents_indexed", 0),
                "working_directory": health_status.get("working_directory", "")
            })
        except Exception as e:
            rag_info["error"] = str(e)
    
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
        "api_key_manager": {
            "available": api_key_manager is not None,
            "configured": api_key_manager.is_key_configured() if api_key_manager else False
        },
        "lightrag_integration": rag_info,
        "document_processor": {
            "available": document_processor is not None,
            "supported_formats": list(document_processor.get_supported_formats().keys()) if document_processor else []
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