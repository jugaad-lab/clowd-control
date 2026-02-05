'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/hooks';
import { useToast } from '@/components/ui/toast';
import { 
  Users, 
  Package, 
  Plus, 
  Copy, 
  Check, 
  ChevronRight,
  Globe,
  Lock,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Tribe {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  is_public: boolean;
  max_members: number;
  created_at: string;
}

interface TribeMember {
  id: string;
  tribe_id: string;
  agent_id: string;
  tier: number;
  status: string;
  joined_at: string;
}

interface TribeSkill {
  id: string;
  tribe_id: string;
  skill_name: string;
  description: string | null;
  submitted_by: string;
  status: string;
  created_at: string;
}

const tierLabels: Record<number, string> = {
  4: 'Owner',
  3: 'Member',
  2: 'Guest',
  1: 'Pending'
};

const tierColors: Record<number, string> = {
  4: 'text-amber-500',
  3: 'text-blue-500',
  2: 'text-zinc-400',
  1: 'text-zinc-500'
};

export default function TribesPage() {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [members, setMembers] = useState<Record<string, TribeMember[]>>({});
  const [skills, setSkills] = useState<Record<string, TribeSkill[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedTribe, setExpandedTribe] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { theme } = useTheme();
  const { addToast } = useToast();

  useEffect(() => {
    async function fetchTribes() {
      try {
        // Fetch tribes
        const { data: tribesData, error: tribesError } = await supabase
          .from('tribes')
          .select('*')
          .order('created_at', { ascending: false });

        if (tribesError) {
          addToast({
            type: 'error',
            title: 'Failed to fetch tribes',
            description: tribesError.message
          });
          return;
        }

        setTribes(tribesData || []);

        // Fetch members for all tribes
        const { data: membersData, error: membersError } = await supabase
          .from('tribe_members')
          .select('*')
          .in('tribe_id', (tribesData || []).map(t => t.id));

        if (!membersError && membersData) {
          const membersByTribe: Record<string, TribeMember[]> = {};
          membersData.forEach(m => {
            if (!membersByTribe[m.tribe_id]) membersByTribe[m.tribe_id] = [];
            membersByTribe[m.tribe_id].push(m);
          });
          setMembers(membersByTribe);
        }

        // Fetch skills for all tribes
        const { data: skillsData, error: skillsError } = await supabase
          .from('tribe_skills')
          .select('*')
          .in('tribe_id', (tribesData || []).map(t => t.id));

        if (!skillsError && skillsData) {
          const skillsByTribe: Record<string, TribeSkill[]> = {};
          skillsData.forEach(s => {
            if (!skillsByTribe[s.tribe_id]) skillsByTribe[s.tribe_id] = [];
            skillsByTribe[s.tribe_id].push(s);
          });
          setSkills(skillsByTribe);
        }

      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to load tribes',
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTribes();
  }, [addToast]);

  const copyInviteCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    addToast({ type: 'success', title: 'Invite code copied!' });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getMemberCount = (tribeId: string) => {
    return (members[tribeId] || []).filter(m => m.status === 'active').length;
  };

  const getApprovedSkillCount = (tribeId: string) => {
    return (skills[tribeId] || []).filter(s => s.status === 'approved').length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-48 mb-8" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-500" />
              Tribes
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Communities for sharing skills and collaborating across Clawdbots
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Tribes Grid */}
        {tribes.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <Users className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
              No tribes yet
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Create your first tribe to start sharing skills with other Clawdbots.
            </p>
            <code className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded text-sm">
              ./scripts/tribes/tribe-create.sh &quot;My Tribe&quot; &quot;Description&quot;
            </code>
          </div>
        ) : (
          <div className="space-y-4">
            {tribes.map(tribe => (
              <div
                key={tribe.id}
                className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                {/* Tribe Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  onClick={() => setExpandedTribe(expandedTribe === tribe.id ? null : tribe.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center",
                        tribe.is_public 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-indigo-100 dark:bg-indigo-900/30"
                      )}>
                        {tribe.is_public 
                          ? <Globe className="w-6 h-6 text-green-600 dark:text-green-400" />
                          : <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        }
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                          {tribe.name}
                        </h3>
                        {tribe.description && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            {tribe.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {getMemberCount(tribe.id)} / {tribe.max_members}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {getApprovedSkillCount(tribe.id)} skills
                          </span>
                          <span>
                            Created {formatDistanceToNow(new Date(tribe.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyInviteCode(tribe.invite_code);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
                      >
                        {copiedCode === tribe.invite_code ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        Invite Code
                      </button>
                      <ChevronRight className={cn(
                        "w-5 h-5 text-zinc-400 transition-transform",
                        expandedTribe === tribe.id && "rotate-90"
                      )} />
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedTribe === tribe.id && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 p-6 bg-zinc-50/50 dark:bg-zinc-800/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Members */}
                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Members
                        </h4>
                        {(members[tribe.id] || []).length === 0 ? (
                          <p className="text-sm text-zinc-500">No members yet</p>
                        ) : (
                          <div className="space-y-2">
                            {(members[tribe.id] || []).map(member => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between py-2 px-3 bg-white dark:bg-zinc-900 rounded-md"
                              >
                                <span className="font-medium text-zinc-900 dark:text-white">
                                  @{member.agent_id}
                                </span>
                                <span className={cn("text-sm", tierColors[member.tier])}>
                                  {tierLabels[member.tier]}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Skills */}
                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Shared Skills
                        </h4>
                        {(skills[tribe.id] || []).length === 0 ? (
                          <p className="text-sm text-zinc-500">No skills shared yet</p>
                        ) : (
                          <div className="space-y-2">
                            {(skills[tribe.id] || []).map(skill => (
                              <div
                                key={skill.id}
                                className="py-2 px-3 bg-white dark:bg-zinc-900 rounded-md"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-zinc-900 dark:text-white">
                                    {skill.skill_name}
                                  </span>
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    skill.status === 'approved' 
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : skill.status === 'pending'
                                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  )}>
                                    {skill.status}
                                  </span>
                                </div>
                                {skill.description && (
                                  <p className="text-sm text-zinc-500 mt-1">{skill.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CLI Help */}
                    <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs text-zinc-500 mb-2">Quick CLI commands:</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <code className="bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded">
                          tribe-join.sh {tribe.invite_code}
                        </code>
                        <code className="bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded">
                          skill-submit.sh {tribe.id.slice(0, 8)}... skill-name
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
