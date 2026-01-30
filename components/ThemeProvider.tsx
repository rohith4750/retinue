'use client'

import React, { createContext, useEffect, useMemo, useState } from 'react'

export type AppTheme = 'dark'

type ThemeContextValue = {
  theme: AppTheme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme() {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = 'dark'
  document.documentElement.style.colorScheme = 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<AppTheme>('dark')

  useEffect(() => {
    applyTheme()
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({ theme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

