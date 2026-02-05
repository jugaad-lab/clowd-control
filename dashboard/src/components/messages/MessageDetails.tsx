'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  X,
  Check,
  Clock,
  ArrowRight,
  Copy,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { AgentMessage } from '@/app/messages/page';

interface MessageDetailsProps {
  message: AgentMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessageUpdate: (messageId: string, updates: Partial<AgentMessage>) => void;
}

export function MessageDetails({
  message,
  open,
  onOpenChange,
  onMessageUpdate
}: MessageDetailsProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { addToast } = useToast();

  if (!open || !message) return null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({
        type: 'success',
        title: 'Copied to clipboard',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to copy',
        description: 'Unable to copy to clipboard'
      });
    }
  };

  const toggleRead = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      await onMessageUpdate(message.id, { read: !message.read });
    } finally {
      setIsUpdating(false);
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'task_update':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'error':
      case 'alert':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'notification':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'request':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'response':
        return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800';
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Panel */}
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Message Details
            </h2>
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-md border',
              getMessageTypeColor(message.message_type)
            )}>
              {message.message_type}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleRead}
              disabled={isUpdating}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isUpdating 
                  ? 'text-zinc-400 cursor-not-allowed'
                  : message.read
                  ? 'text-zinc-400 hover:text-blue-500'
                  : 'text-blue-500 hover:text-blue-600'
              )}
              title={message.read ? 'Mark as unread' : 'Mark as read'}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : message.read ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Participants */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
              Communication
            </h3>
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    {message.from_agent.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-white">
                    {message.from_agent}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Sender</div>
                </div>
              </div>
              
              <ArrowRight className="w-4 h-4 text-zinc-400" />
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    {message.to_agent.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-white">
                    {message.to_agent}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Receiver</div>
                </div>
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
                Content
              </h3>
              <button
                onClick={() => copyToClipboard(message.content)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          </div>

          {/* Acknowledgment Status */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
              Acknowledgment
            </h3>
            <div className={cn(
              'p-4 rounded-lg border',
              message.acked
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
            )}>
              <div className="flex items-center gap-2 mb-2">
                {message.acked ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                )}
                <span className={cn(
                  'text-sm font-medium',
                  message.acked
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-amber-700 dark:text-amber-300'
                )}>
                  {message.acked ? 'Acknowledged' : 'Pending Acknowledgment'}
                </span>
              </div>
              
              {message.acked ? (
                <div className="space-y-2">
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Acknowledged on {format(new Date(message.acked_at!), 'PPpp')}
                  </p>
                  {message.ack_response && (
                    <div className="mt-2 p-2 bg-white dark:bg-zinc-900 rounded border border-green-200 dark:border-green-800">
                      <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                        Response:
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {`"${message.ack_response}"`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Message has not been acknowledged yet.
                </p>
              )}
            </div>
          </div>

          {/* Metadata */}
          {Object.keys(message.metadata).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
                Metadata
              </h3>
              <div className="space-y-2">
                {Object.entries(message.metadata).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide min-w-0 flex-shrink-0">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-zinc-700 dark:text-zinc-300 min-w-0 break-all">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
                Technical Details
              </h3>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                {showRawJson ? 'Hide' : 'Show'} Raw JSON
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Message ID:</span>
                  <div className="font-mono text-zinc-700 dark:text-zinc-300 break-all">
                    {message.id}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Created:</span>
                  <div className="text-zinc-700 dark:text-zinc-300">
                    {format(new Date(message.created_at), 'PPpp')}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Status:</span>
                  <div className="text-zinc-700 dark:text-zinc-300">
                    {message.read ? 'Read' : 'Unread'}
                  </div>
                </div>
                {message.acked_at && (
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Acknowledged:</span>
                    <div className="text-zinc-700 dark:text-zinc-300">
                      {format(new Date(message.acked_at), 'PPpp')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {showRawJson && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Raw JSON Data
                  </span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(message, null, 2))}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    <Copy className="w-3 h-3" />
                    Copy JSON
                  </button>
                </div>
                <pre className="p-4 bg-zinc-900 dark:bg-zinc-950 text-zinc-100 dark:text-zinc-200 rounded-lg text-xs overflow-x-auto border border-zinc-200 dark:border-zinc-800">
                  {JSON.stringify(message, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}