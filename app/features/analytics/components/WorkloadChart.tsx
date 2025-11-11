import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users } from "lucide-react";

interface WorkloadData {
  userId: string;
  userName: string;
  openTaskCount: number;
}

interface WorkloadChartProps {
  data: WorkloadData[];
  isLoading?: boolean;
}

// Color scale for workload intensity
const getWorkloadColor = (taskCount: number): string => {
  if (taskCount === 0) return '#d1d5db'; // gray-300
  if (taskCount <= 3) return '#10b981'; // green-500 - Light load
  if (taskCount <= 7) return '#f59e0b'; // amber-500 - Medium load
  if (taskCount <= 10) return '#f97316'; // orange-500 - Heavy load
  return '#ef4444'; // red-500 - Overloaded
};

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900">{data.userName}</p>
        <p className="text-sm text-gray-600 mt-1">
          Open Tasks: <span className="font-semibold">{data.openTaskCount}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {data.openTaskCount === 0 ? 'No tasks' :
           data.openTaskCount <= 3 ? 'Light workload' :
           data.openTaskCount <= 7 ? 'Medium workload' :
           data.openTaskCount <= 10 ? 'Heavy workload' :
           'Overloaded'}
        </p>
      </div>
    );
  }
  return null;
};

export const WorkloadChart = ({ data, isLoading }: WorkloadChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Workload Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse space-y-4 w-full">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Workload Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No workload data available</p>
              <p className="text-gray-400 text-xs mt-1">
                Assign tasks to team members to see workload distribution
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by task count descending
  const sortedData = [...data].sort((a, b) => b.openTaskCount - a.openTaskCount);

  // Truncate long names for better display
  const formattedData = sortedData.map(item => ({
    ...item,
    displayName: item.userName.length > 15 
      ? item.userName.substring(0, 12) + '...' 
      : item.userName
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Workload Distribution
        </CardTitle>
        <p className="text-sm text-gray-600">Open tasks per team member</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={formattedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="displayName" 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              label={{ 
                value: 'Open Tasks', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: 12, fill: '#6b7280' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="openTaskCount" 
              radius={[8, 8, 0, 0]}
            >
              {formattedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getWorkloadColor(entry.openTaskCount)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
            <span className="text-gray-600">Light (1-3)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
            <span className="text-gray-600">Medium (4-7)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }}></div>
            <span className="text-gray-600">Heavy (8-10)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-gray-600">Overloaded (10+)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
