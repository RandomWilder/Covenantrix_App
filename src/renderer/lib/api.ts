// Type definitions matching existing preload.js APIs
declare global {
    interface Window {
      electronAPI: {
        testBackend: () => Promise<{ success: boolean; data?: any; error?: string }>;
        testLLM: (query: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        validateAPIKey: (apiKey: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        checkAPIKeyStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
        removeAPIKey: () => Promise<{ success: boolean; data?: any; error?: string }>;
        uploadDocument: (fileBuffer: ArrayBuffer, fileName: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        listDocuments: () => Promise<{ success: boolean; data?: any; error?: string }>;
        getDocumentDetails: (documentId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        deleteDocument: (documentId: string, force?: boolean) => Promise<{ success: boolean; data?: any; error?: string }>;
        
        // Auto-updater methods (matching preload.js)
        checkForUpdates: () => Promise<{ success: boolean; data?: any; error?: string }>;
        downloadUpdate: () => Promise<{ success: boolean; data?: any; error?: string }>;
        installUpdate: () => Promise<{ success: boolean; data?: any; error?: string }>;
        onUpdaterMessage: (callback: (data: any) => void) => void;
        removeUpdaterListener: () => void;
        
        platform: string;
        versions: {
          node: string;
          electron: string;
          chrome: string;
        };
      };
    }
  }
  
  export class APIClient {
    async testBackend() {
      return window.electronAPI.testBackend();
    }
  
    async sendChatMessage(message: string) {
      return window.electronAPI.testLLM(message);
    }
  
    async validateAPIKey(apiKey: string) {
      return window.electronAPI.validateAPIKey(apiKey);
    }
  
    async checkAPIKeyStatus() {
      return window.electronAPI.checkAPIKeyStatus();
    }
  
    async removeAPIKey() {
      return window.electronAPI.removeAPIKey();
    }
  
    async uploadDocument(file: File) {
      const arrayBuffer = await file.arrayBuffer();
      return window.electronAPI.uploadDocument(arrayBuffer, file.name);
    }

    async listDocuments() {
      return window.electronAPI.listDocuments();
    }

    async getDocumentDetails(documentId: string) {
      return window.electronAPI.getDocumentDetails(documentId);
    }

    async deleteDocument(documentId: string, force?: boolean) {
      return window.electronAPI.deleteDocument(documentId, force);
    }
  }
  
  export const apiClient = new APIClient();