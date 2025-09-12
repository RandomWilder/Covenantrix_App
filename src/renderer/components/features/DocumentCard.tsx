import React from 'react';
import { FileText, Eye, Trash2, Calendar, HardDrive, Hash } from 'lucide-react';
import { Button, Card } from '@/components/ui';

// Type definition matching DocumentsView
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

interface DocumentCardProps {
  document: DocumentInfo;
  onView: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
  onDelete,
  isDeleting = false
}) => {
  // Format file size
  const formatFileSize = (sizeMb: number): string => {
    if (sizeMb < 1) {
      return `${Math.round(sizeMb * 1024)} KB`;
    }
    return `${sizeMb.toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Format document type for display
  const formatDocumentType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  // Get document type color
  const getDocumentTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      contract: 'bg-blue-100 text-blue-800',
      legal: 'bg-purple-100 text-purple-800',
      financial: 'bg-green-100 text-green-800',
      technical: 'bg-orange-100 text-orange-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[type.toLowerCase()] || colors.general;
  };

  // Truncate filename if too long
  const truncateFilename = (filename: string, maxLength: number = 30): string => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split('.').pop() || '';
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - extension.length - 4) + '...';
    return `${truncated}.${extension}`;
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
      {/* Document Icon and Type Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDocumentTypeColor(document.document_type)}`}>
            {formatDocumentType(document.document_type)}
          </span>
        </div>
        
        {document.ocr_used && (
          <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            <span>OCR</span>
          </div>
        )}
      </div>

      {/* Document Title */}
      <div className="mb-3" onClick={onView}>
        <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
          {truncateFilename(document.filename)}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          ID: {document.document_id.substring(0, 12)}...
        </p>
      </div>

      {/* Document Stats */}
      <div className="space-y-2 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            <span>{formatFileSize(document.file_size_mb)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            <span>{document.chunk_count} chunks</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(document.processed_at)}</span>
        </div>

        <div className="text-xs">
          <span>{document.char_count.toLocaleString()} characters</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onView}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </Button>
      </div>
    </Card>
  );
};