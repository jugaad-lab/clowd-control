'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProjects, getAgents, Project, Agent, supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/hooks';
import { sortAgentsBySkillLevel, getModelDisplayName } from '@/lib/agents';
import { SkillLevelBadge } from '@/components/SkillLevelBadge';
import { ActivityFeed } from '@/components/ActivityFeed';
import { AgentProfileEditor } from '@/components/AgentProfileEditor';
import { HumanAttentionQueue } from '@/components/HumanAttentionQueue';

const statusColors: Record<Project['status'], string> = {
  planning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  paused: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  archived: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    async function fetchData() {
      try {
        const [projectsData, agentsData] = await Promise.all([
          getProjects(),
          getAgents(),
        ]);
        setProjects(projectsData);
        setAgents(agentsData);
      } catch {
        // Failed to fetch data - will show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // Subscribe to project changes
    const projectSub = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        getProjects().then(setProjects);
      })
      .subscribe();

    return () => {
      projectSub.unsubscribe();
    };
  }, []);

  const getAgentName = (id: string | null) => {
    if (!id) return 'Unassigned';
    const agent = agents.find((a) => a.id === id);
    return agent ? agent.display_name : id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-xl text-zinc-600 dark:text-zinc-400">Loading Clowd-Control...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                🚀 Clowd-Control
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Multi-agent project coordination
              </p>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-2 mr-4">
                <Link
                  href="/proposals"
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900 transition-colors"
                >
                  📋 Proposals
                </Link>
                <Link
                  href="/debates"
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  💬 Debates
                </Link>
                <Link
                  href="/messages"
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  📬 Messages
                </Link>
                <Link
                  href="/review"
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  👀 Review Queue
                </Link>
                <Link
                  href="/predictions"
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  📊 Predictions
                </Link>
              </nav>
              <span className="text-sm text-zinc-500">
                {agents.filter((a) => a.agent_type === 'pm').length} PMs •{' '}
                {agents.filter((a) => a.agent_type === 'specialist').length} Specialists
              </span>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Human Attention Queue */}
        <div className="mb-8">
          <HumanAttentionQueue />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {projects.length}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Projects</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="text-2xl font-bold text-green-600">
              {projects.filter((p) => p.status === 'active').length}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Active</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="text-2xl font-bold text-yellow-600">
              {projects.filter((p) => p.status === 'planning').length}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Planning</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="text-2xl font-bold text-blue-600">
              {projects.filter((p) => p.status === 'completed').length}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Completed</div>
          </div>
        </div>

        {/* Projects Grid */}
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
          Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="text-zinc-500 dark:text-zinc-400">No projects yet.</div>
              <div className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                Create a project via the CLI to get started.
              </div>
            </div>
          )}
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {project.name}
                </h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    statusColors[project.status]
                  }`}
                >
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center justify-between text-sm">
                <div className="text-zinc-500 dark:text-zinc-500">
                  PM: {getAgentName(project.current_pm_id)}
                </div>
                {project.deadline && (
                  <div className="text-zinc-400">
                    Due: {new Date(project.deadline).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {/* Two-column layout: Agents + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-12">
          {/* Agents Section */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
              Agent Registry
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortAgentsBySkillLevel(agents).map((agent) => (
                <div
                  key={agent.id}
                  className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 group"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        agent.is_active ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {agent.display_name}
                        </span>
                        <SkillLevelBadge level={agent.skill_level} size="sm" />
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 truncate" title={agent.role}>
                        {agent.role}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5" title={agent.model}>
                        {getModelDisplayName(agent.model)}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingAgent(agent)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 
                               rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 
                               text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      title="Edit agent profile"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {agents.length === 0 && !loading && (
                <div className="col-span-full text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
                  No agents registered yet.
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
              Recent Activity
            </h2>
            <ActivityFeed limit={15} />
          </div>
        </div>
      </main>

      {/* Agent Profile Editor Modal */}
      {editingAgent && (
        <AgentProfileEditor
          agent={editingAgent}
          isOpen={!!editingAgent}
          onClose={() => setEditingAgent(null)}
        />
      )}
    </div>
  );
}
