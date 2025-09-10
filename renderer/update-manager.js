// Simple Update Manager - Manual Check Only
class UpdateManager {
    constructor() {
        this.isChecking = false;
    }

    initialize() {
        this.createUpdateUI();
        
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
                </div>
                <div class="update-actions">
                    <button id="downloadUpdateBtn" class="update-button primary" style="display: none;">Download Update</button>
                    <button id="checkUpdatesBtn" class="update-button secondary">Check for Updates</button>
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
        const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
        const closeNotificationBtn = document.getElementById('closeNotificationBtn');

        if (downloadUpdateBtn) {
            downloadUpdateBtn.addEventListener('click', () => {
                this.downloadUpdate();
            });
        }

        if (checkUpdatesBtn) {
            checkUpdatesBtn.addEventListener('click', () => {
                this.checkForUpdates();
            });
        }

        if (closeNotificationBtn) {
            closeNotificationBtn.addEventListener('click', () => {
                this.hideNotification();
            });
        }
    }

    async checkForUpdates() {
        if (this.isChecking) return;
        
        this.isChecking = true;
        this.showCheckingStatus();
        
        try {
            const result = await window.electronAPI.checkForUpdates();
            
            if (result.success) {
                if (result.updateAvailable) {
                    this.showUpdateAvailable(result);
                } else {
                    this.showUpToDate();
                }
            } else {
                this.showUpdateError(result.error);
            }
        } catch (error) {
            this.showUpdateError(error.message);
        } finally {
            this.isChecking = false;
        }
    }

    showCheckingStatus() {
        this.updateTitle('Checking for Updates');
        this.updateDetails('Connecting to GitHub...');
        this.showNotification();
        this.showButtons(['closeNotificationBtn']);
    }

    showUpdateAvailable(data) {
        this.updateTitle(`Update Available: v${data.latestVersion}`);
        this.updateDetails(`Current: v${data.currentVersion} → New: v${data.latestVersion}`);
        this.showNotification();
        this.showButtons(['downloadUpdateBtn', 'closeNotificationBtn']);
        
        // Store download URL for later use
        this.downloadUrl = data.downloadUrl;
    }

    showUpToDate() {
        this.updateTitle('App is Up to Date');
        this.updateDetails('You are running the latest version');
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
        this.showNotification();
        this.showButtons(['checkUpdatesBtn', 'closeNotificationBtn']);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    downloadUpdate() {
        if (this.downloadUrl) {
            // FIXED: Use window.open instead of require('electron')
            window.open(this.downloadUrl, '_blank');
            this.hideNotification();
        }
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

    showButtons(buttonIds) {
        const allButtons = ['downloadUpdateBtn', 'checkUpdatesBtn', 'closeNotificationBtn'];
        
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