// Centralized icon exports for consistent usage across the application
export { 
    Send, 
    Loader2, 
    MessageSquare, 
    Copy, 
    Check,
    FileText,
    Search,
    Filter,
    SortAsc,
    MoreHorizontal,
    Eye,
    Download,
    Trash2,
    Upload,
    Settings,
    BarChart3,
    TrendingUp,
    Clock,
    AlertTriangle,
    CheckCircle,
    Lightbulb,
    Zap,
    Target,
    Bell,
    User,
    Key,
    Palette,
    Monitor,
    Sun,
    Moon,
    Save,
    AlertCircle,
    Shield
  } from 'lucide-react';
  
  // Icon size constants for consistency
  export const ICON_SIZES = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32
  } as const;
  
  // Icon wrapper for consistent styling
  export interface IconProps {
    size?: keyof typeof ICON_SIZES | number;
    className?: string;
  }
  
  export const getIconSize = (size: keyof typeof ICON_SIZES | number = 'md'): number => {
    return typeof size === 'number' ? size : ICON_SIZES[size];
  };