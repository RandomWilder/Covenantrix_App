import React, { useEffect } from 'react';
import { Sidebar, Header } from '@/components/layout';
import { ChatInterface, DocumentsView, UploadView } from '@/components/features';
import { useAppState } from '@/hooks/useAppState';

const App: React.FC = () => {
  const { state, setCurrentView, setBackendConnected, setApiKeyConfigured } = useAppState();

  useEffect(() => {
    // Initialize app state with real backend checks
    const initializeApp = async () => {
      try {
        // Check backend connection
        const backendResult = await window.electronAPI.testBackend();
        setBackendConnected(backendResult.success);

        // Check API key status
        const apiKeyResult = await window.electronAPI.checkAPIKeyStatus();
        setApiKeyConfigured(apiKeyResult.success && apiKeyResult.data?.configured);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setBackendConnected(false);
        setApiKeyConfigured(false);
      }
    };

    initializeApp();
    
    // Set up periodic backend connection monitoring
    const connectionInterval = setInterval(async () => {
      try {
        const result = await window.electronAPI.testBackend();
        setBackendConnected(result.success);
      } catch (error) {
        setBackendConnected(false);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(connectionInterval);
  }, [setBackendConnected, setApiKeyConfigured]);

  const getViewTitle = (): string => {
    switch (state.currentView) {
      case 'chat': return 'AI Assistant';
      case 'documents': return 'Document Library';
      case 'upload': return 'Upload Documents';
      case 'analytics': return 'Analytics Dashboard';
      case 'search': return 'Search & Discovery';
      case 'settings': return 'Settings';
      default: return 'Covenantrix';
    }
  };

  const getViewSubtitle = (): string => {
    if (!state.isBackendConnected) {
      return 'Backend connection lost - some features may not work';
    }
    if (!state.isApiKeyConfigured && state.currentView === 'chat') {
      return 'API key required for AI features';
    }
    return 'Professional contract analysis powered by AI';
  };

  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'chat':
        return <ChatInterface />;
      case 'documents':
        return <DocumentsView />;
      case 'upload':
        return <UploadView />;
      case 'analytics':
      case 'search':
      case 'settings':
        return (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">{getViewTitle()}</h3>
              <p>Coming soon</p>
            </div>
          </div>
        );
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <Sidebar 
        activeItem={state.currentView} 
        onItemSelect={setCurrentView} 
      />
      
      <div className="flex-1 flex flex-col">
        <Header 
          title={getViewTitle()}
          subtitle={getViewSubtitle()}
        />
        
        <main className="flex-1 overflow-hidden">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
};

export default App;