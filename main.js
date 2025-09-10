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

// Auto-updater configuration
const GITHUB_OWNER = 'RandomWilder';
const GITHUB_REPO = 'Covenantrix_App';
const UPDATE_CHECK_INTERVAL = 60000; // Check every minute (for testing)
// const UPDATE_CHECK_INTERVAL = 3600000; // Check every hour (for production)

// FIXED: Auto-updater configuration
if (!isDev) {
  // Only enable auto-updater in production
  // Use the correct URL format for GitHub releases
  const feedURL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download/`;
  
  try {
    autoUpdater.setFeedURL({
      url: feedURL,
      serverType: 'json'
    });
    console.log('✅ Auto-updater configured with feed URL:', feedURL);
  } catch (error) {
    console.error('❌ Failed to configure auto-updater:', error);
    // Don't break the app if auto-updater fails to configure
  }

  // Auto-updater event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Checking for updates...');
    sendToRenderer('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log('📦 Update available:', info);
    sendToRenderer('update-status', { 
      status: 'available', 
      version: info.version || 'newer version',
      releaseNotes: info.releaseNotes || 'No release notes available'
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ App is up to date');
    sendToRenderer('update-status', { status: 'not-available' });
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ Auto-updater error:', err);
    sendToRenderer('update-status', { 
      status: 'error', 
      error: err.message 
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`📥 Download progress: ${Math.round(progressObj.percent)}%`);
    sendToRenderer('update-status', { 
      status: 'downloading', 
      percent: Math.round(progressObj.percent) 
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ Update downloaded, ready to install');
    sendToRenderer('update-status', { 
      status: 'ready', 
      version: info.version || 'newer version'
    });
    
    // Show dialog to user
    showUpdateReadyDialog(info);
  });
}

// Helper function to send messages to renderer
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// Show update ready dialog
function showUpdateReadyDialog(info) {
  const version = info.version || 'newer version';
  const response = dialog.showMessageBoxSync(mainWindow, {
    type: 'info',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    title: 'Update Ready',
    message: `Version ${version} has been downloaded and is ready to install.`,
    detail: 'The application will restart to apply the update.'
  });

  if (response === 0) {
    // User clicked "Restart Now"
    autoUpdater.quitAndInstall();
  }
}

// MODIFIED: Start checking for updates after app is ready
function startUpdateChecker() {
  if (!isDev) {
    console.log('🚀 Starting update checker...');
    
    // Check immediately on startup (after longer delay)
    setTimeout(() => {
      try {
        autoUpdater.checkForUpdatesAndNotify();
      } catch (error) {
        console.error('❌ Failed to check for updates:', error);
      }
    }, 15000); // Wait 15 seconds after startup
    
    // Then check periodically
    setInterval(() => {
      try {
        autoUpdater.checkForUpdatesAndNotify();
      } catch (error) {
        console.error('❌ Failed to check for updates:', error);
      }
    }, UPDATE_CHECK_INTERVAL);
  }
}

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
    // Create the browser window
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      show: true, // Show immediately for debugging
      icon: isDev ? undefined : path.join(__dirname, 'assets', 'icon.png')
    });

    console.log('🪟 BrowserWindow created successfully');

    // Check if the HTML file exists
    const indexPath = path.join(__dirname, 'renderer', 'index.html');
    console.log('📁 Looking for HTML file at:', indexPath);
    
    if (!fs.existsSync(indexPath)) {
      console.error('❌ HTML file not found at:', indexPath);
      throw new Error(`HTML file not found: ${indexPath}`);
    }
    console.log('✅ HTML file exists');

    // Load the app
    await mainWindow.loadFile(indexPath);
    console.log('✅ HTML file loaded successfully');

    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
      console.log('🔧 DevTools opened');
    }

    // Handle window events
    mainWindow.on('closed', () => {
      console.log('🪟 Window closed');
      mainWindow = null;
    });

    mainWindow.on('ready-to-show', () => {
      console.log('🎉 Window ready-to-show event fired');
    });

    mainWindow.webContents.on('did-finish-load', () => {
      console.log('📄 Page finished loading');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('❌ Page failed to load:', errorCode, errorDescription);
    });

    console.log('🪟 Window setup complete');
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
    
    // Start update checker (with error handling)
    startUpdateChecker();
    
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

// EXISTING IPC handlers
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

// MODIFIED: Update management handlers with better error handling
ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return { success: false, error: 'Updates not available in development mode' };
  }
  
  try {
    await autoUpdater.checkForUpdatesAndNotify();
    return { success: true, message: 'Checking for updates...' };
  } catch (error) {
    console.error('Manual update check failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', async () => {
  if (isDev) {
    return { success: false, error: 'Updates not available in development mode' };
  }
  
  try {
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    console.error('Update installation failed:', error);
    return { success: false, error: error.message };
  }
});

// Add fetch polyfill for older Node versions
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

console.log('Electron main process loaded');
console.log('Development mode:', isDev);
console.log('Platform:', process.platform);
console.log('Resources path:', process.resourcesPath);
console.log('GitHub Repository:', `${GITHUB_OWNER}/${GITHUB_REPO}`);