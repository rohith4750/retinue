'use client'

import { FaHotel, FaPhone, FaEnvelope, FaHeart } from 'react-icons/fa'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="fixed bottom-0 left-0 right-0 lg:left-64 z-10 bg-slate-900/90 backdrop-blur-xl border-t border-white/5">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Brand */}
        <div className="flex items-center space-x-2 text-slate-400 text-xs">
          <FaHotel className="w-3 h-3 text-sky-400" />
          <span>The Retinue</span>
          <span className="text-slate-600">|</span>
          <span>&copy; {currentYear}</span>
        </div>

        {/* Center: Quick contact - hidden on mobile */}
        <div className="hidden md:flex items-center space-x-4 text-xs text-slate-500">
          <a href="tel:+911234567890" className="flex items-center space-x-1 hover:text-slate-300 transition-colors">
            <FaPhone className="w-3 h-3" />
            <span>+91 123 456 7890</span>
          </a>
          <a href="mailto:support@theretinue.com" className="flex items-center space-x-1 hover:text-slate-300 transition-colors">
            <FaEnvelope className="w-3 h-3" />
            <span>support@theretinue.com</span>
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
