'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatTokens, getBudgetPercentage, getBudgetStatusColor } from '@/lib/agents';

interface ChartDataPoint {
  date: string;
  tokens: number;
  cumulative: number;
  budgetLine?: number;
  label?: string;
}

interface TooltipPayload {
  payload: ChartDataPoint;
  value: number;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly TooltipPayload[];
  label?: string | number;
}

interface TokenUsageDataPoint {
  date: string;
  tokens: number;
  label?: string;
}

interface TokenUsageChartProps {
  data: TokenUsageDataPoint[];
  budget: number;
  className?: string;
}

export function TokenUsageChart({ data, budget, className = '' }: TokenUsageChartProps) {
  // Calculate cumulative usage
  const chartData = useMemo(() => {
    return data.reduce<ChartDataPoint[]>((acc, point) => {
      const prevCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
      acc.push({
        ...point,
        cumulative: prevCumulative + point.tokens,
        budgetLine: budget,
      });
      return acc;
    }, []);
  }, [data, budget]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalUsed: 0,
        averageDaily: 0,
        projectedTotal: 0,
        daysRemaining: 0,
      };
    }

    const totalUsed = chartData[chartData.length - 1]?.cumulative || 0;
    const averageDaily = totalUsed / chartData.length;
    const remaining = budget - totalUsed;
    const daysRemaining = averageDaily > 0 ? Math.floor(remaining / averageDaily) : Infinity;
    const projectedTotal = averageDaily * 30; // 30-day projection

    return { totalUsed, averageDaily, projectedTotal, daysRemaining };
  }, [chartData, budget]);

  const currentPercentage = getBudgetPercentage(stats.totalUsed, budget);
  const statusColor = getBudgetStatusColor(currentPercentage);

  const statusColorMap = {
    green: '#22C55E',
    yellow: '#F59E0B',
    orange: '#F97316',
    red: '#EF4444',
  };

  const gradientColor = statusColorMap[statusColor as keyof typeof statusColorMap];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0].payload;
    const percentage = getBudgetPercentage(point.cumulative, budget);

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-white font-semibold mb-2">{point.label || point.date}</p>
        <div className="space-y-1 text-sm">
          <p className="text-gray-300">
            <span className="text-gray-500">Daily:</span>{' '}
            <span className="text-blue-400 font-medium">{formatTokens(point.tokens)}</span>
          </p>
          <p className="text-gray-300">
            <span className="text-gray-500">Cumulative:</span>{' '}
            <span className="text-amber-400 font-medium">{formatTokens(point.cumulative)}</span>
          </p>
          <p className="text-gray-300">
            <span className="text-gray-500">Budget used:</span>{' '}
            <span
              className={
                percentage >= 80 ? 'text-red-400' : percentage >= 60 ? 'text-yellow-400' : 'text-green-400'
              }
            >
              {percentage.toFixed(1)}%
            </span>
          </p>
        </div>
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">Token Usage</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No usage data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Token Usage</h3>
        <span
          className={`text-sm font-medium ${
            currentPercentage >= 80
              ? 'text-red-400'
              : currentPercentage >= 60
              ? 'text-yellow-400'
              : 'text-green-400'
          }`}
        >
          {formatTokens(stats.totalUsed)} / {formatTokens(budget)}
        </span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={gradientColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="date"
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
              tickFormatter={(value) => formatTokens(value)}
              label={{
                value: 'Tokens',
                angle: -90,
                position: 'insideLeft',
                fill: '#9CA3AF',
                fontSize: 12,
              }}
            />
            <Tooltip content={CustomTooltip} cursor={{ stroke: '#6B7280', strokeDasharray: '5 5' }} />
            <ReferenceLine
              y={budget}
              stroke="#EF4444"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Budget: ${formatTokens(budget)}`,
                position: 'right',
                fill: '#EF4444',
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={gradientColor}
              strokeWidth={2}
              fill="url(#tokenGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4 text-center">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Total Used</p>
          <p className="text-amber-400 font-semibold">{formatTokens(stats.totalUsed)}</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Daily Average</p>
          <p className="text-blue-400 font-semibold">{formatTokens(Math.round(stats.averageDaily))}</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Remaining</p>
          <p className="text-green-400 font-semibold">{formatTokens(Math.max(0, budget - stats.totalUsed))}</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Days Left</p>
          <p
            className={`font-semibold ${
              stats.daysRemaining < 7 ? 'text-red-400' : stats.daysRemaining < 14 ? 'text-yellow-400' : 'text-green-400'
            }`}
          >
            {stats.daysRemaining === Infinity ? '∞' : stats.daysRemaining}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: gradientColor }} />
          <span>Cumulative usage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-red-500" style={{ borderTop: '2px dashed #EF4444' }} />
          <span>Budget limit</span>
        </div>
      </div>
    </div>
  );
}

export default TokenUsageChart;
