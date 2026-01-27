export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  }

  return (
    <div
      className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export function LoadingCard({ message = 'Loading...' }) {
  return (
    <div className="bg-slate-800 rounded-lg p-8 sm:p-12 border border-slate-700 text-center">
      <LoadingSpinner size="lg" className="mx-auto mb-4" />
      <p className="text-slate-400 text-sm sm:text-base">{message}</p>
    </div>
  )
}

export function LoadingOverlay({ message = 'Processing...' }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 shadow-2xl">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <p className="text-white font-medium text-lg">{message}</p>
      </div>
    </div>
  )
}

export function LoadingInline({ message = 'Loading...' }) {
  return (
    <div className="flex items-center gap-3 text-slate-400">
      <LoadingSpinner size="sm" />
      <span className="text-sm">{message}</span>
    </div>
  )
}
