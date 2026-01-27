import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

export default function Tooltip({ children, content, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} w-max max-w-xs pointer-events-none`}
        >
          <div className="bg-slate-950 text-white text-xs sm:text-sm px-3 py-2 rounded-lg shadow-xl border border-slate-700 animate-fadeIn">
            {content}
            <div className={`absolute w-2 h-2 bg-slate-950 border-slate-700 transform rotate-45 ${
              position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-b border-r' :
              position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-t border-l' :
              position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 border-r border-t' :
              'left-[-4px] top-1/2 -translate-y-1/2 border-l border-b'
            }`} />
          </div>
        </div>
      )}
    </div>
  )
}

// Icon tooltip variant
export function TooltipIcon({ content, position = 'top', className = '' }) {
  return (
    <Tooltip content={content} position={position}>
      <HelpCircle className={`w-4 h-4 text-slate-400 hover:text-slate-300 transition-colors ${className}`} />
    </Tooltip>
  )
}
