'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  supabase,
  Proposal,
  IndependentOpinion,
  DebateRound,
  SycophancyFlag,
  Agent,
  getAgents,
  getProposalOpinions,
  getDebateRounds,
  getSycophancyFlags,
  updateProposalStatus,
} from '@/lib/supabase';
import { checkAndFlagSycophancy } from '@/lib/sycophancy';
import { OpinionReveal } from '@/components/proposals/OpinionReveal';
import { ConcernsMatrix } from '@/components/proposals/ConcernsMatrix';
import { DebateRoundCard } from '@/components/proposals/DebateRoundCard';
import { SycophancyBanner } from '@/components/proposals/SycophancyBanner';
import { useTheme } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  FileText,
  Clock,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

// Type for proposal content - handles both project creation and generic proposals
interface ProposalContent {
  type?: 'project_creation' | string;
  project?: {
    name?: string;
    description?: string;
    plan?: unknown;
    [key: string]: unknown;
  };
  plan?: unknown;
  [key: string]: unknown;
}

type TabType = 'opinions' | 'concerns' | 'debate';

const statusConfig: Record<Proposal['status'], { label: string; color: string; bg: string }> = {
  open: {
    label: 'Awaiting Opinions',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
  },
  debating: {
    label: 'Debating',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
  },
  consensus: {
    label: 'Consensus Reached',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
  },
  escalated: {
    label: 'Escalated',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/50',
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-zinc-600 dark:text-zinc-400',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
  },
};

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [opinions, setOpinions] = useState<IndependentOpinion[]>([]);
  const [debateRounds, setDebateRounds] = useState<DebateRound[]>([]);
  const [sycophancyFlags, setSycophancyFlags] = useState<SycophancyFlag[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('opinions');
  const [isRevealed, setIsRevealed] = useState(false);
  const [checkingSycophancy, setCheckingSycophancy] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // PM agents for opinion tracking
  const pmAgents = agents.filter((a) => a.agent_type === 'pm');
  const expectedOpinionCount = pmAgents.length;
  const allOpinionsSubmitted = opinions.length >= expectedOpinionCount && expectedOpinionCount > 0;

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch proposal
        const { data: proposalData, error: proposalError } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', proposalId)
          .single();

        if (proposalError) throw proposalError;
        setProposal(proposalData as Proposal);

        // Fetch related data in parallel
        const [opinionsData, roundsData, flagsData, agentsData] = await Promise.all([
          getProposalOpinions(proposalId),
          getDebateRounds(proposalId),
          getSycophancyFlags(proposalId),
          getAgents(),
        ]);

        setOpinions(opinionsData);
        setDebateRounds(roundsData);
        setSycophancyFlags(flagsData);
        setAgents(agentsData);

        // Auto-reveal if opinions exist and proposal moved past 'open'
        if (
          opinionsData.length > 0 &&
          proposalData.status !== 'open'
        ) {
          setIsRevealed(true);
        }
      } catch (error) {
        console.error('Error fetching proposal:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [proposalId]);

  const handleReveal = async () => {
    if (!allOpinionsSubmitted) return;

    setIsRevealed(true);

    // Run sycophancy check
    setCheckingSycophancy(true);
    try {
      const result = await checkAndFlagSycophancy(proposalId, opinions);
      if (result.flagged) {
        // Refresh flags
        const newFlags = await getSycophancyFlags(proposalId);
        setSycophancyFlags(newFlags);
      }

      // Update proposal status to debating
      if (proposal?.status === 'open') {
        await updateProposalStatus(proposalId, 'debating');
        setProposal((prev) => prev ? { ...prev, status: 'debating' } : null);
      }
    } catch (error) {
      console.error('Error checking sycophancy:', error);
    } finally {
      setCheckingSycophancy(false);
    }
  };

  const handleDismissFlag = async (flagId: string) => {
    // Mark flag as reviewed (dismissed)
    try {
      await supabase
        .from('sycophancy_flags')
        .update({
          reviewed_by: 'human',
          reviewed_at: new Date().toISOString(),
          was_false_positive: true,
          resolution_notes: 'Dismissed by reviewer',
        })
        .eq('id', flagId);

      setSycophancyFlags((prev) =>
        prev.map((f) =>
          f.id === flagId
            ? { ...f, reviewed_by: 'human', reviewed_at: new Date().toISOString() }
            : f
        )
      );
    } catch (error) {
      console.error('Error dismissing flag:', error);
    }
  };

  const handleMarkFalsePositive = async (flagId: string) => {
    handleDismissFlag(flagId);
  };

  const tabs: Array<{ id: TabType; label: string; icon: typeof Users; count?: number }> = [
    { id: 'opinions', label: 'Opinions', icon: Users, count: opinions.length },
    { id: 'concerns', label: 'Concerns', icon: AlertTriangle },
    { id: 'debate', label: 'Debate', icon: MessageSquare, count: debateRounds.length },
  ];

  const maxRound = Math.max(...debateRounds.map((r) => r.round_number), 0);
  const canStartNewRound = maxRound < 3;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-xl text-zinc-600 dark:text-zinc-400">
          Loading proposal...
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-xl text-red-600">Proposal not found</div>
      </div>
    );
  }

  const status = statusConfig[proposal.status];
  const description = (proposal.content as { description?: string })?.description || '';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/projects/${proposal.project_id}/proposals`}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Proposals
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>

          {/* Proposal Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color} ${status.bg}`}>
                  {status.label}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono uppercase">
                  {proposal.proposal_type.replace('_', ' ')}
                </span>
              </div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                {proposal.title}
              </h1>
              {description && (
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  {description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(proposal.proposed_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {opinions.length} / {expectedOpinionCount} opinions
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Project Creation Approval - Full review with PM selection */}
        {(proposal.content as ProposalContent)?.type === 'project_creation' && proposal.status === 'open' && (
          <ProjectApprovalCard 
            proposal={proposal}
            agents={agents}
            onApprove={async (selectedPmId: string) => {
              // Create the project with selected PM
              const projectData = (proposal.content as ProposalContent).project;
              if (!projectData || !projectData.name) {
                alert('Invalid project data in proposal');
                return;
              }
              const { data: newProject, error } = await supabase
                .from('projects')
                .insert({
                  name: projectData.name,
                  description: (projectData.description as string) || null,
                  status: 'active',
                  owner_type: (projectData.owner_type as string) || 'human',
                  owner_ids: ['yajat'],
                  current_pm_id: selectedPmId,
                  tags: [],
                  settings: projectData.settings || {
                    require_dual_pm_consensus: false,
                    max_debate_rounds: 3,
                    auto_flag_instant_consensus: true,
                  }
                })
                .select()
                .single();
              
              if (error) {
                alert('Failed to create project: ' + error.message);
                return;
              }
              
              // Update proposal status
              await updateProposalStatus(proposal.id, 'approved');
              setProposal(prev => prev ? { ...prev, status: 'approved' } : null);
              
              // Redirect to new project
              router.push(`/projects/${newProject.id}`);
            }}
            onReject={async () => {
              await updateProposalStatus(proposal.id, 'rejected');
              setProposal(prev => prev ? { ...prev, status: 'rejected' } : null);
            }}
          />
        )}

        {/* Sycophancy Warnings */}
        {sycophancyFlags.length > 0 && (
          <div className="mb-6">
            <SycophancyBanner
              flags={sycophancyFlags}
              onDismiss={handleDismissFlag}
              onMarkFalsePositive={handleMarkFalsePositive}
            />
          </div>
        )}

        {/* Reveal State - only show for non-project-creation proposals */}
        {(proposal.content as ProposalContent)?.type !== 'project_creation' && !isRevealed && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mx-auto mb-4 flex items-center justify-center">
              <EyeOff className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
              Opinions Hidden
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
              {allOpinionsSubmitted
                ? 'All PM opinions have been submitted. Reveal to see the results and begin the debate phase.'
                : `Waiting for ${expectedOpinionCount - opinions.length} more opinion${expectedOpinionCount - opinions.length > 1 ? 's' : ''} before reveal.`}
            </p>

            {/* Opinion submission status */}
            <div className="flex justify-center gap-3 mb-6">
              {pmAgents.map((agent) => {
                const hasSubmitted = opinions.some((o) => o.agent_id === agent.id);
                return (
                  <div
                    key={agent.id}
                    className={`px-3 py-2 rounded-lg border ${
                      hasSubmitted
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        hasSubmitted
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {hasSubmitted ? '✓' : '○'} {agent.display_name}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center gap-3">
              <Link href={`/proposals/${proposalId}/submit`}>
                <Button variant="outline">Submit Opinion</Button>
              </Link>
              {allOpinionsSubmitted && (
                <Button onClick={handleReveal} disabled={checkingSycophancy}>
                  {checkingSycophancy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Reveal Opinions
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Revealed Content */}
        {isRevealed && (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1 text-xs bg-zinc-200 dark:bg-zinc-600 px-1.5 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'opinions' && (
              <OpinionReveal opinions={opinions} agents={agents} />
            )}

            {activeTab === 'concerns' && (
              <ConcernsMatrix opinions={opinions} agents={agents} />
            )}

            {activeTab === 'debate' && (
              <div className="space-y-6">
                {maxRound === 0 ? (
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 text-center">
                    <MessageSquare className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      No Debate Rounds Yet
                    </h3>
                    <p className="text-zinc-400 text-sm mb-4">
                      Review the opinions and concerns, then start a debate round if needed.
                    </p>
                    {canStartNewRound && (
                      <Button>Start Debate Round 1</Button>
                    )}
                  </div>
                ) : (
                  Array.from({ length: maxRound }, (_, i) => i + 1).map((roundNum) => (
                    <DebateRoundCard
                      key={roundNum}
                      roundNumber={roundNum}
                      rounds={debateRounds}
                      agents={agents}
                      isLatestRound={roundNum === maxRound}
                      canStartNewRound={canStartNewRound && roundNum === maxRound}
                    />
                  ))
                )}
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {proposal.status === 'debating' && (
                  <>Debate in progress — max 3 rounds</>
                )}
              </div>
              <div className="flex items-center gap-3">
                {proposal.status === 'debating' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await updateProposalStatus(proposalId, 'escalated');
                        setProposal((prev) => prev ? { ...prev, status: 'escalated' } : null);
                      }}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Escalate to Human
                    </Button>
                    <Button
                      onClick={async () => {
                        await updateProposalStatus(proposalId, 'consensus');
                        setProposal((prev) => prev ? { ...prev, status: 'consensus' } : null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Consensus
                    </Button>
                  </>
                )}
                {proposal.status === 'consensus' && (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Consensus Reached</span>
                  </div>
                )}
                {proposal.status === 'escalated' && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Escalated for Human Review</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Full approval card for project creation proposals with PM selection and plan
function ProjectApprovalCard({ 
  proposal, 
  onApprove, 
  onReject,
  agents,
}: { 
  proposal: Proposal; 
  onApprove: (pmId: string) => Promise<void>; 
  onReject: () => Promise<void>;
  agents: Agent[];
}) {
  const [loading, setLoading] = useState(false);
  const [selectedPm, setSelectedPm] = useState<string>('');
  const content = proposal.content as ProposalContent;
  const project = content?.project;
  const plan = content?.plan || project?.plan || null;

  // Initialize selected PM from proposal
  useEffect(() => {
    const pmId = project?.pm_id as string | undefined;
    setSelectedPm(pmId || 'chhotu');
  }, [project]);

  const pmAgents = agents.filter(a => a.agent_type === 'pm');

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(selectedPm);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 p-6 mb-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center shrink-0">
          <span className="text-2xl">📁</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
            New Project Request
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            Review the project details and approve to create it.
          </p>
        </div>
      </div>
      
      {/* Project Details */}
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-4">
        <h3 className="font-medium text-zinc-900 dark:text-white mb-3">Project Details</h3>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400 mb-1">Name</dt>
            <dd className="font-medium text-lg text-zinc-900 dark:text-white">{project?.name || 'Unnamed'}</dd>
          </div>
          {project?.description && (
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400 mb-1">Description</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">{String(project.description)}</dd>
            </div>
          )}
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400 mb-1">Proposed by</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">@{proposal.proposed_by}</dd>
          </div>
        </dl>
      </div>

      {/* Plan Section */}
      {plan && (
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 mb-4 border border-blue-200 dark:border-blue-800">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            📋 Proposed Plan
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
            {typeof plan === 'string' ? plan : JSON.stringify(plan, null, 2)}
          </div>
        </div>
      )}

      {/* PM Selection */}
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-zinc-900 dark:text-white mb-3">Assign Project Manager</h3>
        <div className="grid grid-cols-2 gap-2">
          {pmAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedPm(agent.id)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedPm === agent.id
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
            >
              <div className="font-medium text-zinc-900 dark:text-white">
                {selectedPm === agent.id && '✓ '}{agent.display_name}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                @{agent.id} • {agent.display_name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <Button
          onClick={handleApprove}
          disabled={loading || !selectedPm}
          className="bg-green-600 hover:bg-green-500 text-white flex-1"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Approve & Create Project
        </Button>
        <Button
          variant="outline"
          onClick={handleReject}
          disabled={loading}
          className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}
