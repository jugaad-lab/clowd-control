'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, eachDayOfInterval, parseISO, isAfter, isBefore, isEqual } from 'date-fns';

interface BurndownDataPoint {
  date: string;
  ideal: number;
  actual: number | null;
  dayLabel: string;
}

interface SprintBurndownProps {
  sprintName: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  totalPoints: number;
  completedPointsByDay: Record<string, number>; // { "2026-02-01": 5, "2026-02-02": 3 }
  className?: string;
}

export function BurndownChart({
  sprintName,
  startDate,
  endDate,
  totalPoints,
  completedPointsByDay,
  className = '',
}: SprintBurndownProps) {
  // Generate all days in the sprint
  const sprintDays = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  });

  const totalDays = sprintDays.length;
  const pointsPerDay = totalPoints / (totalDays - 1); // Ideal burndown rate

  // Build chart data
  const today = new Date();

  const data: BurndownDataPoint[] = sprintDays.reduce<BurndownDataPoint[]>((acc, day, index) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayLabel = format(day, 'MMM d');
    
    // Ideal remaining (linear from total to 0)
    const ideal = Math.max(0, totalPoints - (pointsPerDay * index));
    
    // Actual remaining (only show up to today)
    const dayCompleted = completedPointsByDay[dateStr] || 0;
    const prevCumulative = acc.length > 0 ? (totalPoints - (acc[acc.length - 1].actual ?? totalPoints)) : 0;
    const cumulativeCompleted = prevCumulative + dayCompleted;
    
    const isPastOrToday = isBefore(day, today) || isEqual(format(day, 'yyyy-MM-dd'), format(today, 'yyyy-MM-dd'));
    const actual = isPastOrToday ? Math.max(0, totalPoints - cumulativeCompleted) : null;

    acc.push({
      date: dateStr,
      ideal: Math.round(ideal * 10) / 10,
      actual: actual !== null ? Math.round(actual * 10) / 10 : null,
      dayLabel,
    });
    return acc;
  }, []);

  // Calculate current status
  const latestActual = data.filter(d => d.actual !== null).slice(-1)[0];
  
  // Calculate cumulative completed from the latest actual data point
  const cumulativeCompleted = latestActual ? totalPoints - (latestActual.actual ?? totalPoints) : 0;
  const correspondingIdeal = latestActual ? data.find(d => d.date === latestActual.date)?.ideal : null;
  
  let status: 'ahead' | 'behind' | 'on-track' = 'on-track';
  if (latestActual && correspondingIdeal !== null && correspondingIdeal !== undefined) {
    if (latestActual.actual! < correspondingIdeal - 2) status = 'ahead';
    else if (latestActual.actual! > correspondingIdeal + 2) status = 'behind';
  }

  const statusColors = {
    'ahead': 'text-green-400',
    'behind': 'text-red-400',
    'on-track': 'text-blue-400',
  };

  const statusText = {
    'ahead': '🎉 Ahead of schedule',
    'behind': '⚠️ Behind schedule',
    'on-track': '✓ On track',
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">{sprintName} Burndown</h3>
        <span className={`text-sm font-medium ${statusColors[status]}`}>
          {statusText[status]}
        </span>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="dayLabel" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickLine={{ stroke: '#4B5563' }}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickLine={{ stroke: '#4B5563' }}
              label={{ 
                value: 'Story Points', 
                angle: -90, 
                position: 'insideLeft',
                fill: '#9CA3AF',
                fontSize: 12,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6',
              }}
              labelStyle={{ color: '#9CA3AF' }}
              formatter={(value, name) => [
                `${value ?? 0} pts`,
                name === 'ideal' ? 'Ideal' : 'Actual'
              ]}
            />
            <Legend 
              wrapperStyle={{ color: '#9CA3AF' }}
              formatter={(value: string) => (
                <span className="text-gray-300">
                  {value === 'ideal' ? 'Ideal Burndown' : 'Actual Progress'}
                </span>
              )}
            />
            <ReferenceLine y={0} stroke="#4B5563" />
            <Line
              type="linear"
              dataKey="ideal"
              stroke="#6B7280"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              name="ideal"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#60A5FA' }}
              name="actual"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Total Points</p>
          <p className="text-white font-semibold">{totalPoints}</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Completed</p>
          <p className="text-green-400 font-semibold">{cumulativeCompleted}</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Remaining</p>
          <p className="text-blue-400 font-semibold">{totalPoints - cumulativeCompleted}</p>
        </div>
      </div>
    </div>
  );
}

export default BurndownChart;
