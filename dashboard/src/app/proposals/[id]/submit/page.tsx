'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  supabase,
  Proposal,
  Agent,
  IndependentOpinion,
  getAgents,
  getProposalOpinions,
} from '@/lib/supabase';
import { OpinionForm } from '@/components/proposals/OpinionForm';
import { useTheme } from '@/lib/hooks';
import {
  ArrowLeft,
  FileText,
  Lock,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

export default function SubmitOpinionPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [existingOpinions, setExistingOpinions] = useState<IndependentOpinion[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Only PM agents can submit opinions
  const pmAgents = agents.filter((a) => a.agent_type === 'pm');

  // Check if selected agent has already submitted
  const hasSubmitted = existingOpinions.some((o) => o.agent_id === selectedAgentId);

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

        // Fetch agents and existing opinions
        const [agentsData, opinionsData] = await Promise.all([
          getAgents(),
          getProposalOpinions(proposalId),
        ]);

        setAgents(agentsData);
        setExistingOpinions(opinionsData);

        // Auto-select first PM that hasn't submitted
        const pmAgents = agentsData.filter((a) => a.agent_type === 'pm');
        const notSubmitted = pmAgents.find(
          (pm) => !opinionsData.some((o) => o.agent_id === pm.id)
        );
        if (notSubmitted) {
          setSelectedAgentId(notSubmitted.id);
        } else if (pmAgents.length > 0) {
          setSelectedAgentId(pmAgents[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [proposalId]);

  const handleSubmitted = () => {
    setSubmitted(true);
    setExistingOpinions((prev) => [
      ...prev,
      { agent_id: selectedAgentId } as IndependentOpinion,
    ]);
  };

  const allSubmitted = pmAgents.every((pm) =>
    existingOpinions.some((o) => o.agent_id === pm.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-xl text-zinc-600 dark:text-zinc-400">
          Loading...
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

  const description = (proposal.content as { description?: string })?.description || '';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/proposals/${proposalId}`}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Proposal
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Proposal Summary */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono uppercase">
                {proposal.proposal_type.replace('_', ' ')}
              </span>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {proposal.title}
              </h1>
            </div>
          </div>
          {description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 ml-13">
              {description}
            </p>
          )}
        </div>

        {/* Isolation Warning */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 rounded-xl border border-amber-200 dark:border-amber-800/50 p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                Independent Input Mode
              </h2>
              <p className="text-sm text-amber-800 dark:text-amber-300/80">
                To prevent groupthink, you cannot see other PMs&apos; opinions until everyone has submitted.
                Your opinion is isolated and will be revealed simultaneously with others.
              </p>
            </div>
          </div>
        </div>

        {/* Agent Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Submitting as
          </label>
          <div className="relative">
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              disabled={submitted}
              className="w-full h-12 px-4 pr-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {pmAgents.map((agent) => {
                const hasOpinion = existingOpinions.some((o) => o.agent_id === agent.id);
                return (
                  <option key={agent.id} value={agent.id} disabled={hasOpinion}>
                    {agent.display_name} {agent.display_name ? `(${agent.display_name})` : ''}{' '}
                    {hasOpinion ? '✓ Submitted' : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Submission Status */}
        <div className="flex items-center gap-3 mb-6 text-sm">
          {pmAgents.map((agent) => {
            const hasOpinion = existingOpinions.some((o) => o.agent_id === agent.id);
            return (
              <div
                key={agent.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                  hasOpinion
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {hasOpinion ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {agent.display_name}
              </div>
            );
          })}
        </div>

        {/* Form or Success State */}
        {submitted || hasSubmitted ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
              Opinion Submitted
            </h2>
            <p className="text-emerald-600 dark:text-emerald-400 mb-6">
              {allSubmitted
                ? 'All opinions are in! You can now view the results.'
                : `Waiting for ${pmAgents.filter((pm) => !existingOpinions.some((o) => o.agent_id === pm.id)).length} more PM${pmAgents.filter((pm) => !existingOpinions.some((o) => o.agent_id === pm.id)).length > 1 ? 's' : ''} to submit.`}
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href={`/proposals/${proposalId}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
              >
                {allSubmitted ? 'View Results' : 'Return to Proposal'}
              </Link>
            </div>
          </div>
        ) : (
          <OpinionForm
            proposalId={proposalId}
            agentId={selectedAgentId}
            onSubmitted={handleSubmitted}
          />
        )}

        {/* All submitted notice */}
        {allSubmitted && !submitted && !hasSubmitted && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 p-5 mt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  All opinions have been submitted
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  You can now view the results on the proposal page.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
