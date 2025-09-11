import React from 'react';
import { 
  FileText, 
  MessageSquare, 
  Settings, 
  Upload,
  BarChart3,
  Search
} from '../icons';
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
  return (
    <aside className="w-64 bg-card border-r border-border h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Covenantrix</h1>
        <p className="text-sm text-muted-foreground mt-1">Contract Intelligence</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemSelect(item.id)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeItem === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          Version 1.0.3
        </div>
      </div>
    </aside>
  );
};