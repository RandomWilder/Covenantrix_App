// Auto-Updater Manager using Electron's built-in autoUpdater
class UpdateManager {
    constructor() {
        this.isChecking = false;
        this.updateAvailable = false;
        this.updateDownloaded = false;
        this.downloadProgress = 0;
    }

    initialize() {
        this.createUpdateUI();
        
        // Listen for updater messages from main process
        window.electronAPI.onUpdaterMessage((data) => {
            this.handleUpdaterMessage(data);
        });
        
        // Check for updates on startup after 10 seconds
        setTimeout(() => {
            this.checkForUpdates();
        }, 10000);
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
                    <div class="update-title" id="updateTitle">Checking for Updates</div>
                    <div class="update-details" id="updateDetails">Please wait...</div>
                    <div class="update-progress" id="updateProgress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                        <div class="progress-text" id="progressText">0%</div>
                    </div>
                </div>
                <div class="update-actions">
                    <button id="downloadUpdateBtn" class="update-button primary" style="display: none;">Download Update</button>
                    <button id="installUpdateBtn" class="update-button primary" style="display: none;">Install & Restart</button>
                    <button id="checkUpdatesBtn" class="update-button secondary">Check for Updates</button>
                    <button id="laterBtn" class="update-button secondary" style="display: none;">Later</button>
                    <button id="closeNotificationBtn" class="update-button secondary">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(updateContainer);
        
        // Setup event listeners
        this.setupUpdateButtons();
    }

    setupUpdateButtons() {
        const downloadUpdateBtn = document.getElementById('downloadUpdateBtn');
        const installUpdateBtn = document.getElementById('installUpdateBtn');
        const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
        const laterBtn = document.getElementById('laterBtn');
        const closeNotificationBtn = document.getElementById('closeNotificationBtn');

        if (downloadUpdateBtn) {
            downloadUpdateBtn.addEventListener('click', () => {
                this.downloadUpdate();
            });
        }

        if (installUpdateBtn) {
            installUpdateBtn.addEventListener('click', () => {
                this.installUpdate();
            });
        }

        if (checkUpdatesBtn) {
            checkUpdatesBtn.addEventListener('click', () => {
                this.checkForUpdates();
            });
        }

        if (laterBtn) {
            laterBtn.addEventListener('click', () => {
                this.hideNotification();
            });
        }

        if (closeNotificationBtn) {
            closeNotificationBtn.addEventListener('click', () => {
                this.hideNotification();
            });
        }
    }

    handleUpdaterMessage(data) {
        console.log('Updater message received:', data);
        
        switch (data.type) {
            case 'checking-for-update':
                this.showCheckingStatus();
                break;
                
            case 'update-available':
                this.showUpdateAvailable(data.info);
                break;
                
            case 'update-not-available':
                this.showUpToDate(data.info);
                break;
                
            case 'download-progress':
                this.showDownloadProgress(data.progress);
                break;
                
            case 'update-downloaded':
                this.showUpdateReady(data.info);
                break;
                
            case 'error':
                this.showUpdateError(data.error);
                break;
                
            default:
                console.log('Unknown updater message type:', data.type);
        }
    }

    async checkForUpdates() {
        if (this.isChecking) return;
        
        this.isChecking = true;
        
        try {
            const result = await window.electronAPI.checkForUpdates();
            
            if (!result.success) {
                this.showUpdateError(result.error);
            }
            // Success is handled via updater messages from main process
        } catch (error) {
            this.showUpdateError(error.message);
        } finally {
            this.isChecking = false;
        }
    }

    async downloadUpdate() {
        try {
            const result = await window.electronAPI.downloadUpdate();
            
            if (!result.success) {
                this.showUpdateError(result.error);
            }
            // Download progress is handled via updater messages
        } catch (error) {
            this.showUpdateError(error.message);
        }
    }

    async installUpdate() {
        try {
            const result = await window.electronAPI.installUpdate();
            
            if (!result.success) {
                this.showUpdateError(result.error);
            }
            // If successful, the app will quit and restart automatically
        } catch (error) {
            this.showUpdateError(error.message);
        }
    }

    showCheckingStatus() {
        this.updateTitle('Checking for Updates');
        this.updateDetails('Connecting to update server...');
        this.hideProgress();
        this.showNotification();
        this.showButtons(['closeNotificationBtn']);
    }

    showUpdateAvailable(info) {
        this.updateAvailable = true;
        this.updateTitle('Update Available');
        this.updateDetails('A new version is available. Would you like to download it?');
        this.hideProgress();
        this.showNotification();
        this.showButtons(['downloadUpdateBtn', 'laterBtn']);
    }

    showDownloadProgress(progress) {
        this.updateTitle('Downloading Update');
        this.updateDetails(`Downloading update... ${this.formatBytes(progress.transferred)} of ${this.formatBytes(progress.total)}`);
        this.showProgress(progress.percent);
        this.showNotification();
        this.showButtons(['laterBtn']);
        
        this.downloadProgress = progress.percent;
    }

    showUpdateReady(info) {
        this.updateDownloaded = true;
        this.updateTitle('Update Ready');
        this.updateDetails('Update downloaded successfully. Restart to apply the update.');
        this.hideProgress();
        this.showNotification();
        this.showButtons(['installUpdateBtn', 'laterBtn']);
    }

    showUpToDate(info) {
        this.updateTitle('App is Up to Date');
        this.updateDetails('You are running the latest version');
        this.hideProgress();
        this.showNotification();
        this.showButtons(['checkUpdatesBtn', 'closeNotificationBtn']);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 3000);
    }

    showUpdateError(error) {
        this.updateTitle('Update Check Failed');
        this.updateDetails(`Error: ${error}`);
        this.hideProgress();
        this.showNotification();
        this.showButtons(['checkUpdatesBtn', 'closeNotificationBtn']);
        
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
        
        if (progressContainer) {
            progressContainer.style.display = 'flex';
        }
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(percent)}%`;
        }
    }

    hideProgress() {
        const progressContainer = document.getElementById('updateProgress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    showButtons(buttonIds) {
        const allButtons = ['downloadUpdateBtn', 'installUpdateBtn', 'checkUpdatesBtn', 'laterBtn', 'closeNotificationBtn'];
        
        allButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.style.display = buttonIds.includes(buttonId) ? 'inline-block' : 'none';
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

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Cleanup method
    destroy() {
        window.electronAPI.removeUpdaterListener();
    }
}

// Initialize when DOM is loaded
let updateManager;

document.addEventListener('DOMContentLoaded', () => {
    updateManager = new UpdateManager();
    updateManager.initialize();
});

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
    if (updateManager) {
        updateManager.destroy();
    }
});

// Export for debugging
if (typeof window !== 'undefined') {
    window.updateManager = updateManager;
}