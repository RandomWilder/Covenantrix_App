"""
Optimized Document Models - Comprehensive Pydantic models for enhanced document processing
Supports LightRAG integration, Google Vision OCR, and advanced query parameters
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
from enum import Enum


class DocumentType(str, Enum):
    """Supported document types for specialized processing"""
    CONTRACT = "contract"
    LEGAL = "legal"
    GENERAL = "general"
    FINANCIAL = "financial"
    TECHNICAL = "technical"


class QueryMode(str, Enum):
    """LightRAG query modes with descriptions"""
    NAIVE = "naive"      # Basic vector similarity search
    LOCAL = "local"      # Entity-focused local search  
    GLOBAL = "global"    # Community-based global search
    HYBRID = "hybrid"    # Combines local and global
    MIX = "mix"         # Integrates knowledge graph and vector retrieval


class OCRProvider(str, Enum):
    """Supported OCR providers"""
    GOOGLE_VISION = "google_vision"
    NONE = "none"


# Request Models
class DocumentUploadRequest(BaseModel):
    """Enhanced request model for document upload with OCR options"""
    filename: str = Field(..., description="Name of the uploaded file")
    document_type: DocumentType = Field(default=DocumentType.GENERAL, description="Type of document for specialized processing")
    enable_ocr: bool = Field(default=True, description="Enable OCR for scanned documents")
    ocr_provider: OCRProvider = Field(default=OCRProvider.GOOGLE_VISION, description="OCR provider to use")
    approve_ocr_cost: bool = Field(default=False, description="User approval for estimated OCR costs")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional document metadata")
    
    @validator('filename')
    def validate_filename(cls, v):
        if not v or not v.strip():
            raise ValueError('Filename cannot be empty')
        return v.strip()


class DocumentQueryRequest(BaseModel):
    """Enhanced request model for document querying with LightRAG parameters"""
    query: str = Field(..., min_length=1, max_length=2000, description="Query string")
    mode: QueryMode = Field(default=QueryMode.HYBRID, description="LightRAG query mode")
    only_need_context: bool = Field(default=False, description="Return only context without LLM generation")
    only_need_prompt: bool = Field(default=False, description="Return only the generated prompt")
    user_prompt: Optional[str] = Field(default=None, description="Custom user prompt for result processing")
    max_tokens: Optional[int] = Field(default=None, ge=1, le=8192, description="Maximum tokens for response")
    document_filter: Optional[Dict[str, Any]] = Field(default=None, description="Filter documents by metadata")
    
    @validator('query')
    def validate_query(cls, v):
        if not v or not v.strip():
            raise ValueError('Query cannot be empty')
        return v.strip()


class OCRCostEstimateRequest(BaseModel):
    """Request model for OCR cost estimation"""
    filename: str = Field(..., description="Name of the file to estimate OCR cost")
    file_size_bytes: Optional[int] = Field(default=None, description="File size in bytes")


class DocumentListRequest(BaseModel):
    """Request model for listing documents with filtering and pagination"""
    document_type: Optional[DocumentType] = Field(default=None, description="Filter by document type")
    date_from: Optional[datetime] = Field(default=None, description="Filter documents from this date")
    date_to: Optional[datetime] = Field(default=None, description="Filter documents to this date")
    search_query: Optional[str] = Field(default=None, description="Search in document metadata")
    page: int = Field(default=1, ge=1, description="Page number for pagination")
    page_size: int = Field(default=10, ge=1, le=100, description="Number of documents per page")
    sort_by: str = Field(default="processed_at", description="Sort field")
    sort_order: Literal["asc", "desc"] = Field(default="desc", description="Sort order")


class RAGConfigRequest(BaseModel):
    """Request model for RAG engine configuration"""
    chunk_token_size: Optional[int] = Field(default=None, ge=100, le=8192, description="Token size for chunking")
    chunk_overlap: Optional[int] = Field(default=None, ge=0, le=1000, description="Overlap between chunks")
    storage_name: Optional[str] = Field(default=None, description="Storage directory name")
    force_reinit: bool = Field(default=False, description="Force reinitialization of RAG engine")


# Response Models
class FileMetadata(BaseModel):
    """File system metadata"""
    filename: str
    file_size: int
    file_size_mb: float
    created_at: str
    modified_at: str
    extension: str
    mime_type: str


class DocumentMetadata(BaseModel):
    """Enhanced document content metadata"""
    document_type: DocumentType
    language: str = "en"
    extracted_entities: Dict[str, List[str]] = Field(default_factory=dict)
    paragraph_count: int = 0
    sentence_count: int = 0
    contains_tables: bool = False
    contains_monetary_amounts: bool = False


class ProcessingStats(BaseModel):
    """Document processing statistics"""
    char_count: int
    word_count: int
    chunk_count: int
    chunking_applied: bool
    processed_at: str
    processing_time_seconds: Optional[float] = None
    ocr_pages_processed: Optional[int] = None
    ocr_cost_incurred: Optional[float] = None


class OCRCostEstimate(BaseModel):
    """OCR cost estimation details"""
    ocr_required: bool
    page_count: Optional[int] = None
    cost_per_page: Optional[float] = None
    estimated_cost: Optional[float] = None
    formatted_cost: Optional[str] = None
    currency: str = "USD"
    provider: OCRProvider = OCRProvider.GOOGLE_VISION
    note: Optional[str] = None
    reason: Optional[str] = None
    error: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    """Enhanced response model for document upload"""
    success: bool
    document_id: str
    filename: str
    document_hash: Optional[str] = None
    document_type: DocumentType
    file_metadata: Optional[FileMetadata] = None
    document_metadata: Optional[DocumentMetadata] = None
    processing_stats: Optional[ProcessingStats] = None
    ocr_cost_estimate: Optional[OCRCostEstimate] = None
    message: str
    error: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.now)


class QueryContext(BaseModel):
    """Context information for query results"""
    total_documents_searched: int
    documents_used_in_response: Optional[int] = None
    query_complexity_score: Optional[float] = None
    confidence_score: Optional[float] = None
    related_entities: List[str] = Field(default_factory=list)
    source_documents: List[str] = Field(default_factory=list)


class DocumentQueryResponse(BaseModel):
    """Enhanced response model for document querying"""
    success: bool
    query: str
    response: str
    mode: QueryMode
    only_need_context: bool = False
    processing_time: Optional[float] = None
    timestamp: Optional[datetime] = None
    documents_available: Optional[int] = None
    query_context: Optional[QueryContext] = None
    error: Optional[str] = None
    attempts: int = 1
    cached_result: bool = False


class DocumentInfo(BaseModel):
    """Document information for listing"""
    document_id: str
    filename: str
    document_type: DocumentType
    document_hash: str
    file_size_mb: float
    char_count: int
    chunk_count: int
    processed_at: datetime
    ocr_used: bool = False
    ocr_cost: Optional[float] = None
    metadata_summary: Dict[str, Any] = Field(default_factory=dict)


class DocumentListResponse(BaseModel):
    """Response model for document listing"""
    success: bool
    documents: List[DocumentInfo]
    total_count: int
    successful_count: int
    failed_count: int
    timestamp: str


class DocumentDetailsResponse(BaseModel):
    """Response model for detailed document information"""
    success: bool
    document: Optional[Dict[str, Any]] = None
    timestamp: str
    error: Optional[str] = None


class DocumentDeleteRequest(BaseModel):
    """Request model for document deletion"""
    document_id: str
    force: bool = Field(default=False, description="Force deletion despite potential impact on shared graph data")


class DocumentDeleteResponse(BaseModel):
    """Response model for document deletion"""
    success: bool
    document_id: Optional[str] = None
    deleted_from: List[str] = Field(default_factory=list)
    message: Optional[str] = None
    warning: Optional[str] = None
    error: Optional[str] = None
    timestamp: str


class ResetStorageRequest(BaseModel):
    """Request model for storage reset"""
    confirm: bool = Field(default=False, description="Confirm that you want to delete ALL documents")


class ResetStorageResponse(BaseModel):
    """Response model for storage reset"""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    timestamp: str


class RAGHealthStatus(BaseModel):
    """RAG engine health status"""
    is_initialized: bool
    working_directory: str
    documents_indexed: int
    api_key_configured: bool
    storage_health: Dict[str, Any] = Field(default_factory=dict)
    supported_query_modes: List[str] = Field(default_factory=list)
    configuration: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime


class OCRStatus(BaseModel):
    """OCR service status"""
    google_vision_available: bool
    ocr_enabled: bool
    api_key_configured: bool
    client_initialized: bool
    supported_image_formats: List[str] = Field(default_factory=list)
    cost_info: Dict[str, Any] = Field(default_factory=dict)


class SystemHealthResponse(BaseModel):
    """Comprehensive system health response"""
    success: bool
    rag_engine: RAGHealthStatus
    ocr_service: OCRStatus
    document_processor: Dict[str, Any] = Field(default_factory=dict)
    supported_formats: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class DocumentDeleteRequest(BaseModel):
    """Request model for document deletion"""
    document_id: str = Field(..., description="Document ID to delete")
    delete_from_storage: bool = Field(default=True, description="Delete from RAG storage")
    confirm_deletion: bool = Field(default=False, description="Confirmation flag for deletion")
    
    @validator('document_id')
    def validate_document_id(cls, v):
        if not v or not v.strip():
            raise ValueError('Document ID cannot be empty')
        return v.strip()


class DocumentDeleteResponse(BaseModel):
    """Response model for document deletion"""
    success: bool
    document_id: str
    message: str
    documents_remaining: Optional[int] = None
    storage_freed_mb: Optional[float] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class BulkDocumentOperation(BaseModel):
    """Base model for bulk document operations"""
    document_ids: List[str] = Field(..., min_items=1, description="List of document IDs")
    confirm_operation: bool = Field(default=False, description="Confirmation flag for bulk operation")
    
    @validator('document_ids')
    def validate_document_ids(cls, v):
        if not v:
            raise ValueError('Document IDs list cannot be empty')
        return [doc_id.strip() for doc_id in v if doc_id.strip()]


class BulkDeleteRequest(BulkDocumentOperation):
    """Request model for bulk document deletion"""
    delete_from_storage: bool = Field(default=True, description="Delete from RAG storage")


class BulkDeleteResponse(BaseModel):
    """Response model for bulk document deletion"""
    success: bool
    total_requested: int
    successful_deletions: int
    failed_deletions: int
    deleted_document_ids: List[str] = Field(default_factory=list)
    failed_document_ids: List[str] = Field(default_factory=list)
    error_details: Dict[str, str] = Field(default_factory=dict)
    storage_freed_mb: Optional[float] = None
    documents_remaining: Optional[int] = None
    message: str
    timestamp: datetime = Field(default_factory=datetime.now)


class StorageStatsResponse(BaseModel):
    """Storage statistics response"""
    success: bool
    total_documents: int
    total_chunks: int
    storage_size_mb: float
    storage_directory: str
    document_types: Dict[DocumentType, int] = Field(default_factory=dict)
    average_document_size_mb: float = 0.0
    largest_document_mb: float = 0.0
    oldest_document: Optional[datetime] = None
    newest_document: Optional[datetime] = None
    total_ocr_cost: Optional[float] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class ConfigUpdateRequest(BaseModel):
    """Request model for configuration updates"""
    api_keys: Optional[Dict[str, str]] = Field(default=None, description="API keys to update")
    rag_config: Optional[RAGConfigRequest] = Field(default=None, description="RAG configuration updates")
    document_processor_config: Optional[Dict[str, Any]] = Field(default=None, description="Document processor settings")
    validate_keys: bool = Field(default=True, description="Validate API keys before saving")


class ConfigUpdateResponse(BaseModel):
    """Response model for configuration updates"""
    success: bool
    updated_configs: List[str] = Field(default_factory=list)
    validation_results: Dict[str, bool] = Field(default_factory=dict)
    restart_required: bool = False
    message: str
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


# Utility Models
class ErrorDetail(BaseModel):
    """Detailed error information"""
    error_code: str
    error_message: str
    error_type: str
    context: Optional[Dict[str, Any]] = None
    suggestion: Optional[str] = None


class APIResponse(BaseModel):
    """Generic API response wrapper"""
    success: bool
    data: Optional[Any] = None
    error: Optional[ErrorDetail] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)


# Backward Compatibility (for existing integrations)
class HealthResponse(BaseModel):
    """Legacy health response model for backward compatibility"""
    status: str
    rag_engine_initialized: bool
    documents_indexed: int
    timestamp: datetime


# Export all models for easy importing
__all__ = [
    # Enums
    "DocumentType", "QueryMode", "OCRProvider",
    
    # Request Models
    "DocumentUploadRequest", "DocumentQueryRequest", "OCRCostEstimateRequest",
    "DocumentListRequest", "RAGConfigRequest", "DocumentDeleteRequest",
    "BulkDeleteRequest", "ConfigUpdateRequest",
    
    # Response Models  
    "DocumentUploadResponse", "DocumentQueryResponse", "DocumentListResponse",
    "SystemHealthResponse", "DocumentDeleteResponse", "BulkDeleteResponse",
    "StorageStatsResponse", "ConfigUpdateResponse",
    
    # Component Models
    "FileMetadata", "DocumentMetadata", "ProcessingStats", "OCRCostEstimate",
    "QueryContext", "DocumentInfo", "RAGHealthStatus", "OCRStatus",
    
    # Document Management Models
    "DocumentListResponse", "DocumentDetailsResponse", "DocumentDeleteRequest", 
    "DocumentDeleteResponse", "ResetStorageRequest", "ResetStorageResponse",
    
    # Utility Models
    "ErrorDetail", "APIResponse", "HealthResponse"
]