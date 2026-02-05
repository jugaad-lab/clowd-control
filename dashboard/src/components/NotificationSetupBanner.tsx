'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Settings } from 'lucide-react';

interface NotificationSetupBannerProps {
  projectId: string;
}

const DISMISS_KEY_PREFIX = 'mc-notification-banner-dismissed-';

function getInitialDismissed(projectId: string): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(`${DISMISS_KEY_PREFIX}${projectId}`);
  return stored === 'true';
}

export function NotificationSetupBanner({ projectId }: NotificationSetupBannerProps) {
  const [dismissed, setDismissed] = useState(() => getInitialDismissed(projectId));

  // Re-check when projectId changes
  useEffect(() => {
    setDismissed(getInitialDismissed(projectId));
  }, [projectId]);

  const handleDismiss = () => {
    localStorage.setItem(`${DISMISS_KEY_PREFIX}${projectId}`, 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4">
      <div className="relative bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 rounded"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3 pr-8">
          <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-200 text-sm">
              Set up PM notifications to get the most out of Clowd-Control
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Create a Discord webhook in your channel &rarr; open <strong>Settings &rarr; Notifications</strong> &rarr; paste the URL &rarr; click <strong>Test</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
