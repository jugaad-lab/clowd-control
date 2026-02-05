'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { supabase, Proposal } from '@/lib/supabase';
import { ArrowLeft, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

const statusConfig: Record<Proposal['status'], { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', icon: <Clock className="w-4 h-4" /> },
  debating: { label: 'Debating', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300', icon: <MessageSquare className="w-4 h-4" /> },
  consensus: { label: 'Consensus', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', icon: <CheckCircle className="w-4 h-4" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', icon: <CheckCircle className="w-4 h-4" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', icon: <XCircle className="w-4 h-4" /> },
  escalated: { label: 'Escalated', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300', icon: <Clock className="w-4 h-4" /> },
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProposals() {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('proposed_at', { ascending: false });
      
      if (!error && data) {
        setProposals(data);
      }
      setLoading(false);
    }
    fetchProposals();

    // Real-time subscription
    const sub = supabase
      .channel('proposals-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => {
        fetchProposals();
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const pendingProposals = proposals.filter(p => p.status === 'open' || p.status === 'debating');
  const resolvedProposals = proposals.filter(p => !['open', 'debating'].includes(p.status));

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500">Loading proposals...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              📋 Proposals
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Review and approve agent proposals
            </p>
          </div>
        </div>

        {/* Pending Approvals */}
        {pendingProposals.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              Pending Approval ({pendingProposals.length})
            </h2>
            <div className="space-y-3">
              {pendingProposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {pendingProposals.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center mb-8">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-zinc-600 dark:text-zinc-400">No pending proposals</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
              All caught up! Agents will create proposals when needed.
            </div>
          </div>
        )}

        {/* Resolved */}
        {resolvedProposals.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Resolved ({resolvedProposals.length})
            </h2>
            <div className="space-y-3 opacity-75">
              {resolvedProposals.slice(0, 10).map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const config = statusConfig[proposal.status] || statusConfig.open;
  const content = proposal.content as Record<string, unknown>;
  
  // Check if this is a project creation proposal
  const isProjectProposal = content?.type === 'project_creation';
  const project = content?.project as Record<string, unknown> | undefined;
  const projectName = isProjectProposal && project?.name ? String(project.name) : null;

  return (
    <Link
      href={`/proposals/${proposal.id}`}
      className="block bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
              {config.icon}
              {config.label}
            </span>
            {isProjectProposal && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                📁 New Project
              </span>
            )}
          </div>
          <h3 className="font-medium text-zinc-900 dark:text-white truncate">
            {proposal.title}
          </h3>
          {projectName && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Project: {projectName}
            </p>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
            Proposed by @{proposal.proposed_by} • {formatDistanceToNow(new Date(proposal.proposed_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Link>
  );
}
