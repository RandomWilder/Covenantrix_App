import React, { useState, useEffect } from 'react';
import { Search, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { apiClient } from '@/lib/api';
import { DocumentCard } from './DocumentCard';
import { DocumentViewer } from './DocumentViewer';

// Type definitions based on backend models
interface DocumentInfo {
  document_id: string;
  filename: string;
  document_type: string;
  document_hash: string;
  file_size_mb: number;
  char_count: number;
  chunk_count: number;
  processed_at: string;
  ocr_used: boolean;
  ocr_cost?: number;
  metadata_summary: Record<string, any>;
}

interface DocumentListResponse {
  success: boolean;
  documents: DocumentInfo[];
  total_count: number;
  successful_count: number;
  failed_count: number;
  timestamp: string;
  error?: string;
}

export const DocumentsView: React.FC = () => {
  // State management
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<DocumentInfo | null>(null);
  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Filter documents based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = documents.filter(doc => 
        doc.filename.toLowerCase().includes(query) ||
        doc.document_type.toLowerCase().includes(query) ||
        doc.document_id.toLowerCase().includes(query)
      );
      setFilteredDocuments(filtered);
    }
  }, [documents, searchQuery]);

  // Load documents from backend
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.listDocuments();
      
      if (response.success && response.data) {
        const data = response.data as DocumentListResponse;
        if (data.success) {
          setDocuments(data.documents);
        } else {
          setError(data.error || 'Failed to load documents');
        }
      } else {
        setError(response.error || 'Failed to connect to backend');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle document selection for viewing
  const handleDocumentView = (document: DocumentInfo) => {
    setSelectedDocument(document);
    setViewerOpen(true);
  };

  // Handle document deletion
  const handleDocumentDelete = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteLoading(documentId);
      
      const response = await apiClient.deleteDocument(documentId, true);
      
      if (response.success) {
        // Remove document from state
        setDocuments(prev => prev.filter(doc => doc.document_id !== documentId));
        
        // Close viewer if deleted document was being viewed
        if (selectedDocument?.document_id === documentId) {
          setViewerOpen(false);
          setSelectedDocument(null);
        }
      } else {
        alert(`Failed to delete document: ${response.error}`);
      }
    } catch (err) {
      alert(`Error deleting document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Close document viewer
  const handleCloseViewer = () => {
    setViewerOpen(false);
    setSelectedDocument(null);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading documents...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="h-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Documents</h1>
          <Button onClick={loadDocuments} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-red-700 mb-2">Failed to Load Documents</h3>
          <p className="text-muted-foreground text-center max-w-md">
            {error}
          </p>
          <Button onClick={loadDocuments} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (documents.length === 0) {
    return (
      <div className="h-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Documents</h1>
          <Button onClick={loadDocuments} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="text-center py-12 text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No documents yet</h3>
          <p>Upload your first contract to get started with AI analysis</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="h-full p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Documents</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredDocuments.length} of {documents.length} documents
            </span>
            <Button onClick={loadDocuments} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
      </div>

      {/* Document Grid */}
      {filteredDocuments.length === 0 && searchQuery ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No documents found</h3>
          <p>Try adjusting your search terms</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((document) => (
            <DocumentCard
              key={document.document_id}
              document={document}
              onView={() => handleDocumentView(document)}
              onDelete={() => handleDocumentDelete(document.document_id)}
              isDeleting={deleteLoading === document.document_id}
            />
          ))}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewerOpen && selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={handleCloseViewer}
          onDelete={() => handleDocumentDelete(selectedDocument.document_id)}
          onRefresh={loadDocuments}
        />
      )}
    </div>
  );
};