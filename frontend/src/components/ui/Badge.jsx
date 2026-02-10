export function Badge({ children, variant = 'neutral', size = 'md', className = '' }) {
  const variants = {
    safe: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200'
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  )
}

export function ScoreBadge({ score, size = 'md' }) {
  let variant = 'safe'
  let label = 'Safe'

  if (score >= 70) {
    variant = 'danger'
    label = 'High Risk'
  } else if (score >= 40) {
    variant = 'warning'
    label = 'Caution'
  }

  return (
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  )
}
