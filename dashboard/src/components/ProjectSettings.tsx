'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, X, Bell, CheckCircle, XCircle, Loader2, Users, Globe, Lock, Plus, Trash2 } from 'lucide-react';
import {
  ProjectSettings as ProjectSettingsType,
  ExecutionMode,
  SprintApproval,
  NotificationTypes,
  DEFAULT_NOTIFICATION_TYPES,
  ProjectMember,
  Profile,
  Project,
} from '@/lib/supabase';

interface ProjectSettingsProps {
  projectId: string;
  project: Project;
  settings: ProjectSettingsType;
  onSettingsUpdate: (settings: ProjectSettingsType) => void;
  className?: string;
}

const executionModeOptions: Array<{
  value: ExecutionMode;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'manual',
    label: 'Manual',
    description: 'PM waits for your go-ahead',
    icon: '🟢',
  },
  {
    value: 'full_speed',
    label: 'Full Speed',
    description: 'PM chains through all tasks',
    icon: '🔥',
  },
  {
    value: 'background',
    label: 'Background',
    description: 'PM works via heartbeat',
    icon: '⏰',
  },
];

const sprintApprovalOptions: Array<{
  value: SprintApproval;
  label: string;
  description: string;
}> = [
  {
    value: 'required',
    label: 'Required',
    description: 'Review before next sprint',
  },
  {
    value: 'auto',
    label: 'Auto',
    description: 'Advance automatically',
  },
];

const notificationTypeLabels: Record<keyof NotificationTypes, string> = {
  task_started: 'Task started (Start button pressed)',
  mode_changed: 'Execution mode changed',
  bug_reported: 'Bug reported',
  task_completed: 'Task completed',
  sprint_completed: 'Sprint completed',
};

