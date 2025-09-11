import React from 'react';
import { FileText } from 'lucide-react';
import { Button, Input } from '@/components/ui';

export const DocumentsView: React.FC = () => {
  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search documents..."
              className="max-w-md"
            />
          </div>
          <Button>Upload Document</Button>
        </div>
      </div>

      <div className="text-center py-12 text-muted-foreground">
        <FileText size={48} className="mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No documents yet</h3>
        <p>Upload your first contract to get started with AI analysis</p>
      </div>
    </div>
  );
};