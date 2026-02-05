'use client';

import { useEffect, useState } from 'react';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return stored || (prefersDark ? 'dark' : 'light');
}

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return { theme, toggleTheme };
}
