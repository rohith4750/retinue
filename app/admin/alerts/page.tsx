'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import { 
  FaExclamationTriangle, FaEnvelope, FaUserCheck, FaSearch, 
  FaPaperPlane, FaMoneyBillWave, FaBed, FaUserTag, FaFilter,
  FaCalendarCheck, FaCalendarPlus, FaArrowRight
} from 'react-icons/fa'
import { toast } from 'react-hot-toast'
import moment from 'moment'

export default function AdminAlertsPage() {
  const queryClient = useQueryClient()
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSending, setIsSending] = useState<string | null>(null)

  // 1. Fetch pending bills
  const { data: pendingBills, isLoading: isBillsLoading } = useQuery({
    queryKey: ['admin', 'alerts', 'pending'],
    queryFn: () => api.get('/admin/alerts/pending'),
  })

  // 2. Fetch staff/receptionists
  const { data: staffUsers, isLoading: isUsersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/admin/users'),
  })

  // Initialize selected emails with all receptionists by default
  useEffect(() => {
    if (staffUsers && selectedEmails.length === 0) {
      const receptionists = (staffUsers as any[])
        .filter((u: any) => u.role === 'RECEPTIONIST' || u.role === 'ADMIN')
        .map((u: any) => u.email)
      setSelectedEmails(receptionists)
    }
  }, [staffUsers])

  // 3. Send manual alert mutation
  const sendAlertMutation = useMutation({
    mutationFn: (data: { bookingId: string, recipientEmails: string[] }) => 
      api.post('/admin/alerts/manual', data),
    onSuccess: () => {
      toast.success('Alerts sent successfully')
      setIsSending(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send alerts')
      setIsSending(null)
    }
  })

  const handleSendAlert = (bookingId: string) => {
    if (selectedEmails.length === 0) {
      toast.error('Please select at least one recipient')
      return
    }
    setIsSending(bookingId)
    sendAlertMutation.mutate({ bookingId, recipientEmails: selectedEmails })
  }

  const toggleEmail = (email: string) => {
    setSelectedEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    )
  }

  const filteredBills = (pendingBills as any[])?.filter((b: any) => 
    b.guestName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isBillsLoading || isUsersLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
        <p className="text-slate-400 mt-4">Loading operational data...</p>
      </div>
    )
  }

  const totalOutstanding = (pendingBills as any[])?.reduce((acc: number, b: any) => acc + b.balanceAmount, 0) || 0

  return (
    <div className="w-full px-4 lg:px-8 py-6 relative z-10 space-y-8">
      {/* Background Glows */}
      <div className="glow-emerald top-20 right-20"></div>
      <div className="glow-amber bottom-20 left-20"></div>

      {/* Header Secion */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
            <FaExclamationTriangle className="text-amber-400" />
            Operational Alert System
          </h1>
          <p className="text-slate-400 mt-2 font-medium">
            Manage pending payments and manually notify the receptionist team.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[140px]">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Total Pending</p>
            <p className="text-2xl font-black text-white">{(pendingBills as any[])?.length || 0}</p>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[140px]">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Outstanding</p>
            <p className="text-2xl font-black text-amber-400">₹{(totalOutstanding / 1000).toFixed(1)}K</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar: Recipient Selection */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-sky-500/20 transition-all duration-700"></div>
            
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <FaUserCheck className="text-sky-400" />
              Notify Team
            </h3>
            
            <div className="space-y-3">
              {(staffUsers as any[])?.map((user: any) => (
                <button
                  key={user.id}
                  onClick={() => toggleEmail(user.email)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${
                    selectedEmails.includes(user.email)
                      ? 'bg-sky-500/20 border-sky-500/30 text-sky-400'
                      : 'bg-slate-800/40 border-white/5 text-slate-500 hover:border-white/10 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-bold truncate w-full">{user.username}</span>
                    <span className="text-[9px] uppercase font-black tracking-tighter opacity-70">{user.role}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedEmails.includes(user.email) ? 'border-sky-400 bg-sky-400' : 'border-slate-700'
                  }`}>
                    {selectedEmails.includes(user.email) && <FaEnvelope className="text-[10px] text-slate-900" />}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-[10px] text-slate-500 italic">
                Selected recipients will receive a premium alert email with bill details whenever you click "Send Alert".
              </p>
            </div>
          </div>
        </div>

        {/* Main Content: Pending Bills List */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 group w-full">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search guest name, room, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all placeholder:text-slate-600"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border border-white/5 rounded-2xl text-xs font-bold text-slate-400">
              <FaFilter className="text-sky-400" />
              <span>{filteredBills?.length || 0} Found</span>
            </div>
          </div>

          {/* Bills List */}
          <div className="space-y-4">
            {filteredBills?.map((bill: any) => (
              <div 
                key={bill.id}
                className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-5 md:p-6 hover:bg-slate-800/70 transition-all duration-300 group shadow-lg"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Bill Details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center border border-amber-500/20 shadow-inner">
                        <FaUserTag className="text-amber-400 text-lg" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white leading-tight">{bill.guestName}</h4>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-white/5">
                            <FaCalendarPlus className="text-sky-400/80 text-[10px]" />
                            <span>{moment(bill.checkIn).format('DD MMM')}</span>
                          </div>
                          <FaArrowRight className="text-[10px] text-slate-700" />
                          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-white/5">
                            <FaCalendarCheck className="text-amber-400/80 text-[10px]" />
                            <span>{moment(bill.checkOut).format('DD MMM')}</span>
                          </div>
                          <span className="font-black text-sky-400/80 ml-2">#{bill.reference}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      {moment(bill.checkOut).isBefore(moment(), 'day') && bill.status === 'CHECKED_IN' && (
                        <div className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce"></div>
                          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Overdue Departure</span>
                        </div>
                      )}
                      {bill.balanceAmount > 0 && (
                        <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Unpaid Balance</span>
                        </div>
                      )}
                      {moment(bill.checkIn).isSame(moment(), 'day') && (
                        <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                          <FaCalendarPlus className="text-emerald-400 text-[10px]" />
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Arriving Today</span>
                        </div>
                      )}
                      {moment(bill.checkOut).isSame(moment(), 'day') && (
                        <div className="px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center gap-2">
                          <FaCalendarCheck className="text-sky-400 text-[10px]" />
                          <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Departing Today</span>
                        </div>
                      )}

                      <div className="px-4 py-2 bg-slate-800/50 border border-white/5 rounded-xl flex items-center gap-2">
                        <FaBed className="text-sky-400 text-xs" />
                        <span className="text-xs font-bold text-slate-300">Room {bill.roomNumber}</span>
                      </div>
                      <div className="px-4 py-2 bg-slate-800/50 border border-white/5 rounded-xl flex items-center gap-2">
                        <FaMoneyBillWave className="text-emerald-400 text-xs" />
                        <span className="text-xs font-bold text-slate-300">Total ₹{bill.totalAmount.toLocaleString()}</span>
                      </div>
                      <div className={`px-4 py-2 border rounded-xl flex items-center gap-2 ${
                        bill.paymentStatus === 'PARTIAL' ? 'bg-amber-400/10 border-amber-400/20 text-amber-400' : 'bg-rose-400/10 border-rose-400/20 text-rose-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${bill.paymentStatus === 'PARTIAL' ? 'bg-amber-400' : 'bg-rose-400'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-tighter">Outstanding ₹{bill.balanceAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 md:pl-6 border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0">
                    <button
                      onClick={() => handleSendAlert(bill.id)}
                      disabled={isSending === bill.id || selectedEmails.length === 0}
                      className={`h-14 px-8 rounded-2xl flex items-center justify-center gap-3 font-black text-sm tracking-wide transition-all duration-300 shadow-xl ${
                        selectedEmails.length === 0 
                          ? 'bg-slate-800 text-slate-600 border border-white/5 cursor-not-allowed'
                          : isSending === bill.id
                            ? 'bg-slate-700 text-sky-400 cursor-wait'
                            : 'bg-white text-slate-900 hover:scale-105 hover:bg-sky-400 active:scale-95'
                      }`}
                    >
                      {isSending === bill.id ? (
                        <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <FaPaperPlane className="text-xs" />
                          Send Alert
                        </>
                      )}
                    </button>
                    
                    <a 
                      href={`/bills/${bill.id}`}
                      className="h-14 w-14 rounded-2xl flex items-center justify-center bg-slate-800/80 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-xl"
                      title="View Bill Details"
                    >
                      <FaSearch className="text-xl" />
                    </a>
                  </div>
                </div>
              </div>
            ))}

            {filteredBills?.length === 0 && (
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-12 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <FaUserCheck className="text-emerald-400 text-2xl" />
                </div>
                <h4 className="text-lg font-bold text-white uppercase tracking-wider">All Clear</h4>
                <p className="text-slate-500 mt-2">No pending bills found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
