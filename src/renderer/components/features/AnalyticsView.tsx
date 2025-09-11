import React from 'react';
import { BarChart3, TrendingUp, FileText, Clock, AlertTriangle, CheckCircle, Target, Zap } from '../icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  description?: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, description, color = 'text-blue-600' }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={clsx('p-2 rounded-lg bg-muted/50', color)}>
            {icon}
          </div>
          {trend !== undefined && (
            <div className={clsx(
              "text-sm font-medium flex items-center gap-1",
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
              {trend >= 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

interface ActivityItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  iconColor?: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ icon, title, subtitle, iconColor = 'text-blue-600' }) => (
  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
    <div className={clsx('flex-shrink-0', iconColor)}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);

export const AnalyticsView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Documents"
          value={12}
          icon={<FileText size={24} />}
          color="text-blue-600"
          trend={20}
          description="Last 30 days"
        />
        <StatCard
          title="Processing Time"
          value="2.3s"
          icon={<Clock size={24} />}
          color="text-green-600"
          trend={-15}
          description="Average per document"
        />
        <StatCard
          title="Risks Identified"
          value={8}
          icon={<AlertTriangle size={24} />}
          color="text-red-600"
          trend={5}
          description="Across all contracts"
        />
        <StatCard
          title="Opportunities"
          value={15}
          icon={<Target size={24} />}
          color="text-purple-600"
          trend={25}
          description="Potential improvements"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} className="text-green-600" />
              Processing Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <div className="text-center">
                <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium mb-1">Chart Visualization</p>
                <p className="text-sm">Coming in next release</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle size={20} className="text-blue-600" />
              Document Types Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium mb-1">Document Breakdown</p>
                <p className="text-sm">Coming in next release</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap size={20} className="text-yellow-600" />
              AI Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Accuracy Rate</span>
                <span className="text-sm font-bold text-green-600">94.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Response Time</span>
                <span className="text-sm font-bold">1.8s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="text-sm font-bold text-green-600">98.1%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={20} className="text-purple-600" />
              Risk Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">High Risk</span>
                <span className="text-sm font-bold text-red-600">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Medium Risk</span>
                <span className="text-sm font-bold text-yellow-600">5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Low Risk</span>
                <span className="text-sm font-bold text-green-600">4</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              Document Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Processed</span>
                <span className="text-sm font-bold text-green-600">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Processing</span>
                <span className="text-sm font-bold text-yellow-600">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Failed</span>
                <span className="text-sm font-bold text-red-600">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ActivityItem
              icon={<CheckCircle size={16} />}
              iconColor="text-green-600"
              title="Employment Contract - Asaf.docx processed successfully"
              subtitle="Just now"
            />
            <ActivityItem
              icon={<BarChart3 size={16} />}
              iconColor="text-blue-600"
              title="Analytics dashboard accessed"
              subtitle="5 minutes ago"
            />
            <ActivityItem
              icon={<AlertTriangle size={16} />}
              iconColor="text-orange-600"
              title="Risk identified in section 4.2 - Termination clause"
              subtitle="1 hour ago"
            />
            <ActivityItem
              icon={<Target size={16} />}
              iconColor="text-purple-600"
              title="Opportunity detected - Salary negotiation potential"
              subtitle="2 hours ago"
            />
            <ActivityItem
              icon={<FileText size={16} />}
              iconColor="text-blue-600"
              title="New document uploaded - Service Agreement.pdf"
              subtitle="3 hours ago"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
