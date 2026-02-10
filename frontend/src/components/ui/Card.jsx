import { motion } from 'framer-motion'

export function Card({ children, className = '', hover = false, ...props }) {
  const Component = hover ? motion.div : 'div'

  return (
    <Component
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}
      {...(hover ? {
        whileHover: { y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' },
        transition: { duration: 0.2 }
      } : {})}
      {...props}
    >
      {children}
    </Component>
  )
}

export function StatCard({ title, value, change, icon, color = 'coral', trend = 'neutral' }) {
  const colorMap = {
    coral: 'from-[#FF9C8A] to-[#FF7B6B]',
    teal: 'from-[#5BC5B8] to-[#45B5A8]',
    purple: 'from-[#A897D4] to-[#9887C4]',
    gold: 'from-[#FFB86B] to-[#FFA84D]',
    red: 'from-red-500 to-red-600',
    green: 'from-green-500 to-green-600'
  }

  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-[#6B7280]'
  }

  return (
    <Card className="p-6" hover>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#6B7280] mb-2">{title}</p>
          <p className="text-3xl font-bold text-[#2A3D66] mb-1">{value}</p>
          {change && (
            <p className={`text-sm font-medium ${trendColor[trend]}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`w-14 h-14 bg-gradient-to-br ${colorMap[color]} rounded-2xl flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
