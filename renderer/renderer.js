// Covenantrix Frontend - Renderer Process
console.log('Renderer process loaded');

// DOM elements
let statusIndicator, statusText, statusDot;
let testBackendBtn, testAiBtn, clearLogsBtn;
let backendResult, aiResult, logsArea, queryInput;
// NEW: Document processing elements (minimal)
let uploadDocBtn, documentInput, documentResult;

// Application state
let isBackendConnected = false;
let logs = [];

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');
    initializeElements();
    populateSystemInfo();
    setupEventListeners();
    startStatusMonitoring();
    addLog('Application initialized', 'info');
});

function initializeElements() {
    // Status elements
    statusIndicator = document.getElementById('statusIndicator');
    statusText = document.getElementById('statusText');
    statusDot = statusIndicator.querySelector('.status-dot');
    
    // Button elements
    testBackendBtn = document.getElementById('testBackendBtn');
    testAiBtn = document.getElementById('testAiBtn');
    clearLogsBtn = document.getElementById('clearLogsBtn');
    // NEW: Document upload elements (minimal)
    uploadDocBtn = document.getElementById('uploadDocBtn');
    documentInput = document.getElementById('documentInput');
    documentResult = document.getElementById('documentResult');
    
    // Result areas
    backendResult = document.getElementById('backendResult');
    aiResult = document.getElementById('aiResult');
    logsArea = document.getElementById('logsArea');
    
    // Input elements
    queryInput = document.getElementById('queryInput');
    
    addLog('UI elements initialized', 'info');
}

function populateSystemInfo() {
    try {
        const versions = window.electronAPI.versions;
        const platform = window.electronAPI.platform;
        
        document.getElementById('platformInfo').textContent = platform;
        document.getElementById('electronVersion').textContent = versions.electron;
        document.getElementById('nodeVersion').textContent = versions.node;
        document.getElementById('chromeVersion').textContent = versions.chrome;
        
        addLog(`System info populated - Platform: ${platform}`, 'info');
    } catch (error) {
        addLog(`Failed to populate system info: ${error.message}`, 'error');
    }
}

function setupEventListeners() {
    // Backend test button
    testBackendBtn.addEventListener('click', async () => {
        await testBackendConnection();
    });
    
    // AI test button
    testAiBtn.addEventListener('click', async () => {
        await testAIConnection();
    });
    
    // Clear logs button
    clearLogsBtn.addEventListener('click', () => {
        clearLogs();
    });
    
    // Enter key in query input
    queryInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            testAIConnection();
        }
    });
    
    // NEW: Document upload event listener (minimal)
    uploadDocBtn.addEventListener('click', async () => {
        await uploadDocument();
    });
    
    addLog('Event listeners setup complete', 'info');
}

function startStatusMonitoring() {
    // Initial status check
    updateConnectionStatus();
    
    // Periodic status check every 10 seconds
    setInterval(updateConnectionStatus, 10000);
    
    addLog('Status monitoring started', 'info');
}

async function updateConnectionStatus() {
    try {
        const result = await window.electronAPI.testBackend();
        
        if (result.success) {
            setConnectionStatus(true, 'Connected');
            isBackendConnected = true;
        } else {
            setConnectionStatus(false, 'Disconnected');
            isBackendConnected = false;
            addLog(`Backend connection failed: ${result.error}`, 'warning');
        }
    } catch (error) {
        setConnectionStatus(false, 'Error');
        isBackendConnected = false;
        addLog(`Status check error: ${error.message}`, 'error');
    }
}

function setConnectionStatus(connected, statusMessage) {
    statusText.textContent = statusMessage;
    
    // Remove existing status classes
    statusDot.classList.remove('connected', 'connecting');
    
    if (connected) {
        statusDot.classList.add('connected');
    }
}

async function testBackendConnection() {
    setButtonLoading(testBackendBtn, true);
    setResultAreaLoading(backendResult, true);
    addLog('Testing backend connection...', 'info');
    
    try {
        const result = await window.electronAPI.testBackend();
        
        if (result.success) {
            const formattedData = formatJSON(result.data);
            displayResult(backendResult, formattedData, 'success');
            addLog('✅ Backend connection test successful', 'success');
            isBackendConnected = true;
            setConnectionStatus(true, 'Connected');
        } else {
            displayResult(backendResult, `Error: ${result.error}`, 'error');
            addLog(`❌ Backend connection test failed: ${result.error}`, 'error');
            isBackendConnected = false;
            setConnectionStatus(false, 'Error');
        }
    } catch (error) {
        displayResult(backendResult, `Unexpected error: ${error.message}`, 'error');
        addLog(`❌ Backend test error: ${error.message}`, 'error');
        isBackendConnected = false;
        setConnectionStatus(false, 'Error');
    } finally {
        setButtonLoading(testBackendBtn, false);
        setResultAreaLoading(backendResult, false);
    }
}

