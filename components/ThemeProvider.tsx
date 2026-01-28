'use client'

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'

export type AppTheme = 'dark' | 'light'

type ThemeContextValue = {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  // Helps native form controls match theme
  document.documentElement.style.colorScheme = theme
}

function getInitialTheme(): AppTheme {
  if (typeof window === 'undefined') return 'dark'
  const saved = window.localStorage.getItem('theme')
  if (saved === 'light' || saved === 'dark') return saved
  // Default to dark (current theme), but respect system preference when no saved choice
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
  return prefersDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('dark')

  useEffect(() => {
    const initial = getInitialTheme()
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next)
    try {
      window.localStorage.setItem('theme', next)
    } catch {
      // ignore
    }
    applyTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

