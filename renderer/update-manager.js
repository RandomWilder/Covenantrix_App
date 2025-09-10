// Update Manager Frontend Component
class UpdateManager {
    constructor() {
        this.currentStatus = 'unknown';
        this.updateInfo = null;
    }

    initialize() {
        this.setupUpdateListener();
        this.createUpdateUI();
        
        // Check for updates on startup (after 5 seconds)
        setTimeout(() => {
            this.checkForUpdates();
        }, 5000);
    }

    setupUpdateListener() {
        if (window.electronAPI.onUpdateStatus) {
            window.electronAPI.onUpdateStatus((data) => {
                this.handleUpdateStatus(data);
            });
        }
    }

    createUpdateUI() {
        // Create update notification container
        const updateContainer = document.createElement('div');
        updateContainer.id = 'updateNotification';
        updateContainer.className = 'update-notification hidden';
        
        updateContainer.innerHTML = `
            <div class="update-content">
                <div class="update-icon">📦</div>
                <div class="update-message">
                    <div class="update-title" id="updateTitle">Update Available</div>
                    <div class="update-details" id="updateDetails">A new version is ready to install</div>
                    <div class="update-progress" id="updateProgress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                        <div class="progress-text" id="progressText">0%</div>
                    </div>
                </div>
                <div class="update-actions">
                    <button id="updateNowBtn" class="update-button primary">Update Now</button>
                    <button id="updateLaterBtn" class="update-button secondary">Later</button>
                    <button id="checkUpdatesBtn" class="update-button secondary">Check for Updates</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(updateContainer);
        
        // Setup event listeners
        this.setupUpdateButtons();
    }

    setupUpdateButtons() {
        const updateNowBtn = document.getElementById('updateNowBtn');
        const updateLaterBtn = document.getElementById('updateLaterBtn');
        const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');

        if (updateNowBtn) {
            updateNowBtn.addEventListener('click', () => {
                this.installUpdate();
            });
        }

        if (updateLaterBtn) {
            updateLaterBtn.addEventListener('click', () => {
                this.hideNotification();
            });
        }

        if (checkUpdatesBtn) {
            checkUpdatesBtn.addEventListener('click', () => {
                this.checkForUpdates();
            });
        }
    }

    handleUpdateStatus(data) {
        console.log('Update status:', data);
        this.currentStatus = data.status;
        this.updateInfo = data;

        switch (data.status) {
            case 'checking':
                this.showCheckingStatus();
                break;
            case 'available':
                this.showUpdateAvailable(data);
                break;
            case 'not-available':
                this.showUpToDate();
                break;
            case 'downloading':
                this.showDownloadProgress(data.percent);
                break;
            case 'ready':
                this.showUpdateReady(data);
                break;
            case 'error':
                this.showUpdateError(data.error);
                break;
        }
    }

    showCheckingStatus() {
        this.updateTitle('Checking for Updates');
        this.updateDetails('Looking for new versions...');
        this.showNotification();
        this.showButtons(['checkUpdatesBtn']);
    }

    showUpdateAvailable(data) {
        this.updateTitle(`Update Available: v${data.version}`);
        this.updateDetails('A new version is available for download');
        this.showNotification();
        this.showButtons(['updateNowBtn', 'updateLaterBtn']);
    }

    showUpToDate() {
        this.updateTitle('App is Up to Date');
        this.updateDetails('You are running the latest version');
        this.showNotification();
        this.showButtons(['checkUpdatesBtn']);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 3000);
    }

    showDownloadProgress(percent) {
        this.updateTitle('Downloading Update');
        this.updateDetails(`Downloading new version... ${percent}%`);
        this.showProgress(percent);
        this.showNotification();
        this.showButtons([]); // Hide all buttons during download
    }

    showUpdateReady(data) {
        this.updateTitle(`Update Ready: v${data.version}`);
        this.updateDetails('Update downloaded and ready to install. App will restart.');
        this.hideProgress();
        this.showNotification();
        this.showButtons(['updateNowBtn', 'updateLaterBtn']);
    }

    showUpdateError(error) {
        this.updateTitle('Update Error');
        this.updateDetails(`Failed to check for updates: ${error}`);
        this.showNotification();
        this.showButtons(['checkUpdatesBtn']);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    updateTitle(title) {
        const titleElement = document.getElementById('updateTitle');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    updateDetails(details) {
        const detailsElement = document.getElementById('updateDetails');
        if (detailsElement) {
            detailsElement.textContent = details;
        }
    }

    showProgress(percent) {
        const progressContainer = document.getElementById('updateProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressContainer) progressContainer.style.display = 'block';
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}%`;
    }

    hideProgress() {
        const progressContainer = document.getElementById('updateProgress');
        if (progressContainer) progressContainer.style.display = 'none';
    }

    showButtons(buttonIds) {
        const allButtons = ['updateNowBtn', 'updateLaterBtn', 'checkUpdatesBtn'];
        
        allButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.style.display = buttonIds.includes(buttonId) ? 'block' : 'none';
            }
        });
    }

    showNotification() {
        const notification = document.getElementById('updateNotification');
        if (notification) {
            notification.classList.remove('hidden');
        }
    }

    hideNotification() {
        const notification = document.getElementById('updateNotification');
        if (notification) {
            notification.classList.add('hidden');
        }
    }

    async checkForUpdates() {
        try {
            const result = await window.electronAPI.checkForUpdates();
            
            if (!result.success) {
                console.log('Update check failed:', result.error);
                // Don't show error for dev mode
                if (!result.error.includes('development mode')) {
                    this.showUpdateError(result.error);
                }
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
            this.showUpdateError(error.message);
        }
    }

    async installUpdate() {
        try {
            const result = await window.electronAPI.installUpdate();
            
            if (!result.success) {
                this.showUpdateError(result.error);
            }
            // If successful, app will restart automatically
        } catch (error) {
            console.error('Failed to install update:', error);
            this.showUpdateError(error.message);
        }
    }
}

// Initialize when DOM is loaded
let updateManager;

document.addEventListener('DOMContentLoaded', () => {
    updateManager = new UpdateManager();
    updateManager.initialize();
});

// Export for debugging
if (typeof window !== 'undefined') {
    window.updateManager = updateManager;
}