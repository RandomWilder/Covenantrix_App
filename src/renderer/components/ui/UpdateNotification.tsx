import React from 'react';
import { Download, Loader2, AlertCircle, CheckCircle } from '../icons';
import { Button, Card, CardContent } from '@/components/ui';
import { useAppUpdater } from '@/hooks';
import { clsx } from 'clsx';

export const UpdateNotification: React.FC = () => {
  const { 
    updateStatus, 
    progress, 
    error, 
    downloadUpdate, 
    installUpdate 
  } = useAppUpdater();

  // Don't show notification for these states
  if (updateStatus === 'idle' || updateStatus === 'checking' || updateStatus === 'not-available') {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getNotificationContent = () => {
    switch (updateStatus) {
      case 'available':
        return {
          icon: <Download size={24} className="text-blue-600" />,
          title: 'Update Available',
          message: 'A new version is available. Would you like to download it?',
          actions: (
            <>
              <Button 
                onClick={downloadUpdate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download size={16} className="mr-2" />
                Download Update
              </Button>
              <Button variant="outline">
                Later
              </Button>
            </>
          )
        };

      case 'downloading':
        return {
          icon: <Loader2 size={24} className="text-blue-600 animate-spin" />,
          title: 'Downloading Update',
          message: progress 
            ? `Downloading update... ${formatBytes(progress.transferred)} of ${formatBytes(progress.total)}`
            : 'Downloading update...',
          actions: (
            <>
              {progress && (
                <div className="w-full mb-3">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress.percent)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
              <Button variant="outline">
                Later
              </Button>
            </>
          )
        };

      case 'downloaded':
        return {
          icon: <CheckCircle size={24} className="text-green-600" />,
          title: 'Update Ready',
          message: 'Update has been downloaded and is ready to install. The application will restart to complete the installation.',
          actions: (
            <>
              <Button 
                onClick={installUpdate}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download size={16} className="mr-2" />
                Install & Restart
              </Button>
              <Button variant="outline">
                Later
              </Button>
            </>
          )
        };

      case 'error':
        return {
          icon: <AlertCircle size={24} className="text-red-600" />,
          title: 'Update Error',
          message: error || 'An error occurred while checking for updates.',
          actions: (
            <Button variant="outline">
              Close
            </Button>
          )
        };

      default:
        return null;
    }
  };

  const content = getNotificationContent();
  if (!content) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className={clsx(
        'border-2 shadow-lg animate-in slide-in-from-right-full duration-300',
        updateStatus === 'error' && 'border-red-200 bg-red-50',
        updateStatus === 'available' && 'border-blue-200 bg-blue-50',
        updateStatus === 'downloading' && 'border-blue-200 bg-blue-50',
        updateStatus === 'downloaded' && 'border-green-200 bg-green-50'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {content.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground mb-1">
                {content.title}
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {content.message}
              </p>
              
              <div className="flex flex-col gap-2">
                {content.actions}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
