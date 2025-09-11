import { useState, useEffect } from 'react';


interface UpdateInfo {
  version?: string;
  releaseDate?: string;
  updateSize?: number;
}

interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'not-available';

interface UseAppUpdaterReturn {
  updateStatus: UpdateStatus;
  updateInfo: UpdateInfo | null;
  progress: UpdateProgress | null;
  error: string | null;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

export const useAppUpdater = (): UseAppUpdaterReturn => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdaterMessage = (data: any) => {
      console.log('Update message received:', data);
      
      switch (data.type) {
        case 'checking-for-update':
          setUpdateStatus('checking');
          setError(null);
          break;
          
        case 'update-available':
          setUpdateStatus('available');
          setUpdateInfo(data.info || {});
          setError(null);
          break;
          
        case 'update-not-available':
          setUpdateStatus('not-available');
          setError(null);
          break;
          
        case 'download-progress':
          setUpdateStatus('downloading');
          setProgress(data.progress);
          setError(null);
          break;
          
        case 'update-downloaded':
          setUpdateStatus('downloaded');
          setUpdateInfo(data.info || {});
          setProgress(null);
          setError(null);
          break;
          
        case 'error':
          setUpdateStatus('error');
          setError(data.message || 'Update error occurred');
          break;
          
        default:
          console.warn('Unknown update message type:', data.type);
      }
    };

    // Listen for updater messages from main process
    if (window.electronAPI?.onUpdaterMessage) {
      window.electronAPI.onUpdaterMessage(handleUpdaterMessage);
    }

    return () => {
      if (window.electronAPI?.removeUpdaterListener) {
        window.electronAPI.removeUpdaterListener();
      }
    };
  }, []);

  const checkForUpdates = async (): Promise<void> => {
    try {
      setError(null);
      if (window.electronAPI?.checkForUpdates) {
        const result = await window.electronAPI.checkForUpdates();
        if (!result.success) {
          setError(result.error || 'Failed to check for updates');
          setUpdateStatus('error');
        }
      }
    } catch (err) {
      console.error('Check for updates error:', err);
      setError('Failed to check for updates');
      setUpdateStatus('error');
    }
  };

  const downloadUpdate = async (): Promise<void> => {
    try {
      setError(null);
      if (window.electronAPI?.downloadUpdate) {
        const result = await window.electronAPI.downloadUpdate();
        if (!result.success) {
          setError(result.error || 'Failed to download update');
          setUpdateStatus('error');
        }
      }
    } catch (err) {
      console.error('Download update error:', err);
      setError('Failed to download update');
      setUpdateStatus('error');
    }
  };

  const installUpdate = async (): Promise<void> => {
    try {
      setError(null);
      if (window.electronAPI?.installUpdate) {
        const result = await window.electronAPI.installUpdate();
        if (!result.success) {
          setError(result.error || 'Failed to install update');
          setUpdateStatus('error');
        }
      }
    } catch (err) {
      console.error('Install update error:', err);
      setError('Failed to install update');
      setUpdateStatus('error');
    }
  };

  return {
    updateStatus,
    updateInfo,
    progress,
    error,
    checkForUpdates,
    downloadUpdate,
    installUpdate
  };
};
