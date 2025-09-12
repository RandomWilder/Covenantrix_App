const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Backend communication
  testBackend: () => ipcRenderer.invoke('test-backend'),
  testLLM: (query) => ipcRenderer.invoke('test-llm', query),
  
  // API Key management
  validateAPIKey: (apiKey) => ipcRenderer.invoke('validate-api-key', apiKey),
  checkAPIKeyStatus: () => ipcRenderer.invoke('check-api-key-status'),
  removeAPIKey: () => ipcRenderer.invoke('remove-api-key'),
  
  // Document processing (NEW - minimal)
  uploadDocument: (fileBuffer, fileName) => ipcRenderer.invoke('upload-document', fileBuffer, fileName),
  listDocuments: () => ipcRenderer.invoke('list-documents'),
  getDocumentDetails: (documentId) => ipcRenderer.invoke('get-document-details', documentId),
  deleteDocument: (documentId, force) => ipcRenderer.invoke('delete-document', documentId, force),
  
  // Auto-updater methods
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Listen for updater messages from main process
  onUpdaterMessage: (callback) => {
    ipcRenderer.on('updater-message', (event, data) => callback(data));
  },
  removeUpdaterListener: () => {
    ipcRenderer.removeAllListeners('updater-message');
  },
  
  // Platform info
  platform: process.platform,
  
  // Version info
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome
  }
});

console.log('Preload script loaded');