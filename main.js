const { app, BrowserWindow, ipcMain, dialog, autoUpdater } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Disable hardware acceleration to fix GPU issues on Windows
app.disableHardwareAcceleration();

const isDev = process.env.NODE_ENV === 'development';
let pythonProcess = null;
let mainWindow = null;

// Configuration
const PYTHON_PORT = 8000;
const PYTHON_HOST = '127.0.0.1';
const MAX_STARTUP_TIME = 30000; // 30 seconds max startup time

class PythonBackend {
  constructor() {
    this.process = null;
    this.isReady = false;
    this.startupPromise = null;
  }

  getPythonPath() {
    if (isDev) {
      console.log('Development mode: using system Python');
      return process.platform === 'win32' ? 'python' : 'python3';
    }

    // Production mode: use bundled Python
    const platform = process.platform;
    let pythonExe;
    
    if (platform === 'win32') {
      pythonExe = 'python.exe';
    } else if (platform === 'darwin') {
      pythonExe = 'bin/python';
    } else {
      pythonExe = 'bin/python';
    }

    const pythonPath = path.join(process.resourcesPath, 'python-dist', pythonExe);
    console.log('Production Python path:', pythonPath);
    
    // Check if Python exists
    if (!fs.existsSync(pythonPath)) {
      console.error('Python executable not found at:', pythonPath);
      throw new Error(`Python executable not found: ${pythonPath}`);
    }
    
    return pythonPath;
  }

  getBackendPath() {
    const scriptName = 'main.py';
    
    if (isDev) {
      const devPath = path.join(__dirname, 'backend', scriptName);
      console.log('Development backend path:', devPath);
      return devPath;
    }

    const prodPath = path.join(process.resourcesPath, 'app-backend', scriptName);
    console.log('Production backend path:', prodPath);
    
    if (!fs.existsSync(prodPath)) {
      console.error('Backend script not found at:', prodPath);
      throw new Error(`Backend script not found: ${prodPath}`);
    }
    
    return prodPath;
  }

  async start() {
    if (this.startupPromise) {
      return this.startupPromise;
    }

    this.startupPromise = this._startInternal();
    return this.startupPromise;
  }

  async _startInternal() {
    try {
      console.log('Starting Python backend...');
      
      const pythonPath = this.getPythonPath();
      const scriptPath = this.getBackendPath();
      
      console.log('Python executable:', pythonPath);
      console.log('Script path:', scriptPath);

      // Start Python process
      this.process = spawn(pythonPath, [scriptPath], {
        cwd: path.dirname(scriptPath),
        stdio: isDev ? 'inherit' : 'pipe', // Show output in dev mode
        env: {
          ...process.env,
          PYTHONPATH: path.dirname(scriptPath),
          PYTHONUNBUFFERED: '1'
        }
      });

      // Handle process events
      this.process.on('error', (error) => {
        console.error('Python process error:', error);
        this.isReady = false;
      });

      this.process.on('exit', (code, signal) => {
        console.log(`Python process exited with code ${code}, signal ${signal}`);
        this.isReady = false;
      });

      // In development, log Python output
      if (isDev && this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          console.log('Python stdout:', data.toString());
        });
        
        this.process.stderr.on('data', (data) => {
          console.error('Python stderr:', data.toString());
        });
      }

      // Wait for Python to be ready
      await this.waitForReady();
      console.log('Python backend started successfully!');
      
      this.isReady = true;
      return true;

    } catch (error) {
      console.error('Failed to start Python backend:', error);
      this.isReady = false;
      throw error;
    }
  }

  async waitForReady() {
    const maxRetries = 30;
    const retryInterval = 1000; // 1 second
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Health check attempt ${i + 1}/${maxRetries}`);
        
        const response = await fetch(`http://${PYTHON_HOST}:${PYTHON_PORT}/health`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Backend health check passed:', data);
          return true;
        }
      } catch (error) {
        // Expected during startup
        if (i === 0) {
          console.log('Waiting for Python backend to start...');
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
    
    throw new Error(`Python backend failed to start within ${maxRetries} seconds`);
  }

  stop() {
    if (this.process && !this.process.killed) {
      console.log('Stopping Python backend...');
      this.process.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log('Force killing Python backend...');
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
    
    this.isReady = false;
    this.process = null;
    this.startupPromise = null;
  }
}

// Global backend instance
const backend = new PythonBackend();

async function createWindow() {
  console.log('🪟 Creating Electron window...');
  
  try {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      show: true,
      icon: isDev ? undefined : path.join(__dirname, 'assets', 'icon.png')
    });

    // UPDATED: Load React app in development, built app in production
    if (isDev) {
      await mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    } else {
      // Production: Load React build instead of old renderer
      const indexPath = path.join(__dirname, 'dist-react', 'index.html');
      await mainWindow.loadFile(indexPath);
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    return mainWindow;
  } catch (error) {
    console.error('❌ Error creating window:', error);
    throw error;
  }
}

