"""
Optimized RAG Engine - LightRAG Integration for Covenantrix
Follows LightRAG best practices with proper initialization, storage management, and error handling
"""

import os
import logging
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

try:
    from lightrag import LightRAG, QueryParam
    from lightrag.llm.openai import openai_complete_if_cache, openai_embed
    from lightrag.utils import EmbeddingFunc
    from lightrag.kg.shared_storage import initialize_pipeline_status
except ImportError as e:
    logging.error(f"LightRAG import failed: {e}")
    raise ImportError("Please install lightrag-hku: pip install lightrag-hku")


class CovenantrixRAGEngine:
    """
    Optimized LightRAG wrapper for contract intelligence
    Follows LightRAG best practices with proper storage management
    """
    
    def __init__(self, storage_name: str = "covenantrix_rag", chunk_token_size: int = 1200, chunk_overlap: int = 100):
        """
        Initialize RAG engine with proper storage directory structure
        
        Args:
            storage_name: Name for the storage directory (creates user-specific path)
            chunk_token_size: Token size for document chunking
            chunk_overlap: Overlap size between chunks
        """
        # Setup proper storage directory (user-specific)
        self.user_data_dir = Path.home() / ".covenantrix"
        self.working_dir = self.user_data_dir / storage_name
        self.config_file = self.user_data_dir / "rag_config.json"
        
        # Ensure directories exist
        self.user_data_dir.mkdir(exist_ok=True)
        self.working_dir.mkdir(exist_ok=True)
        
        # Instance variables
        self.rag_instance = None
        self.is_initialized = False
        self.documents_indexed = 0
        self.current_api_key = None
        self.logger = logging.getLogger(__name__)
        
        # Configuration
        self.chunk_token_size = chunk_token_size
        self.chunk_overlap = chunk_overlap
        
        # Supported query modes (from LightRAG documentation)
        self.supported_modes = ["naive", "local", "global", "hybrid", "mix"]
        
        # Storage configuration for LightRAG
        self.storage_config = {
            "kv_storage": "JsonKVStorage",
            "vector_storage": "NanoVectorDBStorage", 
            "graph_storage": "NetworkXStorage",
            "doc_status_storage": "JsonDocStatusStorage"
        }
        
        self.logger.info(f"RAG Engine initialized with working directory: {self.working_dir}")
    
    async def initialize(self, api_key: str, force_reinit: bool = False) -> bool:
        """
        Initialize LightRAG with proper async initialization sequence
        
        Args:
            api_key: OpenAI API key for LLM and embedding functions
            force_reinit: Force reinitialization even if already initialized
            
        Returns:
            bool: True if initialization successful
        """
        try:
            # Check if already initialized with same key
            if self.is_initialized and self.current_api_key == api_key and not force_reinit:
                self.logger.info("RAG engine already initialized with same API key")
                return True
            
            if not api_key or not api_key.strip():
                raise ValueError("API key cannot be empty")
            
            self.logger.info("Initializing LightRAG engine...")
            
            # Store API key for function closures (avoid global env var pollution)
            self.current_api_key = api_key.strip()
            
            # Create LLM function with API key closure
            async def llm_model_func(prompt, system_prompt=None, history_messages=[], **kwargs):
                return await openai_complete_if_cache(
                    "gpt-4o-mini",  # Default model, can be configured
                    prompt,
                    system_prompt=system_prompt,
                    history_messages=history_messages,
                    api_key=self.current_api_key,
                    **kwargs
                )
            
            # Create embedding function with API key closure
            async def embedding_func(texts: List[str]):
                return await openai_embed(
                    texts,
                    model="text-embedding-3-large",  # Recommended by LightRAG docs
                    api_key=self.current_api_key
                )
            
            # Initialize LightRAG instance with proper configuration
            self.rag_instance = LightRAG(
                working_dir=str(self.working_dir),
                llm_model_func=llm_model_func,
                embedding_func=EmbeddingFunc(
                    embedding_dim=3072,  # text-embedding-3-large dimension
                    max_token_size=8192,
                    func=embedding_func
                ),
                # Storage configuration (using defaults for now, can be extended)
                chunk_token_size=self.chunk_token_size,
                chunk_overlap_token_size=self.chunk_overlap
            )
            
            # CRITICAL: Required LightRAG initialization calls
            self.logger.info("Initializing LightRAG storages...")
            await self.rag_instance.initialize_storages()
            
            self.logger.info("Initializing pipeline status...")
            await initialize_pipeline_status()
            
            # Load existing document count
            await self._load_document_count()
            
            # Save configuration
            await self._save_config()
            
            self.is_initialized = True
            self.logger.info("✅ LightRAG engine initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ LightRAG initialization failed: {e}")
            self.is_initialized = False
            self.rag_instance = None
            return False
    
    async def process_document(self, document_content: str, document_id: str, 
                             metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process and index a document with proper error handling
        
        Args:
            document_content: The text content of the document
            document_id: Unique identifier for the document
            metadata: Optional metadata about the document
            
        Returns:
            Dict containing processing results
        """
        if not self.is_initialized or not self.rag_instance:
            return {
                "success": False,
                "error": "RAG engine not initialized",
                "document_id": document_id,
                "timestamp": datetime.now()
            }
        
        if not document_content.strip():
            return {
                "success": False,
                "error": "Document content is empty",
                "document_id": document_id,
                "timestamp": datetime.now()
            }
        
        try:
            start_time = datetime.now()
            
            # Prepare content with metadata if provided
            if metadata:
                content_with_metadata = f"Document ID: {document_id}\n"
                content_with_metadata += f"Metadata: {json.dumps(metadata, default=str)}\n\n"
                content_with_metadata += document_content
            else:
                content_with_metadata = f"Document ID: {document_id}\n\n{document_content}"
            
            self.logger.info(f"📄 Processing document: {document_id}")
            
            # Insert document using LightRAG's insert method
            await asyncio.to_thread(self.rag_instance.insert, content_with_metadata)
            
            # Update document count
            self.documents_indexed += 1
            await self._save_document_count()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            result = {
                "success": True,
                "document_id": document_id,
                "message": f"Document '{document_id}' indexed successfully",
                "char_count": len(document_content),
                "processing_time": processing_time,
                "total_documents": self.documents_indexed,
                "timestamp": datetime.now()
            }
            
            self.logger.info(f"✅ Document processed successfully: {document_id} ({processing_time:.2f}s)")
            return result
            
        except Exception as e:
            self.logger.error(f"❌ Document processing failed for {document_id}: {e}")
            return {
                "success": False,
                "document_id": document_id,
                "error": str(e),
                "timestamp": datetime.now()
            }
    
    async def query_documents(self, query: str, mode: str = "hybrid", 
                            only_need_context: bool = False,
                            max_retries: int = 2) -> Dict[str, Any]:
        """
        Query documents using LightRAG with proper QueryParam and error handling
        
        Args:
            query: The query string
            mode: Query mode (naive, local, global, hybrid, mix)
            only_need_context: If True, only return context without LLM generation
            max_retries: Number of retry attempts
            
        Returns:
            Dict containing query results
        """
        if not self.is_initialized or not self.rag_instance:
            return {
                "success": False,
                "query": query,
                "error": "RAG engine not initialized",
                "timestamp": datetime.now()
            }
        
        if not query.strip():
            return {
                "success": False,
                "query": query,
                "error": "Query cannot be empty",
                "timestamp": datetime.now()
            }
        
        # Validate and normalize mode
        if mode not in self.supported_modes:
            self.logger.warning(f"Invalid mode '{mode}', falling back to 'hybrid'")
            mode = "hybrid"
        
        for attempt in range(max_retries):
            try:
                start_time = datetime.now()
                
                self.logger.info(f"🔍 Querying with mode: {mode} (attempt {attempt + 1})")
                
                # Create proper QueryParam object
                query_param = QueryParam(
                    mode=mode,
                    only_need_context=only_need_context
                )
                
                # Perform query using LightRAG
                response = await asyncio.to_thread(
                    self.rag_instance.query,
                    query,
                    param=query_param
                )
                
                end_time = datetime.now()
                processing_time = (end_time - start_time).total_seconds()
                
                self.logger.info(f"✅ Query processed successfully in {processing_time:.2f}s with mode: {mode}")
                
                return {
                    "success": True,
                    "query": query,
                    "response": response,
                    "mode": mode,
                    "only_need_context": only_need_context,
                    "processing_time": processing_time,
                    "timestamp": end_time,
                    "documents_available": self.documents_indexed,
                    "attempts": attempt + 1
                }
                
            except Exception as e:
                if attempt < max_retries - 1:
                    self.logger.warning(f"⚠️ Query attempt {attempt + 1} failed: {e}")
                    await asyncio.sleep(1 + attempt)  # Progressive backoff
                else:
                    self.logger.error(f"❌ Query failed after {max_retries} attempts: {e}")
                    return {
                        "success": False,
                        "query": query,
                        "mode": mode,
                        "error": str(e),
                        "attempts": max_retries,
                        "timestamp": datetime.now()
                    }
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status of the RAG engine"""
        try:
            storage_health = await self._check_storage_health()
            
            return {
                "is_initialized": self.is_initialized,
                "working_directory": str(self.working_dir),
                "documents_indexed": self.documents_indexed,
                "api_key_configured": self.current_api_key is not None,
                "storage_health": storage_health,
                "supported_query_modes": self.supported_modes,
                "configuration": {
                    "chunk_token_size": self.chunk_token_size,
                    "chunk_overlap": self.chunk_overlap,
                    "storage_config": self.storage_config
                },
                "timestamp": datetime.now()
            }
        except Exception as e:
            return {
                "is_initialized": False,
                "error": str(e),
                "timestamp": datetime.now()
            }
    
    async def get_available_modes(self) -> Dict[str, str]:
        """Get available query modes with descriptions"""
        return {
            "naive": "Basic vector similarity search - fastest, least sophisticated",
            "local": "Entity-focused local search - good for specific details",
            "global": "Community-based global search - good for broad understanding", 
            "hybrid": "Combines local and global - balanced speed and quality",
            "mix": "Integrates knowledge graph and vector retrieval - most comprehensive"
        }
    
    async def reset_storage(self, confirm: bool = False) -> Dict[str, Any]:
        """
        Reset RAG storage (delete all indexed documents)
        
        Args:
            confirm: Must be True to actually perform reset
        """
        if not confirm:
            return {
                "success": False,
                "error": "Reset not confirmed - set confirm=True to proceed"
            }
        
        try:
            if self.working_dir.exists():
                # Stop current instance
                self.is_initialized = False
                self.rag_instance = None
                
                # Remove all files in working directory
                for item in self.working_dir.iterdir():
                    if item.is_file():
                        item.unlink()
                    elif item.is_dir():
                        import shutil
                        shutil.rmtree(item)
                
                # Reset counters
                self.documents_indexed = 0
                self.current_api_key = None
                
                self.logger.info("✅ RAG storage reset successfully")
                return {
                    "success": True,
                    "message": "Storage reset successfully - re-initialization required"
                }
            
            return {
                "success": True,
                "message": "No storage to reset"
            }
            
        except Exception as e:
            self.logger.error(f"❌ Storage reset failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def list_documents(self) -> Dict[str, Any]:
        """
        List all documents in the RAG storage with their metadata
        
        Returns:
            Dict containing document list and metadata
        """
        if not self.is_initialized:
            return {
                "success": False,
                "error": "RAG engine not initialized",
                "documents": []
            }
        
        try:
            documents = []
            
            # Read document status from LightRAG storage
            doc_status_file = self.working_dir / "kv_store_doc_status.json"
            full_docs_file = self.working_dir / "kv_store_full_docs.json"
            
            if doc_status_file.exists():
                with open(doc_status_file, 'r', encoding='utf-8') as f:
                    doc_status_data = json.load(f)
                
                # Read full docs for additional metadata if available
                full_docs_data = {}
                if full_docs_file.exists():
                    try:
                        with open(full_docs_file, 'r', encoding='utf-8') as f:
                            full_docs_data = json.load(f)
                    except Exception as e:
                        self.logger.warning(f"Could not read full docs file: {e}")
                
                for doc_id, doc_info in doc_status_data.items():
                    # Extract metadata from document info
                    doc_entry = {
                        "document_id": doc_id,
                        "status": doc_info.get("status", "unknown"),
                        "filename": doc_info.get("file_path", "unknown"),
                        "content_summary": doc_info.get("content_summary", "")[:200] + "..." if doc_info.get("content_summary") else "",
                        "content_length": doc_info.get("content_length", 0),
                        "created_at": doc_info.get("created_at"),
                        "updated_at": doc_info.get("updated_at"),
                        "track_id": doc_info.get("track_id"),
                        "chunks_count": len(doc_info.get("chunks_list", [])),
                        "error_msg": doc_info.get("error_msg") if doc_info.get("status") == "failed" else None
                    }
                    
                    # Add additional info from full docs if available
                    if doc_id in full_docs_data:
                        full_doc_info = full_docs_data[doc_id]
                        if isinstance(full_doc_info, dict):
                            doc_entry["full_content_available"] = True
                            doc_entry["metadata"] = full_doc_info.get("metadata", {})
                    
                    documents.append(doc_entry)
            
            # Sort by creation date (newest first)
            documents.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            
            return {
                "success": True,
                "documents": documents,
                "total_count": len(documents),
                "successful_count": len([d for d in documents if d["status"] == "completed"]),
                "failed_count": len([d for d in documents if d["status"] == "failed"]),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"❌ Failed to list documents: {e}")
            return {
                "success": False,
                "error": str(e),
                "documents": []
            }
    
    async def get_document_details(self, document_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific document
        
        Args:
            document_id: The document ID to retrieve details for
            
        Returns:
            Dict containing detailed document information
        """
        if not self.is_initialized:
            return {
                "success": False,
                "error": "RAG engine not initialized"
            }
        
        try:
            doc_status_file = self.working_dir / "kv_store_doc_status.json"
            full_docs_file = self.working_dir / "kv_store_full_docs.json"
            
            if not doc_status_file.exists():
                return {
                    "success": False,
                    "error": "No documents found in storage"
                }
            
            with open(doc_status_file, 'r', encoding='utf-8') as f:
                doc_status_data = json.load(f)
            
            if document_id not in doc_status_data:
                return {
                    "success": False,
                    "error": f"Document {document_id} not found"
                }
            
            doc_info = doc_status_data[document_id]
            
            # Get full content if available
            full_content = None
            full_metadata = {}
            if full_docs_file.exists():
                try:
                    with open(full_docs_file, 'r', encoding='utf-8') as f:
                        full_docs_data = json.load(f)
                    
                    if document_id in full_docs_data:
                        full_doc_data = full_docs_data[document_id]
                        if isinstance(full_doc_data, dict):
                            full_content = full_doc_data.get("content", "")
                            full_metadata = full_doc_data.get("metadata", {})
                        else:
                            full_content = str(full_doc_data)
                            
                except Exception as e:
                    self.logger.warning(f"Could not read full content for {document_id}: {e}")
            
            # Prepare detailed response
            details = {
                "document_id": document_id,
                "status": doc_info.get("status", "unknown"),
                "filename": doc_info.get("file_path", "unknown"),
                "content_summary": doc_info.get("content_summary", ""),
                "content_length": doc_info.get("content_length", 0),
                "created_at": doc_info.get("created_at"),
                "updated_at": doc_info.get("updated_at"),
                "track_id": doc_info.get("track_id"),
                "chunks_list": doc_info.get("chunks_list", []),
                "chunks_count": len(doc_info.get("chunks_list", [])),
                "processing_metadata": doc_info.get("metadata", {}),
                "full_metadata": full_metadata,
                "has_full_content": full_content is not None,
                "error_msg": doc_info.get("error_msg") if doc_info.get("status") == "failed" else None
            }
            
            # Only include full content if specifically requested (to avoid large responses)
            # This could be a parameter in the future
            
            return {
                "success": True,
                "document": details,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"❌ Failed to get document details for {document_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def delete_document(self, document_id: str, force: bool = False) -> Dict[str, Any]:
        """
        Delete a specific document from the RAG storage
        WARNING: This is a complex operation that may affect shared entities/relationships
        
        Args:
            document_id: The document ID to delete
            force: If True, proceed with deletion despite warnings
            
        Returns:
            Dict containing deletion result
        """
        if not self.is_initialized:
            return {
                "success": False,
                "error": "RAG engine not initialized"
            }
        
        if not force:
            return {
                "success": False,
                "error": "Document deletion requires force=True due to potential impact on shared graph data",
                "warning": "Deleting documents may break relationships used by other documents. Use force=True to proceed."
            }
        
        try:
            # Check if document exists
            doc_details = await self.get_document_details(document_id)
            if not doc_details["success"]:
                return doc_details
            
            deleted_files = []
            
            # Remove from document status
            doc_status_file = self.working_dir / "kv_store_doc_status.json"
            if doc_status_file.exists():
                with open(doc_status_file, 'r', encoding='utf-8') as f:
                    doc_status_data = json.load(f)
                
                if document_id in doc_status_data:
                    del doc_status_data[document_id]
                    with open(doc_status_file, 'w', encoding='utf-8') as f:
                        json.dump(doc_status_data, f, indent=2, ensure_ascii=False)
                    deleted_files.append("doc_status")
            
            # Remove from full docs
            full_docs_file = self.working_dir / "kv_store_full_docs.json"
            if full_docs_file.exists():
                try:
                    with open(full_docs_file, 'r', encoding='utf-8') as f:
                        full_docs_data = json.load(f)
                    
                    if document_id in full_docs_data:
                        del full_docs_data[document_id]
                        with open(full_docs_file, 'w', encoding='utf-8') as f:
                            json.dump(full_docs_data, f, indent=2, ensure_ascii=False)
                        deleted_files.append("full_docs")
                except Exception as e:
                    self.logger.warning(f"Could not update full docs file: {e}")
            
            # Update document count
            if self.documents_indexed > 0:
                self.documents_indexed -= 1
                await self._save_document_count()
            
            self.logger.info(f"⚠️ Document deleted: {document_id} (force={force})")
            
            return {
                "success": True,
                "document_id": document_id,
                "deleted_from": deleted_files,
                "message": f"Document {document_id} deleted from storage",
                "warning": "Graph entities and relationships may still exist if shared with other documents",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"❌ Failed to delete document {document_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _check_storage_health(self) -> Dict[str, Any]:
        """Check health of storage components"""
        try:
            health = {
                "working_dir_exists": self.working_dir.exists(),
                "working_dir_writable": os.access(self.working_dir, os.W_OK),
                "config_exists": self.config_file.exists(),
                "storage_files": []
            }
            
            if self.working_dir.exists():
                # List storage files
                storage_files = list(self.working_dir.glob("*"))
                health["storage_files"] = [f.name for f in storage_files]
                health["total_storage_files"] = len(storage_files)
                
                # Calculate storage size
                total_size = sum(f.stat().st_size for f in storage_files if f.is_file())
                health["storage_size_mb"] = round(total_size / (1024 * 1024), 2)
            
            return health
            
        except Exception as e:
            return {"error": str(e)}
    
    async def _load_document_count(self):
        """Load document count from persistent storage"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                    self.documents_indexed = config.get('documents_indexed', 0)
        except Exception as e:
            self.logger.warning(f"Could not load document count: {e}")
            self.documents_indexed = 0
    
    async def _save_document_count(self):
        """Save current document count to persistent storage"""
        try:
            config = {}
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
            
            config['documents_indexed'] = self.documents_indexed
            config['last_updated'] = datetime.now().isoformat()
            
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
                
        except Exception as e:
            self.logger.warning(f"Could not save document count: {e}")
    
    async def _save_config(self):
        """Save current configuration"""
        try:
            config = {
                "working_dir": str(self.working_dir),
                "chunk_token_size": self.chunk_token_size,
                "chunk_overlap": self.chunk_overlap,
                "storage_config": self.storage_config,
                "documents_indexed": self.documents_indexed,
                "initialized_at": datetime.now().isoformat()
            }
            
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
                
        except Exception as e:
            self.logger.warning(f"Could not save config: {e}")