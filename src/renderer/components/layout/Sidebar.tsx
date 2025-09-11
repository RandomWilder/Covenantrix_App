import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  MessageSquare, 
  Settings, 
  Upload,
  BarChart3,
  Search
} from 'lucide-react';
import { clsx } from 'clsx';

export type ViewMode = 'documents' | 'chat' | 'upload' | 'analytics' | 'search' | 'settings';

interface SidebarProps {
  activeItem: ViewMode;
  onItemSelect: (item: ViewMode) => void;
}

interface SidebarItem {
  id: ViewMode;
  label: string;
  icon: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'chat',
    label: 'AI Assistant',
    icon: <MessageSquare size={20} />
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: <FileText size={20} />
  },
  {
    id: 'upload',
    label: 'Upload',
    icon: <Upload size={20} />
  },
  {
    id: 'search',
    label: 'Search',
    icon: <Search size={20} />
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 size={20} />
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={20} />
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ activeItem, onItemSelect }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check initial connection
    const checkConnection = async () => {
      try {
        const result = await window.electronAPI.testBackend();
        setIsConnected(result.success);
      } catch (error) {
        setIsConnected(false);
      }
    };

    checkConnection();
    
    // Monitor connection every 10 seconds
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Covenantrix</h1>
        <p className="text-sm text-muted-foreground">Contract Intelligence</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {sidebarItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onItemSelect(item.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  {
                    "bg-primary text-primary-foreground": activeItem === item.id,
                    "text-muted-foreground hover:text-foreground hover:bg-accent": activeItem !== item.id
                  }
                )}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Status Section - UPDATED with real status */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          {isConnected ? 'Backend Connected' : 'Backend Disconnected'}
        </div>
      </div>
    </div>
  );
};