// App event handlers
app.whenReady().then(async () => {
  try {
    console.log('App ready, starting Python backend...');
    
    // Start Python backend first
    await backend.start();
    
    // Then create window
    await createWindow();
    
    // Setup auto-updater after everything is ready
    setupAutoUpdater();
    
    console.log('Application startup complete!');
  } catch (error) {
    console.error('Failed to start application:', error);
    
    // Show error dialog
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start the application:\n\n${error.message}\n\nPlease check the logs and try again.`
    );
    
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    backend.stop();
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

app.on('before-quit', () => {
  console.log('App quitting, stopping Python backend...');
  backend.stop();
});

// IPC handlers
ipcMain.handle('test-backend', async () => {
  try {
    const response = await fetch(`http://${PYTHON_HOST}:${PYTHON_PORT}/health`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-llm', async (event, query) => {
  try {
    const response = await fetch(`http://${PYTHON_HOST}:${PYTHON_PORT}/test-llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// API Key management handlers
ipcMain.handle('validate-api-key', async (event, apiKey) => {
  try {
    const response = await fetch(`http://${PYTHON_HOST}:${PYTHON_PORT}/api-key/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ api_key: apiKey })
    });
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-api-key-status', async () => {
  try {
    const response = await fetch(`http://${PYTHON_HOST}:${PYTHON_PORT}/api-key/status`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-api-key', async () => {
  try {
    const response = await fetch(`http://${PYTHON_HOST}:${PYTHON_PORT}/api-key`, {
      method: 'DELETE'
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// NEW: Document processing handlers
ipcMain.handle('upload-document', async (event, fileBuffer, fileName) => {
  try {
    // Convert ArrayBuffer to Buffer for Node.js
    const nodeBuffer = Buffer.from(fileBuffer);
    
    // Create proper multipart boundary
    const boundary = `----formdata-electron-${Date.now()}`;
    const CRLF = '\r\n';
    
    // Build multipart form-data with proper binary handling
    const header = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      'Content-Type: application/octet-stream',
      '',
      ''
    ].join(CRLF);
    
    const footer = `${CRLF}--${boundary}--${CRLF}`;
    
    // Combine header + file buffer + footer
    const headerBuffer = Buffer.from(header, 'utf8');
    const footerBuffer = Buffer.from(footer, 'utf8');
    const formDataBuffer = Buffer.concat([headerBuffer, nodeBuffer, footerBuffer]);
    
    const response = await fetch(`http://${PYTHON_HOST}:${PYTHON_PORT}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formDataBuffer.length
      },
      body: formDataBuffer
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.detail || 'Upload failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Document management handlers
ipcMain.handle('list-documents', async () => {
  try {
    const response = await fetch(`http://${PYTHON_HOST}:${PYTHON_PORT}/documents/list`);
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.detail || 'Failed to list documents' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-document-details', async (event, documentId) => {
  try {
    const response = await fetch(`http://${PYTHON_HOST}:${PYTHON_PORT}/documents/${documentId}/details`);
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.detail || 'Failed to get document details' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-document', async (event, documentId, force) => {
  try {
    const url = new URL(`http://${PYTHON_HOST}:${PYTHON_PORT}/documents/${documentId}`);
    if (force) {
      url.searchParams.append('force', 'true');
    }
    
    const response = await fetch(url.toString(), {
      method: 'DELETE'
    });
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.detail || 'Failed to delete document' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});


// Auto-Updater Configuration and Event Handlers
let updateDownloaded = false;
let updateAvailable = false;

// Configure auto-updater for production only
if (!isDev) {
  // Use update.electronjs.org for GitHub releases
  const server = 'https://update.electronjs.org';
  const url = `${server}/RandomWilder/Covenantrix_App/${process.platform}-${process.arch}/${app.getVersion()}`;
  
  autoUpdater.setFeedURL({ url });
  
  console.log('Auto-updater configured with URL:', url);
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
  if (mainWindow) {
    mainWindow.webContents.send('updater-message', {
      type: 'checking-for-update'
    });
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  updateAvailable = true;
  
  if (mainWindow) {
    mainWindow.webContents.send('updater-message', {
      type: 'update-available',
      info: info
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
  updateAvailable = false;
  
  if (mainWindow) {
    mainWindow.webContents.send('updater-message', {
      type: 'update-not-available',
      info: info
    });
  }
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
  if (mainWindow) {
    mainWindow.webContents.send('updater-message', {
      type: 'error',
      error: err.message
    });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`Download progress: ${progressObj.percent}%`);
  if (mainWindow) {
    mainWindow.webContents.send('updater-message', {
      type: 'download-progress',
      progress: {
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      }
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  updateDownloaded = true;
  
  if (mainWindow) {
    mainWindow.webContents.send('updater-message', {
      type: 'update-downloaded',
      info: info
    });
  }
});

// IPC handlers for auto-updater
ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return { success: false, error: 'Updates not available in development mode' };
  }
  
  try {
    autoUpdater.checkForUpdates();
    return { 
      success: true, 
      message: 'Checking for updates...',
      currentVersion: app.getVersion()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  if (isDev) {
    return { success: false, error: 'Updates not available in development mode' };
  }
  
  if (!updateAvailable) {
    return { success: false, error: 'No update available to download' };
  }
  
  try {
    // Note: Electron's autoUpdater automatically downloads the update when available
    // This handler is for explicit user-triggered downloads if needed
    return { success: true, message: 'Update download started...' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', async () => {
  if (isDev) {
    return { success: false, error: 'Updates not available in development mode' };
  }
  
  if (!updateDownloaded) {
    return { success: false, error: 'No update downloaded yet' };
  }
  
  try {
    // This will quit the app and install the update
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Auto-check for updates (integrated into existing app startup)
function setupAutoUpdater() {
  if (!isDev) {
    // Auto-check for updates 30 seconds after startup
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 30000);
    
    // Check every 4 hours
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 4 * 60 * 60 * 1000);
  }
}

// Add fetch polyfill for older Node versions
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

console.log('Electron main process loaded');
console.log('Development mode:', isDev);
console.log('Platform:', process.platform);
console.log('Resources path:', process.resourcesPath);