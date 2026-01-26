import Link from 'next/link'
import { FaHome } from 'react-icons/fa'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md text-center">
        <div className="text-6xl font-bold text-slate-300 mb-4">404</div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Page Not Found</h2>
        <p className="text-slate-400 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/dashboard" className="btn-primary inline-flex items-center space-x-2">
          <FaHome className="w-4 h-4" />
          <span>Go to Dashboard</span>
        </Link>
      </div>
    </div>
  )
}
