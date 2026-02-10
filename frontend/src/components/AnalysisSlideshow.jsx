import { useState, useEffect } from 'react'
import { Shield, Eye, Heart, Brain, CheckCircle, AlertTriangle } from 'lucide-react'

const slides = [
  {
    icon: Eye,
    title: "AI-Powered Video Analysis",
    description: "Our advanced AI watches the entire video, analyzing visual content, audio, dialogue, and themes to ensure your child's safety.",
    color: "from-blue-500 to-purple-600"
  },
  {
    icon: Shield,
    title: "Comprehensive Safety Scoring",
    description: "Every video receives detailed scores for violence, scary content, NSFW material, and profanity - giving you complete transparency.",
    color: "from-teal-500 to-cyan-600"
  },
  {
    icon: Brain,
    title: "Smart Theme Detection",
    description: "We identify educational, religious, political, and other themes automatically - so you know exactly what values the content promotes.",
    color: "from-orange-500 to-red-600"
  },
  {
    icon: Heart,
    title: "Age-Appropriate Recommendations",
    description: "Get instant age ratings (3+, 7+, 10+, 13+, 16+, 18+) based on comprehensive analysis - making decisions easier for parents.",
    color: "from-pink-500 to-rose-600"
  },
  {
    icon: CheckCircle,
    title: "Timestamp Accuracy",
    description: "See exactly when concerns occur with clickable timestamps - jump directly to any moment that needs your attention.",
    color: "from-green-500 to-emerald-600"
  },
  {
    icon: AlertTriangle,
    title: "Personalized for Your Kids",
    description: "Set custom content preferences for each child - block themes, set score limits, and get tailored warnings for your family.",
    color: "from-yellow-500 to-amber-600"
  }
]

export default function AnalysisSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const slide = slides[currentSlide]
  const Icon = slide.icon

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl p-8 sm:p-12 border-2 border-blue-100 shadow-xl">
      {/* Slide Content */}
      <div className="flex flex-col items-center text-center mb-8 transition-all duration-500">
        <div className={`w-24 h-24 bg-gradient-to-br ${slide.color} rounded-full flex items-center justify-center mb-6 shadow-xl transform transition-all duration-500 hover:scale-110`}>
          <Icon className="w-12 h-12 text-white" />
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-[#2A3D66] mb-4">
          {slide.title}
        </h3>

        <p className="text-base sm:text-lg text-[#6B7280] max-w-2xl leading-relaxed">
          {slide.description}
        </p>
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'w-8 bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B]'
                : 'w-2 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Analysis Status */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-center gap-3 text-[#6B7280]">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="font-medium">Analyzing your video...</span>
        </div>
        <p className="text-sm text-[#6B7280] text-center mt-2">
          This usually takes 30-90 seconds
        </p>
      </div>
    </div>
  )
}
