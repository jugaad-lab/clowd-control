'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/hooks';
import { MessageList } from '@/components/messages/MessageList';
import { MessageFilters, useMessageFilters } from '@/components/messages/MessageFilters';
import { MessageDetails } from '@/components/messages/MessageDetails';
import { useToast } from '@/components/ui/toast';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the AgentMessage type based on the schema we saw
export interface AgentMessage {
  id: string;
  from_agent: string;
  to_agent: string;
  message_type: string;
  content: string;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
  acked: boolean;
  acked_at: string | null;
  ack_response: string | null;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<AgentMessage | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const filterHook = useMessageFilters();
  const { filters } = filterHook;

  useEffect(() => {
    async function fetchMessages() {
      try {
        // Fetch agent messages from the agent_messages table
        const { data: messagesData, error: messagesError } = await supabase
          .from('agent_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500); // Limit to prevent too much data

        if (messagesError) {
          addToast({
            type: 'error',
            title: 'Failed to fetch messages',
            description: messagesError.message || 'An unexpected error occurred'
          });
          return;
        }

        setMessages(messagesData || []);

        // Extract unique agent names for filters
        const uniqueAgents = new Set<string>();
        (messagesData || []).forEach((msg) => {
          uniqueAgents.add(msg.from_agent);
          uniqueAgents.add(msg.to_agent);
        });
        setAgents(Array.from(uniqueAgents).sort());

      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to load messages',
          description: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('agent_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_messages',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [payload.new as AgentMessage, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as AgentMessage) : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleMessageClick = (message: AgentMessage) => {
    setSelectedMessage(message);
    setSidePanelOpen(true);
  };

  const handleMessageUpdate = async (messageId: string, updates: Partial<AgentMessage>) => {
    try {
      const { error } = await supabase
        .from('agent_messages')
        .update(updates)
        .eq('id', messageId);

      if (error) throw error;

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
      );

      if (selectedMessage?.id === messageId) {
        setSelectedMessage((prev) => prev ? { ...prev, ...updates } : null);
      }

      // Show success toast for read/unread operations
      if ('read' in updates) {
        addToast({
          type: 'success',
          title: `Message marked as ${updates.read ? 'read' : 'unread'}`,
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to update message',
        description: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  };

  // Apply filters and search
  const filteredMessages = messages.filter((message) => {
    // Apply filters
    if (filters.sender && message.from_agent !== filters.sender) return false;
    if (filters.receiver && message.to_agent !== filters.receiver) return false;
    if (filters.messageType && message.message_type !== filters.messageType) return false;
    if (filters.status === 'read' && !message.read) return false;
    if (filters.status === 'unread' && message.read) return false;
    if (filters.ackStatus === 'acked' && !message.acked) return false;
    if (filters.ackStatus === 'pending' && message.acked) return false;
    
    // Date range filter
    if (filters.dateRange?.from) {
      const messageDate = new Date(message.created_at);
      if (messageDate < filters.dateRange.from) return false;
    }
    if (filters.dateRange?.to) {
      const messageDate = new Date(message.created_at);
      if (messageDate > filters.dateRange.to) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        message.content.toLowerCase().includes(query) ||
        message.from_agent.toLowerCase().includes(query) ||
        message.to_agent.toLowerCase().includes(query) ||
        message.message_type.toLowerCase().includes(query)
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-xl text-zinc-600 dark:text-zinc-400">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/"
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              ← Back to Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const event = new KeyboardEvent('keydown', {
                    key: 'k',
                    metaKey: true,
                    bubbles: true,
                  });
                  document.dispatchEvent(event);
                }}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
              >
                <span>Search</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-zinc-200 dark:bg-zinc-700 rounded font-mono">⌘K</kbd>
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                💬 Agent Messages
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Inter-agent communication dashboard
              </p>
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {filteredMessages.length} of {messages.length} messages
              {filteredMessages.length !== messages.length && (
                <span className="ml-1 text-blue-600 dark:text-blue-400">(filtered)</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <MessageFilters 
            agents={agents} 
            messages={messages}
            messageTypes={Array.from(new Set(messages.map(m => m.message_type))).sort()}
            filterHook={filterHook}
          />
        </div>

        {/* Messages List */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Messages
            </h2>
          </div>
          <MessageList
            messages={filteredMessages}
            onMessageClick={handleMessageClick}
            onMessageUpdate={handleMessageUpdate}
          />
        </div>
      </main>

      {/* Message Details Side Panel */}
      <MessageDetails
        message={selectedMessage}
        open={sidePanelOpen}
        onOpenChange={setSidePanelOpen}
        onMessageUpdate={handleMessageUpdate}
      />
    </div>
  );
}