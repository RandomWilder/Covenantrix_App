import React, { useState, useEffect } from 'react';
import { Key, Palette, Monitor, Sun, Moon, Save, AlertCircle } from '../icons';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { clsx } from 'clsx';

export const SettingsView: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Load existing settings
    const loadSettings = async () => {
      try {
        const result = await window.electronAPI.checkAPIKeyStatus();
        if (result.success && result.data?.configured) {
          setApiKey('••••••••••••••••'); // Show masked key
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey || apiKey.startsWith('•')) return;
    
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      const result = await window.electronAPI.validateAPIKey(apiKey);
      if (result.success) {
        setSaveStatus('success');
        setApiKey('••••••••••••••••'); // Mask the key after saving
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    // Apply theme change logic here
    document.documentElement.classList.remove('light', 'dark');
    if (newTheme !== 'system') {
      document.documentElement.classList.add(newTheme);
    } else {
      // Apply system theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
    }
  };

  const handleApiKeyFocus = () => {
    if (apiKey.startsWith('•')) {
      setApiKey(''); // Clear masked key when focused
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key size={20} className="text-blue-600" />
              API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                OpenAI API Key
              </label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onFocus={handleApiKeyFocus}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSaveApiKey}
                  disabled={!apiKey || apiKey.startsWith('•') || isSaving}
                  variant={saveStatus === 'success' ? 'default' : 'outline'}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin mr-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                      Saving...
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <Save size={16} className="mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
              
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle size={14} />
                  Failed to save API key. Please try again.
                </div>
              )}
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Key size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">About API Keys</p>
                  <p>Your API key is required for AI features and is stored securely on your device. We never send your API key to our servers.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette size={20} className="text-purple-600" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-3">
                  Theme Preference
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={clsx(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      theme === 'light' 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <Sun size={20} className={theme === 'light' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={clsx(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      theme === 'dark' 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <Moon size={20} className={theme === 'dark' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={clsx(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      theme === 'system' 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <Monitor size={20} className={theme === 'system' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Palette size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p>System theme automatically switches between light and dark based on your operating system preferences.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Info */}
        <Card>
          <CardHeader>
            <CardTitle>Application Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Version</span>
                 <span className="text-sm font-medium">1.0.9</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Backend Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Connected</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-sm font-medium">Just now</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
