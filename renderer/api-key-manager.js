// API Key Manager Frontend Component
class APIKeyManager {
    constructor() {
        this.isConfigured = false;
        this.isValid = false;
        this.isLoading = false;
    }

    async initialize() {
        await this.checkStatus();
    }

    async checkStatus() {
        try {
            const result = await window.electronAPI.checkAPIKeyStatus();
            if (result.success) {
                this.isConfigured = result.data.configured;
                this.isValid = result.data.valid;
                this.updateUI();
                return true;
            } else {
                console.error('Failed to check API key status:', result.error);
                return false;
            }
        } catch (error) {
            console.error('API key status check error:', error);
            return false;
        }
    }

    async validateAndSave(apiKey) {
        if (!apiKey || !apiKey.trim()) {
            throw new Error('API key cannot be empty');
        }

        this.setLoading(true);
        
        try {
            const result = await window.electronAPI.validateAPIKey(apiKey.trim());
            
            if (result.success) {
                if (result.data.is_valid) {
                    this.isConfigured = true;
                    this.isValid = true;
                    this.updateUI();
                    return {
                        success: true,
                        message: result.data.message
                    };
                } else {
                    return {
                        success: false,
                        message: result.data.message
                    };
                }
            } else {
                return {
                    success: false,
                    message: result.error
                };
            }
        } finally {
            this.setLoading(false);
        }
    }

    async removeKey() {
        this.setLoading(true);
        
        try {
            const result = await window.electronAPI.removeAPIKey();
            
            if (result.success) {
                this.isConfigured = false;
                this.isValid = false;
                this.updateUI();
                return { success: true, message: 'API key removed successfully' };
            } else {
                return { success: false, message: result.error };
            }
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.updateUI();
    }

    updateUI() {
        // Update status indicator
        const statusElement = document.getElementById('apiKeyStatus');
        if (statusElement) {
            statusElement.className = 'api-key-status';
            
            if (this.isConfigured && this.isValid) {
                statusElement.classList.add('configured');
                statusElement.textContent = '✅ API Key Configured';
            } else if (this.isConfigured && !this.isValid) {
                statusElement.classList.add('invalid');
                statusElement.textContent = '⚠️ API Key Invalid';
            } else {
                statusElement.classList.add('not-configured');
                statusElement.textContent = '⚙️ API Key Not Configured';
            }
        }

        // Update form visibility
        const formElement = document.getElementById('apiKeyForm');
        const removeButton = document.getElementById('removeAPIKeyBtn');
        
        if (formElement) {
            formElement.style.display = this.isConfigured ? 'none' : 'block';
        }
        
        if (removeButton) {
            removeButton.style.display = this.isConfigured ? 'block' : 'none';
        }

        // Update loading states
        const submitButton = document.getElementById('submitAPIKeyBtn');
        if (submitButton) {
            submitButton.disabled = this.isLoading;
            submitButton.textContent = this.isLoading ? 'Validating...' : 'Validate & Save';
        }

        if (removeButton) {
            removeButton.disabled = this.isLoading;
        }
    }

    showMessage(message, type = 'info') {
        const messageElement = document.getElementById('apiKeyMessage');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `api-key-message ${type}`;
            messageElement.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 5000);
        }
    }
}

// Initialize when DOM is loaded
let apiKeyManager;

document.addEventListener('DOMContentLoaded', () => {
    apiKeyManager = new APIKeyManager();
    
    // Setup event listeners
    const submitButton = document.getElementById('submitAPIKeyBtn');
    const removeButton = document.getElementById('removeAPIKeyBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');

    if (submitButton) {
        submitButton.addEventListener('click', async () => {
            const apiKey = apiKeyInput ? apiKeyInput.value : '';
            
            try {
                const result = await apiKeyManager.validateAndSave(apiKey);
                
                if (result.success) {
                    apiKeyManager.showMessage(result.message, 'success');
                    if (apiKeyInput) apiKeyInput.value = '';
                } else {
                    apiKeyManager.showMessage(result.message, 'error');
                }
            } catch (error) {
                apiKeyManager.showMessage(error.message, 'error');
            }
        });
    }

    if (removeButton) {
        removeButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to remove the stored API key?')) {
                try {
                    const result = await apiKeyManager.removeKey();
                    
                    if (result.success) {
                        apiKeyManager.showMessage(result.message, 'success');
                    } else {
                        apiKeyManager.showMessage(result.message, 'error');
                    }
                } catch (error) {
                    apiKeyManager.showMessage(error.message, 'error');
                }
            }
        });
    }

    // Enter key handling
    if (apiKeyInput) {
        apiKeyInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submitButton.click();
            }
        });
    }

    // Initialize the manager
    apiKeyManager.initialize();
});

// Export for debugging
if (typeof window !== 'undefined') {
    window.apiKeyManager = apiKeyManager;
}