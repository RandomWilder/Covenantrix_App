import React from 'react';
import { Bell, Search, Settings } from '../icons';
import { Button } from '@/components/ui/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Search size={16} />
          </Button>
          <Button variant="ghost" size="sm">
            <Bell size={16} />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
};