import { useState, useCallback } from 'react';
import type { ViewMode } from '@/components/layout';

interface AppState {
  currentView: ViewMode;
  isBackendConnected: boolean;
  isApiKeyConfigured: boolean;
  documents: any[];
  chatHistory: any[];
}

export const useAppState = () => {
  const [state, setState] = useState<AppState>({
    currentView: 'chat',
    isBackendConnected: false,
    isApiKeyConfigured: false,
    documents: [],
    chatHistory: []
  });

  const setCurrentView = useCallback((view: ViewMode) => {
    setState(prev => ({ ...prev, currentView: view }));
  }, []);

  const setBackendConnected = useCallback((connected: boolean) => {
    setState(prev => ({ ...prev, isBackendConnected: connected }));
  }, []);

  const setApiKeyConfigured = useCallback((configured: boolean) => {
    setState(prev => ({ ...prev, isApiKeyConfigured: configured }));
  }, []);

  return {
    state,
    setCurrentView,
    setBackendConnected,
    setApiKeyConfigured
  };
};