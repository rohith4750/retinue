'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getStoredUser, clearAuth, type AuthUser } from '@/lib/auth-storage'
import { clearSessionTimeout } from '@/lib/session-manager'
import { getMenuSectionsForRole, isMenuItemActive, type MenuVariant } from '@/lib/navigation-config'
import { FaHotel, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa'

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  const handleLogout = () => {
    setIsMobileOpen(false)
    clearSessionTimeout()
    clearAuth()

    // Prefer hard navigation so logout always works even if router state is stale.
    try {
      window.location.assign('/login')
    } catch {
      router.replace('/login')
    }
  }

  if (!user) return null

  const menuSections = getMenuSectionsForRole(user.role)

  const variantStyles: Record<MenuVariant, { activeClass: string; iconClass: string; dotClass: string; inactiveIconClass: string }> = {
    sky: {
      activeClass: 'bg-gradient-to-r from-sky-500/20 to-indigo-500/10 text-sky-400 border border-sky-500/20 shadow-[0_0_20px_rgba(14,165,233,0.15)]',
      iconClass: 'text-sky-400',
      dotClass: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]',
      inactiveIconClass: 'text-slate-500 group-hover:text-sky-400',
    },
    purple: {
      activeClass: 'bg-gradient-to-r from-purple-500/20 to-fuchsia-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
      iconClass: 'text-purple-400',
      dotClass: 'bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.8)]',
      inactiveIconClass: 'text-slate-500 group-hover:text-purple-400',
    },
    emerald: {
      activeClass: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.15)]',
      iconClass: 'text-emerald-400',
      dotClass: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]',
      inactiveIconClass: 'text-slate-500 group-hover:text-emerald-400',
    },
    amber: {
      activeClass: 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.15)]',
      iconClass: 'text-amber-400',
      dotClass: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]',
      inactiveIconClass: 'text-slate-500 group-hover:text-amber-400',
    },
    blue: {
      activeClass: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(96,165,250,0.15)]',
      iconClass: 'text-blue-400',
      dotClass: 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]',
      inactiveIconClass: 'text-slate-500 group-hover:text-blue-400',
    },
    slate: {
      activeClass: 'bg-gradient-to-r from-slate-500/20 to-gray-500/10 text-slate-200 border border-slate-500/30',
      iconClass: 'text-slate-200',
      dotClass: 'bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.8)]',
      inactiveIconClass: 'text-slate-500 group-hover:text-slate-200',
    },
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-slate-900/80 backdrop-blur-xl p-2 rounded-lg border border-white/5 text-slate-100"
      >
        {isMobileOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
      </button>

      {/* Sidebar - Glassmorphism & Gradient Border */}
      <aside
        className={`fixed left-0 top-0 h-full w-[17.5rem] lg:w-72 2xl:w-80 backdrop-blur-3xl bg-slate-950/80 border-r border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-40 transition-transform duration-300 overflow-y-auto sidebar-scrollbar ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        {/* Subtle top gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-sky-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col h-full relative z-10">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-white/5 relative overflow-hidden group">
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

            <Link
              href="/dashboard"
              className="flex items-start gap-3 no-underline relative"
            >
              <div className="w-10 h-10 xl:w-11 xl:h-11 shrink-0 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform duration-300">
                <FaHotel className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm xl:text-base font-bold text-white leading-tight tracking-wide">THE RETINUE</p>
                <p className="text-[10px] xl:text-xs text-slate-400 leading-tight mt-1 font-medium">
                  Hotel & <span className="text-sky-400">Conventions</span>
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {menuSections.map((section, sectionIndex) => (
              <div key={section.id}>
                <div className={`flex items-center gap-2 px-3 mb-2 ${sectionIndex > 0 ? 'pt-2 border-t border-white/5' : ''}`}>
                  <span className="text-[10px] xl:text-xs font-bold text-slate-400 uppercase tracking-widest">{section.title}</span>
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = isMenuItemActive(pathname, item)
                    const style = variantStyles[section.variant]
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm xl:text-[15px] font-medium transition-all duration-300 group ${active
                          ? style.activeClass
                          : 'text-slate-400 hover:bg-white/5 hover:text-white hover:pl-4'
                          }`}
                      >
                        <Icon className={`w-4 h-4 xl:w-[18px] xl:h-[18px] flex-shrink-0 transition-colors ${active ? style.iconClass : style.inactiveIconClass}`} />
                        <span>{item.label}</span>
                        {active && <div className={`ml-auto w-1.5 h-1.5 rounded-full ${style.dotClass}`} />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-white/5 space-y-3 bg-slate-950/30">
            <Link
              href="/profile"
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl border transition-all duration-200 group ${pathname === '/profile'
                ? 'border-sky-500/30 bg-sky-500/10'
                : 'border-white/5 hover:bg-white/5 hover:border-white/10'
                }`}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <span className="text-sm xl:text-base font-bold text-white">{user.username.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm xl:text-base font-semibold text-white truncate group-hover:text-sky-400 transition-colors">{user.username}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.role.replace('_', ' ')}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              type="button"
              className="w-full bg-slate-900/50 hover:bg-red-950/30 hover:text-red-400 backdrop-blur-sm px-3 py-2.5 rounded-xl text-xs xl:text-sm font-semibold text-slate-400 transition-all duration-200 border border-white/5 hover:border-red-500/20 flex items-center justify-center space-x-2 group"
            >
              <FaSignOutAlt className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
