'use client';

import { useState } from 'react';
import { Calendar, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageFilters {
  sender: string | null;
  receiver: string | null;
  messageType: string | null;
  status: 'all' | 'read' | 'unread';
  ackStatus: 'all' | 'acked' | 'pending';
  dateRange: {
    from: Date | null;
    to: Date | null;
  } | null;
}

export function useMessageFilters() {
  const [filters, setFilters] = useState<MessageFilters>({
    sender: null,
    receiver: null,
    messageType: null,
    status: 'all',
    ackStatus: 'all',
    dateRange: null,
  });

  const updateFilter = <K extends keyof MessageFilters>(
    key: K,
    value: MessageFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      sender: null,
      receiver: null,
      messageType: null,
      status: 'all',
      ackStatus: 'all',
      dateRange: null,
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'status' && value === 'all') return false;
    if (key === 'ackStatus' && value === 'all') return false;
    if (key === 'dateRange' && value === null) return false;
    return value !== null && value !== 'all';
  });

  return { filters, updateFilter, clearFilters, hasActiveFilters };
}

interface MessageFiltersProps {
  agents: string[];
  messages: Array<{ message_type: string }>;
  messageTypes: string[];
  filterHook: ReturnType<typeof useMessageFilters>;
}

export function MessageFilters({ 
  agents, 
  messageTypes,
  filterHook 
}: MessageFiltersProps) {
  const { filters, updateFilter, clearFilters, hasActiveFilters } = filterHook;
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Filters:
          </span>
        </div>

        {/* Sender Filter */}
        <select
          value={filters.sender || ''}
          onChange={(e) => updateFilter('sender', e.target.value || null)}
          className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Any Sender</option>
          {agents.map((agent) => (
            <option key={agent} value={agent}>
              From: {agent}
            </option>
          ))}
        </select>

        {/* Receiver Filter */}
        <select
          value={filters.receiver || ''}
          onChange={(e) => updateFilter('receiver', e.target.value || null)}
          className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Any Receiver</option>
          {agents.map((agent) => (
            <option key={agent} value={agent}>
              To: {agent}
            </option>
          ))}
        </select>

        {/* Message Type Filter */}
        <select
          value={filters.messageType || ''}
          onChange={(e) => updateFilter('messageType', e.target.value || null)}
          className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Any Type</option>
          {messageTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          {(['all', 'read', 'unread'] as const).map((status) => (
            <button
              key={status}
              onClick={() => updateFilter('status', status)}
              className={cn(
                'px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize',
                filters.status === status
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Acknowledgment Status Filter */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          {([
            { key: 'all', label: 'All' },
            { key: 'acked', label: 'Acked' },
            { key: 'pending', label: 'Pending' }
          ] as const).map((ackStatus) => (
            <button
              key={ackStatus.key}
              onClick={() => updateFilter('ackStatus', ackStatus.key)}
              className={cn(
                'px-3 py-1 text-sm font-medium rounded-md transition-colors',
                filters.ackStatus === ackStatus.key
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              {ackStatus.label}
            </button>
          ))}
        </div>

        {/* Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          <Calendar className="w-4 h-4" />
          Date Range
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">
            Date Range
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">From:</label>
              <input
                type="date"
                value={filters.dateRange?.from ? filters.dateRange.from.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  updateFilter('dateRange', {
                    from: date,
                    to: filters.dateRange?.to || null,
                  });
                }}
                className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">To:</label>
              <input
                type="date"
                value={filters.dateRange?.to ? filters.dateRange.to.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  updateFilter('dateRange', {
                    from: filters.dateRange?.from || null,
                    to: date,
                  });
                }}
                className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {filters.dateRange && (
              <button
                onClick={() => updateFilter('dateRange', null)}
                className="p-1.5 text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                title="Clear date range"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Active filters:</span>
          {filters.sender && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded">
              From: {filters.sender}
              <button
                onClick={() => updateFilter('sender', null)}
                className="hover:text-blue-800 dark:hover:text-blue-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.receiver && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
              To: {filters.receiver}
              <button
                onClick={() => updateFilter('receiver', null)}
                className="hover:text-purple-800 dark:hover:text-purple-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.messageType && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded">
              Type: {filters.messageType}
              <button
                onClick={() => updateFilter('messageType', null)}
                className="hover:text-green-800 dark:hover:text-green-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}