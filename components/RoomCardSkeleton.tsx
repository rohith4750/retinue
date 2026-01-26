'use client'

import { SkeletonLoader } from './SkeletonLoader'

export function RoomCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <SkeletonLoader variant="text" width={120} height={20} className="mb-2" />
          <SkeletonLoader variant="text" width={80} height={14} />
        </div>
        <SkeletonLoader variant="rectangular" width={60} height={24} className="rounded-full" />
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <SkeletonLoader variant="text" width={60} height={12} />
          <SkeletonLoader variant="text" width={80} height={16} />
        </div>
        <div className="flex items-center justify-between">
          <SkeletonLoader variant="text" width={60} height={12} />
          <SkeletonLoader variant="text" width={80} height={16} />
        </div>
        <div className="flex items-center justify-between">
          <SkeletonLoader variant="text" width={60} height={12} />
          <SkeletonLoader variant="text" width={80} height={16} />
        </div>
      </div>

      <div className="pt-3 border-t border-white/5">
        <SkeletonLoader variant="rectangular" width="100%" height={36} className="rounded-lg" />
      </div>
    </div>
  )
}
