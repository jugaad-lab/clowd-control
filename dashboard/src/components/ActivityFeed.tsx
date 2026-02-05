'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ActivityLog, getRecentActivity, subscribeToActivity } from '@/lib/supabase';
import { Activity, CheckCircle, Edit, Plus, Trash, User, MessageSquare, XCircle, Hand, ArrowRight, Clock, Play, Pause } from 'lucide-react';

const actionIcons: Record<string, React.ReactNode> = {
  task_assigned: <User className="w-4 h-4 text-blue-500" />,
  task_updated: <Edit className="w-4 h-4 text-yellow-500" />,
  task_created: <Plus className="w-4 h-4 text-green-500" />,
  task_completed: <CheckCircle className="w-4 h-4 text-green-600" />,
  task_deleted: <Trash className="w-4 h-4 text-red-500" />,
  task_claimed: <Hand className="w-4 h-4 text-blue-500" />,
  task_failed: <XCircle className="w-4 h-4 text-red-500" />,
  task_delegated: <ArrowRight className="w-4 h-4 text-orange-500" />,
  proposal_created: <MessageSquare className="w-4 h-4 text-purple-500" />,
  proposal_updated: <Edit className="w-4 h-4 text-purple-400" />,
  agent_status_changed: <Activity className="w-4 h-4 text-cyan-500" />,
  agent_registered: <Plus className="w-4 h-4 text-green-500" />,
  sprint_created: <Plus className="w-4 h-4 text-indigo-500" />,
  sprint_updated: <Edit className="w-4 h-4 text-indigo-400" />,
  sprint_opened: <Play className="w-4 h-4 text-green-500" />,
  sprint_closed: <Pause className="w-4 h-4 text-zinc-500" />,
  default: <Activity className="w-4 h-4 text-zinc-400" />,
};

const actionLabels: Record<string, string> = {
  task_assigned: 'assigned task',
  task_updated: 'updated task',
  task_created: 'created task',
  task_completed: 'completed task',
  task_deleted: 'deleted task',
  task_claimed: 'claimed task',
  task_failed: 'failed task',
  task_delegated: 'delegated task',
  proposal_created: 'created proposal',
  proposal_updated: 'updated proposal',
  agent_status_changed: 'changed status',
  agent_registered: 'registered',
  sprint_created: 'created sprint',
  sprint_updated: 'updated sprint',
  sprint_opened: 'started sprint',
  sprint_closed: 'closed sprint',
  test_connection: 'tested connection',
  cli_tested: 'ran CLI test',
};

interface ActivityFeedProps {
  limit?: number;
  className?: string;
}

export function ActivityFeed({ limit = 15, className = '' }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const data = await getRecentActivity(limit);
        setActivities(data);
        setError(null);
      } catch (err) {
        setError('Failed to load activity');
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();

    // Subscribe to new activity
    const subscription = subscribeToActivity((newActivity) => {
      setActivities((prev) => [newActivity, ...prev.slice(0, limit - 1)]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [limit]);

  const getIcon = (action: string) => {
    return actionIcons[action] || actionIcons.default;
  };

  const getLabel = (activity: ActivityLog) => {
    const label = actionLabels[activity.action] || activity.action.replace(/_/g, ' ');
    return label;
  };

  const getAgentDisplay = (activity: ActivityLog) => {
    if (activity.agent_id) {
      // Truncate to first 8 chars for display
      return `@${activity.agent_id.slice(0, 8)}`;
    }
    if (activity.human_id) {
      return activity.human_id;
    }
    return 'System';
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 ${className}`}>
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Feed
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-zinc-500 dark:text-zinc-400">Loading activity...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 ${className}`}>
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Feed
        </h3>
        <div className="text-sm text-red-500 py-4 text-center">{error}</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 ${className}`}>
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Feed
        </h3>
        <div className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
          No activity yet. Actions from agents will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 ${className}`}>
      <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5" />
        Activity Feed
      </h3>
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 text-sm group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg p-2 -mx-2 transition-colors"
          >
            <div className="mt-0.5 flex-shrink-0">{getIcon(activity.action)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-zinc-900 dark:text-white">
                  {getAgentDisplay(activity)}
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {getLabel(activity)}
                </span>
              </div>
              {activity.details && (
                <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5 truncate">
                  {typeof activity.details === 'object' && 'title' in activity.details
                    ? String(activity.details.title)
                    : activity.entity_id.slice(0, 8)}
                </div>
              )}
            </div>
            <div className="text-xs text-zinc-400 flex-shrink-0">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
