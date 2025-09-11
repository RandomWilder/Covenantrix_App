import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

export const UploadView: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await window.electronAPI.uploadDocument(arrayBuffer, file.name);

      if (result.success) {
        setUploadStatus('success');
        setStatusMessage(`Successfully uploaded ${file.name}`);
      } else {
        setUploadStatus('error');
        setStatusMessage(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      setStatusMessage('Upload failed: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="h-full p-6 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="border-2 border-dashed border-border rounded-lg p-8">
            <FileText size={32} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Click to select and upload your contracts
            </p>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="mb-4"
            />
            <div className="text-xs text-muted-foreground">
              Supports PDF, DOCX, TXT files
            </div>
          </div>

          {/* Upload Status */}
          {isUploading && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">Uploading...</span>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
              <CheckCircle size={16} />
              <span className="text-sm">{statusMessage}</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mt-4 flex items-center justify-center gap-2 text-red-600">
              <AlertCircle size={16} />
              <span className="text-sm">{statusMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};