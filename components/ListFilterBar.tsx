'use client'

import React, { useState } from 'react'
import { FaSearch, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaTimes, FaFilter } from 'react-icons/fa'
import moment from 'moment'

interface QuickFilter {
  id: string
  label: string
}

interface ListFilterBarProps {
  searchPlaceholder?: string
  searchQuery: string
  onSearchChange: (query: string) => void
  
  quickFilters?: QuickFilter[]
  activeQuickFilter?: string
  onQuickFilterChange?: (id: string) => void
  
  selectedDate?: string
  onDateChange?: (date: string) => void
  
  selectedMonth?: string
  onMonthChange?: (month: string) => void
  selectedYear?: string
  onYearChange?: (year: string) => void
  
  extraActions?: React.ReactNode
}

export const ListFilterBar: React.FC<ListFilterBarProps> = ({
  searchPlaceholder = 'Search...',
  searchQuery,
  onSearchChange,
  quickFilters = [],
  activeQuickFilter,
  onQuickFilterChange,
  selectedDate,
  onDateChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  extraActions
}) => {
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const currentYear = moment().year()
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString())

  const handleMonthSelect = (monthIdx: number) => {
    onMonthChange?.((monthIdx + 1).toString())
    if (!selectedYear) onYearChange?.(currentYear.toString())
  }

  const handleClearPeriod = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMonthChange?.('')
    onYearChange?.('')
    setShowMonthPicker(false)
  }

  const handleClearDate = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDateChange?.('')
    setShowDatePicker(false)
  }

  const getPeriodLabel = () => {
    if (!selectedMonth && !selectedYear) return 'Filter by Month'
    if (selectedMonth && selectedYear) {
      return `${months[parseInt(selectedMonth) - 1]} ${selectedYear}`
    }
    return selectedYear || 'Select Month'
  }

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Main Filters Group */}
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
          {/* Search Input - Glassmorphic */}
          <div className="relative group min-w-[240px] flex-1 max-w-sm">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/30 transition-all backdrop-blur-sm"
            />
          </div>

          {/* Period Selector (Month/Year) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowMonthPicker(!showMonthPicker)
                setShowDatePicker(false)
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                selectedMonth || selectedYear
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                  : 'bg-slate-800/50 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
              }`}
            >
              <FaFilter className="w-3 h-3" />
              <span>{getPeriodLabel()}</span>
              {(selectedMonth || selectedYear) && (
                <FaTimes onClick={handleClearPeriod} className="w-2.5 h-2.5 ml-1 hover:text-white transition-colors" />
              )}
            </button>

            {showMonthPicker && (
              <div className="absolute top-full left-0 mt-3 p-5 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-[100] w-72 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col gap-4 mb-5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Select Year</span>
                    <div className="flex gap-1.5">
                      {years.map(y => (
                        <button
                          key={y}
                          onClick={() => onYearChange?.(y)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            selectedYear === y 
                              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20 ring-1 ring-sky-400/50' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {months.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => {
                        handleMonthSelect(i)
                        setShowMonthPicker(false)
                      }}
                      className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedMonth === (i + 1).toString()
                          ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/25 ring-1 ring-sky-400/50'
                          : 'bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-white border border-white/[0.03]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 flex gap-2">
                   <button
                    onClick={() => {
                      onMonthChange?.('')
                      onYearChange?.('')
                      setShowMonthPicker(false)
                    }}
                    className="flex-1 py-2.5 bg-slate-800/50 text-slate-500 hover:text-red-400 hover:bg-red-500/10 text-xs font-bold rounded-xl transition-all border border-white/5"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowMonthPicker(false)}
                    className="flex-[2] py-2.5 bg-sky-600 text-white hover:bg-sky-500 text-xs font-bold rounded-xl transition-all shadow-lg shadow-sky-600/20"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Date Picker (Specific Date) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowDatePicker(!showDatePicker)
                setShowMonthPicker(false)
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                selectedDate
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800/50 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
              }`}
            >
              <FaCalendarAlt className="w-3.5 h-3.5" />
              <span>{selectedDate ? moment(selectedDate).format('DD MMM YYYY') : 'Pick Date'}</span>
              {selectedDate && (
                <FaTimes onClick={handleClearDate} className="w-2.5 h-2.5 ml-1 hover:text-white transition-colors" />
              )}
            </button>

            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-[100] animate-in fade-in zoom-in-95 duration-200">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    onDateChange?.(e.target.value)
                    setShowDatePicker(false)
                  }}
                  className="bg-transparent text-white border-none focus:ring-0 p-2 text-sm [color-scheme:dark]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Extra Actions Group (New Booking, Export, View Toggles) */}
        {extraActions && (
          <div className="flex items-center gap-2">
            {extraActions}
          </div>
        )}
      </div>

      {/* Quick Filter Chips */}
      {quickFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">Quick Filters</span>
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onQuickFilterChange?.(filter.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                activeQuickFilter === filter.id
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-400 shadow-sm'
                  : 'bg-slate-800/40 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
