'use client'

import { FaHotel, FaEnvelope, FaHeart } from 'react-icons/fa'
import { HOTEL_INFO } from '@/lib/hotel-info'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="fixed bottom-0 left-0 right-0 lg:left-64 z-10 app-footer backdrop-blur-xl border-t">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Brand */}
        <div className="flex items-center space-x-2 text-slate-400 text-xs">
          <FaHotel className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="truncate max-w-[200px] sm:max-w-none">{HOTEL_INFO.brandName}</span>
          <span className="text-slate-600">|</span>
          <span>&copy; {currentYear}</span>
        </div>

        {/* Center: Quick contact - hidden on mobile */}
        <div className="hidden md:flex items-center space-x-4 text-xs text-slate-500">
          <a href={`mailto:${HOTEL_INFO.email}`} className="flex items-center space-x-1 hover:text-slate-300 transition-colors">
            <FaEnvelope className="w-3 h-3" />
            <span>{HOTEL_INFO.email}</span>
          </a>
        </div>

        {/* Right: Made with love */}
        <div className="flex items-center space-x-1 text-xs text-slate-500">
          <span>Made with</span>
          <FaHeart className="w-3 h-3 text-red-400" />
          <span className="hidden sm:inline">in India</span>
        </div>
      </div>
    </footer>
  )
}