async function testAIConnection() {
    const query = queryInput.value.trim();
    
    if (!query) {
        displayResult(aiResult, 'Please enter a query to test', 'error');
        addLog('AI test failed: empty query', 'warning');
        return;
    }
    
    if (!isBackendConnected) {
        displayResult(aiResult, 'Backend not connected. Please test backend connection first.', 'error');
        addLog('AI test failed: backend not connected', 'warning');
        return;
    }
    
    setButtonLoading(testAiBtn, true);
    setResultAreaLoading(aiResult, true);
    addLog(`Testing AI with query: "${query}"`, 'info');
    
    try {
        const result = await window.electronAPI.testLLM(query);
        
        if (result.success) {
            const formattedResponse = formatAIResponse(result.data);
            displayResult(aiResult, formattedResponse, 'success');
            addLog('✅ AI test successful', 'success');
        } else {
            displayResult(aiResult, `AI Error: ${result.error}`, 'error');
            addLog(`❌ AI test failed: ${result.error}`, 'error');
        }
    } catch (error) {
        displayResult(aiResult, `Unexpected AI error: ${error.message}`, 'error');
        addLog(`❌ AI test error: ${error.message}`, 'error');
    } finally {
        setButtonLoading(testAiBtn, false);
        setResultAreaLoading(aiResult, false);
    }
}

function setButtonLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.innerHTML = '<span class="loading-spinner"></span>' + button.textContent;
    } else {
        button.disabled = false;
        button.innerHTML = button.textContent.replace(/^.*?(\w)/, '$1'); // Remove spinner
    }
}

function setResultAreaLoading(element, loading) {
    if (loading) {
        element.classList.add('loading');
        element.textContent = '';
    } else {
        element.classList.remove('loading');
    }
}

function displayResult(element, content, type) {
    element.textContent = content;
    
    // Remove existing type classes
    element.classList.remove('success', 'error', 'loading');
    
    // Add new type class
    if (type) {
        element.classList.add(type);
    }
}

function formatJSON(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (error) {
        return String(obj);
    }
}

function formatAIResponse(data) {
    if (typeof data === 'object') {
        let formatted = `Response: ${data.response}\n\n`;
        formatted += `Processing Time: ${data.processing_time}s\n`;
        formatted += `Timestamp: ${data.timestamp}`;
        return formatted;
    }
    return String(data);
}

function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
        timestamp,
        message,
        type
    };
    
    logs.push(logEntry);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
        logs.shift();
    }
    
    renderLogs();
}

function renderLogs() {
    if (!logsArea) return;
    
    const logHtml = logs.map(log => {
        return `<div class="log-entry ${log.type}">[${log.timestamp}] ${log.message}</div>`;
    }).join('');
    
    logsArea.innerHTML = logHtml;
    
    // Scroll to bottom
    logsArea.scrollTop = logsArea.scrollHeight;
}

function clearLogs() {
    logs = [];
    if (logsArea) {
        logsArea.innerHTML = '';
    }
    addLog('Logs cleared', 'info');
}

// NEW: Document processing functions
async function uploadDocument() {
    const file = documentInput.files[0];
    
    if (!file) {
        displayResult(documentResult, 'Please select a file to upload', 'error');
        addLog('Upload failed: no file selected', 'warning');
        return;
    }
    
    setButtonLoading(uploadDocBtn, true);
    setResultAreaLoading(documentResult, true);
    addLog(`Uploading document: ${file.name}`, 'info');
    
    try {
        // Read file as buffer
        const fileBuffer = await file.arrayBuffer();
        
        // Send to backend via IPC
        const result = await window.electronAPI.uploadDocument(fileBuffer, file.name);
        
        if (result.success) {
            const formattedData = formatJSON(result.data);
            displayResult(documentResult, formattedData, 'success');
            addLog(`✅ Document uploaded successfully: ${file.name}`, 'success');
        } else {
            displayResult(documentResult, `Error: ${result.error}`, 'error');
            addLog(`❌ Document upload failed: ${result.error}`, 'error');
        }
    } catch (error) {
        displayResult(documentResult, `Unexpected error: ${error.message}`, 'error');
        addLog(`❌ Upload error: ${error.message}`, 'error');
    } finally {
        setButtonLoading(uploadDocBtn, false);
        setResultAreaLoading(documentResult, false);
    }
}


// Error handling
window.addEventListener('error', (event) => {
    addLog(`JavaScript Error: ${event.error.message}`, 'error');
    console.error('Application error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    addLog(`Unhandled Promise Rejection: ${event.reason}`, 'error');
    console.error('Unhandled promise rejection:', event.reason);
});

// Export functions for debugging (development only) 
// Note: In renderer process, we can't access process.env directly
try {
    window.debugAPI = {
        addLog,
        clearLogs,
        testBackend: testBackendConnection,
        testAI: testAIConnection,
        logs
    };
} catch (error) {
    console.log('Debug API setup skipped (production mode)');
}

console.log('Renderer script fully loaded');