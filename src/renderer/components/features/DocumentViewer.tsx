import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Calendar, 
  HardDrive, 
  Hash, 
  Eye, 
  Trash2, 
  RefreshCw,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { apiClient } from '@/lib/api';

// Type definitions
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

interface DocumentDetails {
  document_id: string;
  status: string;
  filename: string;
  content_summary: string;
  content_length: number;
  created_at: string;
  updated_at: string;
  track_id: string;
  chunks_list: string[];
  chunks_count: number;
  processing_metadata: Record<string, any>;
  full_metadata: Record<string, any>;
  has_full_content: boolean;
  error_msg?: string;
}

interface DocumentViewerProps {
  document: DocumentInfo;
  onClose: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onClose,
  onDelete,
  onRefresh: _onRefresh  // Intentionally unused for now, but kept for future functionality
}) => {
  const [details, setDetails] = useState<DocumentDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load document details on mount
  useEffect(() => {
    loadDocumentDetails();
  }, [document.document_id]);

  // Load detailed document information
  const loadDocumentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getDocumentDetails(document.document_id);
      
      if (response.success && response.data) {
        if (response.data.success) {
          setDetails(response.data.document);
        } else {
          setError(response.data.error || 'Failed to load document details');
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

  // Copy text to clipboard
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Format file size
  const formatFileSize = (sizeMb: number): string => {
    if (sizeMb < 1) {
      return `${Math.round(sizeMb * 1024)} KB`;
    }
    return `${sizeMb.toFixed(2)} MB`;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      completed: 'text-green-700 bg-green-100',
      processing: 'text-yellow-700 bg-yellow-100',
      failed: 'text-red-700 bg-red-100',
      pending: 'text-gray-700 bg-gray-100'
    };
    return colors[status.toLowerCase()] || colors.pending;
  };

  // Handle delete with confirmation
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${document.filename}"? This action cannot be undone.`)) {
      onDelete();
      onClose(); // Close viewer after deletion
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {document.filename}
              </h2>
              <p className="text-sm text-muted-foreground">
                Document Details
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDocumentDetails}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span>Loading document details...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-red-700 mb-2">Failed to Load Details</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">{error}</p>
              <Button onClick={loadDocumentDetails}>
                Try Again
              </Button>
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Filename</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-900">{details.filename}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(details.filename, 'filename')}
                      >
                        {copiedField === 'filename' ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Document ID</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-900 font-mono">{details.document_id}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(details.document_id, 'document_id')}
                      >
                        {copiedField === 'document_id' ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(details.status)}`}>
                        {details.status.charAt(0).toUpperCase() + details.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Document Type</label>
                    <div className="mt-1">
                      <span className="text-sm text-gray-900">
                        {document.document_type.charAt(0).toUpperCase() + document.document_type.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Processing Information */}
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-4">Processing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">File Size</p>
                      <p className="text-sm font-medium">{formatFileSize(document.file_size_mb)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Content Length</p>
                      <p className="text-sm font-medium">{details.content_length.toLocaleString()} chars</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Chunks</p>
                      <p className="text-sm font-medium">{details.chunks_count}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">OCR Used</p>
                      <p className="text-sm font-medium">{document.ocr_used ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Timestamps */}
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-4">Timestamps</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created At</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{formatDate(details.created_at)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Updated At</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{formatDate(details.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Content Summary */}
              {details.content_summary && (
                <Card className="p-4">
                  <h3 className="text-lg font-medium mb-4">Content Summary</h3>
                  <div className="bg-gray-50 rounded-md p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {details.content_summary}
                    </p>
                  </div>
                </Card>
              )}

              {/* Metadata */}
              {(details.full_metadata && Object.keys(details.full_metadata).length > 0) && (
                <Card className="p-4">
                  <h3 className="text-lg font-medium mb-4">Metadata</h3>
                  <div className="bg-gray-50 rounded-md p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto">
                      {JSON.stringify(details.full_metadata, null, 2)}
                    </pre>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No document details available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};