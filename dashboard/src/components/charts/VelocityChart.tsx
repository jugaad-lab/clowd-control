'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface SprintVelocity {
  sprintName: string;
  pointsCompleted: number;
  pointsCommitted?: number;
  startDate?: string;
  endDate?: string;
}

interface TooltipPayload {
  payload: SprintVelocity;
  value: number;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly TooltipPayload[];
  label?: string | number;
}

interface VelocityChartProps {
  sprints: SprintVelocity[];
  className?: string;
}

export function VelocityChart({ sprints, className = '' }: VelocityChartProps) {
  // Calculate average velocity
  const averageVelocity = useMemo(() => {
    if (sprints.length === 0) return 0;
    const total = sprints.reduce((sum, s) => sum + s.pointsCompleted, 0);
    return Math.round((total / sprints.length) * 10) / 10;
  }, [sprints]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (sprints.length === 0) {
      return { min: 0, max: 0, trend: 'stable' as const };
    }
    
    const velocities = sprints.map(s => s.pointsCompleted);
    const min = Math.min(...velocities);
    const max = Math.max(...velocities);
    
    // Calculate trend (compare last 2 sprints to earlier ones)
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (sprints.length >= 3) {
      const recentAvg = (velocities[velocities.length - 1] + velocities[velocities.length - 2]) / 2;
      const earlierAvg = velocities.slice(0, -2).reduce((a, b) => a + b, 0) / (velocities.length - 2);
      if (recentAvg > earlierAvg * 1.1) trend = 'increasing';
      else if (recentAvg < earlierAvg * 0.9) trend = 'decreasing';
    }
    
    return { min, max, trend };
  }, [sprints]);

  const trendColors = {
    increasing: 'text-green-400',
    decreasing: 'text-red-400',
    stable: 'text-blue-400',
  };

  const trendText = {
    increasing: '📈 Trending up',
    decreasing: '📉 Trending down',
    stable: '➡️ Stable',
  };

  // Determine bar colors based on performance vs average
  const getBarColor = (points: number) => {
    if (points >= averageVelocity * 1.1) return '#22C55E'; // green-500
    if (points <= averageVelocity * 0.9) return '#EF4444'; // red-500
    return '#3B82F6'; // blue-500
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload as SprintVelocity;
    const vsAverage = data.pointsCompleted - averageVelocity;
    const vsAverageText = vsAverage >= 0 ? `+${vsAverage.toFixed(1)}` : vsAverage.toFixed(1);
    
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-white font-semibold mb-2">{data.sprintName}</p>
        <div className="space-y-1 text-sm">
          <p className="text-gray-300">
            <span className="text-gray-500">Completed:</span>{' '}
            <span className="text-blue-400 font-medium">{data.pointsCompleted} pts</span>
          </p>
          {data.pointsCommitted && (
            <p className="text-gray-300">
              <span className="text-gray-500">Committed:</span>{' '}
              <span className="text-gray-400">{data.pointsCommitted} pts</span>
            </p>
          )}
          <p className="text-gray-300">
            <span className="text-gray-500">vs Average:</span>{' '}
            <span className={vsAverage >= 0 ? 'text-green-400' : 'text-red-400'}>
              {vsAverageText} pts
            </span>
          </p>
          {data.startDate && data.endDate && (
            <p className="text-gray-500 text-xs mt-1">
              {data.startDate} → {data.endDate}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (sprints.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">Sprint Velocity</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No sprint data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Sprint Velocity</h3>
        <span className={`text-sm font-medium ${trendColors[stats.trend]}`}>
          {trendText[stats.trend]}
        </span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sprints}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="sprintName"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickLine={{ stroke: '#4B5563' }}
              axisLine={{ stroke: '#4B5563' }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickLine={{ stroke: '#4B5563' }}
              axisLine={{ stroke: '#4B5563' }}
              label={{
                value: 'Story Points',
                angle: -90,
                position: 'insideLeft',
                fill: '#9CA3AF',
                fontSize: 12,
              }}
            />
            <Tooltip content={CustomTooltip} cursor={{ fill: '#374151', opacity: 0.5 }} />
            <ReferenceLine
              y={averageVelocity}
              stroke="#F59E0B"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Avg: ${averageVelocity}`,
                position: 'right',
                fill: '#F59E0B',
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="pointsCompleted"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            >
              {sprints.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.pointsCompleted)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Average Velocity</p>
          <p className="text-amber-400 font-semibold">{averageVelocity} pts</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Best Sprint</p>
          <p className="text-green-400 font-semibold">{stats.max} pts</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Lowest Sprint</p>
          <p className="text-red-400 font-semibold">{stats.min} pts</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Above average</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>On target</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Below average</span>
        </div>
      </div>
    </div>
  );
}

export default VelocityChart;
