'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronDown, 
  ArrowRight,
  Clock,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentMessage } from '@/app/messages/page';

interface MessageListProps {
  messages: AgentMessage[];
  onMessageClick: (message: AgentMessage) => void;
  onMessageUpdate: (messageId: string, updates: Partial<AgentMessage>) => void;
}

export function MessageList({ messages, onMessageClick, onMessageUpdate }: MessageListProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  const toggleExpanded = (messageId: string) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const markAsRead = async (message: AgentMessage) => {
    if (!message.read) {
      await onMessageUpdate(message.id, { read: true });
    }
  };

  const toggleRead = async (message: AgentMessage, event: React.MouseEvent) => {
    event.stopPropagation();
    await onMessageUpdate(message.id, { read: !message.read });
  };

  const getMessageTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'task_update':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      case 'error':
      case 'alert':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
      case 'notification':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
      case 'request':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'response':
        return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  const formatContent = (content: string) => {
    if (content.length <= 100) return content;
    return content.substring(0, 100) + '...';
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-lg font-medium mb-2">No messages found</h3>
        <p className="text-sm text-center">
          No agent messages match your current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {messages.map((message) => {
        const isExpanded = expandedMessages.has(message.id);
        const shouldTruncate = message.content.length > 100;
        
        return (
          <div
            key={message.id}
            className={cn(
              'p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group',
              !message.read && 'bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-l-blue-500'
            )}
            onClick={() => {
              markAsRead(message);
              onMessageClick(message);
            }}
          >
            <div className="flex items-start gap-3">
              {/* Read/Unread Indicator */}
              <button
                onClick={(e) => toggleRead(message, e)}
                className={cn(
                  'mt-1 flex-shrink-0 transition-colors',
                  message.read
                    ? 'text-zinc-400 hover:text-blue-500'
                    : 'text-blue-500 hover:text-blue-600'
                )}
              >
                {message.read ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {/* From -> To */}
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-zinc-900 dark:text-white">
                        {message.from_agent}
                      </span>
                      <ArrowRight className="w-4 h-4 text-zinc-400" />
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {message.to_agent}
                      </span>
                    </div>
                    
                    {/* Message Type Badge */}
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      getMessageTypeColor(message.message_type)
                    )}>
                      {message.message_type}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Acknowledgment Status */}
                    {message.acked ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" />
                        <span className="text-xs">Acked</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">Pending</span>
                      </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
                    {isExpanded || !shouldTruncate 
                      ? message.content 
                      : formatContent(message.content)
                    }
                  </p>

                  {/* Expand/Collapse Toggle */}
                  {shouldTruncate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(message.id);
                      }}
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-3 h-3" />
                          Show more
                        </>
                      )}
                    </button>
                  )}

                  {/* Metadata Preview */}
                  {Object.keys(message.metadata).length > 0 && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-medium">Metadata:</span>
                      {' '}
                      {Object.keys(message.metadata).length} field(s)
                      {message.metadata.review_score && (
                        <span className="ml-2 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                          Score: {message.metadata.review_score}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Acknowledgment Details */}
                  {message.acked && message.ack_response && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-300 mb-1">
                        <Check className="w-3 h-3" />
                        <span className="font-medium">
                          Acknowledged {formatDistanceToNow(new Date(message.acked_at!), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        "{message.ack_response}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 mt-1 flex-shrink-0" />
            </div>
          </div>
        );
      })}
    </div>
  );
}