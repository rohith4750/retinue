'use client'

import { SkeletonLoader } from './SkeletonLoader'

export function BookingCardSkeleton() {
  return (
    <div className="card group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <SkeletonLoader variant="circular" width={16} height={16} />
            <SkeletonLoader variant="text" width={120} height={16} />
          </div>
          <SkeletonLoader variant="text" width={100} height={12} className="mb-1.5" />
        </div>
        <SkeletonLoader variant="rectangular" width={60} height={20} className="rounded-full" />
      </div>

      <div className="space-y-2 mb-4">
        <SkeletonLoader variant="text" width="100%" height={12} />
        <SkeletonLoader variant="text" width="80%" height={12} />
        <SkeletonLoader variant="text" width="90%" height={12} />
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <SkeletonLoader variant="text" width={80} height={12} />
            <SkeletonLoader variant="text" width={60} height={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
        <SkeletonLoader variant="rectangular" width="100%" height={32} className="rounded-lg" />
        <SkeletonLoader variant="rectangular" width="100%" height={32} className="rounded-lg" />
      </div>
    </div>
  )
}