export function ProjectSettings({ projectId, project, settings, onSettingsUpdate, className }: ProjectSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<ProjectSettingsType>({
    ...settings,
    notify_channel: settings.notify_channel ?? null,
    notification_webhook_url: settings.notification_webhook_url ?? null,
    notification_types: settings.notification_types ?? DEFAULT_NOTIFICATION_TYPES,
  });
  const [localVisibility, setLocalVisibility] = useState<'public' | 'private'>(project.visibility);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  
  // Member management state
  const [members, setMembers] = useState<(ProjectMember & { profile: Profile })[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [addingMember, setAddingMember] = useState(false);

  // Load member data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMemberData();
    }
  }, [isOpen]);

  const loadMemberData = async () => {
    setLoadingMembers(true);
    try {
      // Load current members
      const membersResponse = await fetch(`/api/projects/${projectId}/members`);
      if (membersResponse.ok) {
        const { members: memberData } = await membersResponse.json();
        setMembers(memberData);
      }

      // Load available users
      const usersResponse = await fetch(`/api/projects/${projectId}/members?action=available-users`);
      if (usersResponse.ok) {
        const { users } = await usersResponse.json();
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error loading member data:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberUserId) return;
    
    setAddingMember(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: newMemberUserId,
          role: newMemberRole,
        }),
      });

      if (response.ok) {
        setNewMemberUserId('');
        setNewMemberRole('member');
        await loadMemberData();
      } else {
        console.error('Failed to add member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members?user_id=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadMemberData();
      } else {
        console.error('Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...localSettings,
          visibility: localVisibility,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      onSettingsUpdate(localSettings);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!localSettings.notification_webhook_url) return;
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/test-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: localSettings.notification_webhook_url }),
      });

      const data = await response.json();
      setTestResult(data.success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleCancel = () => {
    setLocalSettings({
      ...settings,
      notify_channel: settings.notify_channel ?? null,
      notification_webhook_url: settings.notification_webhook_url ?? null,
      notification_types: settings.notification_types ?? DEFAULT_NOTIFICATION_TYPES,
    });
    setLocalVisibility(project.visibility);
    setTestResult(null);
    setIsOpen(false);
  };

  const toggleNotificationType = (type: keyof NotificationTypes) => {
    setLocalSettings({
      ...localSettings,
      notification_types: {
        ...(localSettings.notification_types ?? DEFAULT_NOTIFICATION_TYPES),
        [type]: !(localSettings.notification_types ?? DEFAULT_NOTIFICATION_TYPES)[type],
      },
    });
  };

  const webhookConfigured = !!localSettings.notification_webhook_url;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors ${className}`}
        title="Project Settings"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Settings</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Project Settings
          </h2>
          <button
            onClick={handleCancel}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Execution Mode */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Execution Mode
            </label>
            <div className="space-y-2">
              {executionModeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="execution_mode"
                    value={option.value}
                    checked={localSettings.execution_mode === option.value}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        execution_mode: e.target.value as ExecutionMode,
                      })
                    }
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-white">
                      <span>{option.icon}</span>
                      {option.label}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Sprint Approval */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Sprint Approval
            </label>
            <div className="space-y-2">
              {sprintApprovalOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="sprint_approval"
                    value={option.value}
                    checked={localSettings.sprint_approval === option.value}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        sprint_approval: e.target.value as SprintApproval,
                      })
                    }
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-zinc-900 dark:text-white">
                      {option.label}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Budget Limit */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Budget Limit Per Sprint
            </label>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Enter token limit (optional)"
                value={localSettings.budget_limit_per_sprint || ''}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    budget_limit_per_sprint: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Maximum tokens the PM can consume per sprint. Leave empty for no limit.
              </p>
            </div>
          </div>

          {/* Project Visibility */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Project Visibility
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={localVisibility === 'public'}
                  onChange={(e) => setLocalVisibility(e.target.value as 'public' | 'private')}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-white">
                    <Globe className="w-4 h-4" />
                    Public
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Anyone can view this project and its tasks
                  </p>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={localVisibility === 'private'}
                  onChange={(e) => setLocalVisibility(e.target.value as 'public' | 'private')}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-white">
                    <Lock className="w-4 h-4" />
                    Private
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Only project members can access this project
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Project Members */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Project Members
              </label>
            </div>

            {/* Current Members */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Current Members
              </label>
              {loadingMembers ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading members...
                </div>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-900 dark:text-white">
                          {member.profile.display_name || member.profile.email}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {member.role} • {member.profile.email}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-2">
                      No members added yet
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add Member */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Add Member
              </label>
              <div className="flex gap-2">
                <select
                  value={newMemberUserId}
                  onChange={(e) => setNewMemberUserId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={addingMember}
                >
                  <option value="">Select user...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.display_name || user.email} ({user.email})
                    </option>
                  ))}
                </select>
                
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'member' | 'viewer')}
                  className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={addingMember}
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                
                <button
                  onClick={handleAddMember}
                  disabled={!newMemberUserId || addingMember}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {addingMember ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-200 dark:border-zinc-700" />

          {/* Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Notifications
              </label>
              {/* Status indicator */}
              <span
                className={`ml-auto inline-flex items-center gap-1.5 text-xs font-medium ${
                  (localSettings.notify_channel || webhookConfigured)
                    ? testResult === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : testResult === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    (localSettings.notify_channel || webhookConfigured)
                      ? testResult === 'error'
                        ? 'bg-red-500'
                        : 'bg-green-500'
                      : 'bg-zinc-400 dark:bg-zinc-600'
                  }`}
                />
                {(localSettings.notify_channel || webhookConfigured)
                  ? testResult === 'error'
                    ? 'Error'
                    : localSettings.notify_channel
                    ? 'Channel configured'
                    : 'Webhook configured'
                  : 'Not configured'}
              </span>
            </div>

            {/* Discord Channel ID (Preferred) */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Discord Channel ID <span className="text-green-600">(Preferred)</span>
              </label>
              <input
                type="text"
                placeholder="e.g., 1234567890123456789"
                value={localSettings.notify_channel || ''}
                onChange={(e) => {
                  setLocalSettings({
                    ...localSettings,
                    notify_channel: e.target.value || null,
                  });
                }}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Right-click channel → Copy Channel ID. Enables @mentions for PMs.
              </p>
            </div>

            {/* Discord Webhook URL (Fallback) */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Discord Webhook URL <span className="text-zinc-400">(Fallback)</span>
              </label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={localSettings.notification_webhook_url || ''}
                onChange={(e) => {
                  setLocalSettings({
                    ...localSettings,
                    notification_webhook_url: e.target.value || null,
                  });
                  setTestResult(null);
                }}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />

              {/* Test Connection Button */}
              <button
                onClick={handleTestWebhook}
                disabled={!localSettings.notification_webhook_url || testingWebhook}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
              >
                {testingWebhook ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : testResult === 'success' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                ) : testResult === 'error' ? (
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
                {testingWebhook
                  ? 'Testing...'
                  : testResult === 'success'
                  ? 'Test Passed'
                  : testResult === 'error'
                  ? 'Test Failed — Check URL'
                  : 'Test Webhook'}
              </button>
            </div>

            {/* Notification Types */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Notify on these events
              </label>
              <div className="space-y-1">
                {(Object.keys(notificationTypeLabels) as Array<keyof NotificationTypes>).map(
                  (type) => (
                    <label
                      key={type}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={
                          (localSettings.notification_types ?? DEFAULT_NOTIFICATION_TYPES)[type]
                        }
                        onChange={() => toggleNotificationType(type)}
                        className="rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {notificationTypeLabels[type]}
                      </span>
                    </label>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
