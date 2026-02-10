import { useState, useEffect } from 'react'
import { ArrowLeft, ExternalLink, AlertTriangle, CheckCircle, Clock, Shield, Play } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import AnalysisSlideshow from './AnalysisSlideshow'

export default function VideoDetail({ reportId, onBack }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedSummary, setExpandedSummary] = useState(false)
  const [expandedConcerns, setExpandedConcerns] = useState(false)
  const [expandedPositives, setExpandedPositives] = useState(false)
  const { parentProfile } = useAuth()

  useEffect(() => {
    fetchReportDetails()
  }, [reportId])

  // Auto-refresh every 3 seconds if status is pending or processing
  useEffect(() => {
    if (!report) return

    if (report.status === 'pending' || report.status === 'processing') {
      const interval = setInterval(() => {
        fetchReportDetails()
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [report?.status])

  const fetchReportDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single()

      if (error) throw error
      setReport(data)
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  const linkifyTimestamps = (text, videoUrl) => {
    if (!text || typeof text !== 'string') return text

    const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/g
    const parts = text.split(timestampRegex)

    return parts.map((part, idx) => {
      if (timestampRegex.test(part)) {
        const [minutes, seconds] = part.split(':').map(Number)
        const totalSeconds = minutes * 60 + (seconds || 0)
        const url = `${videoUrl}&t=${totalSeconds}s`

        return (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 font-semibold underline cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9C8A] mx-auto mb-4"></div>
        <p className="text-[#6B7280]">Loading video details...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-[#6B7280] text-lg mb-4">Video not found</p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gradient-to-r from-[#8FA888] to-[#7a9377] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5 inline mr-2" />
          Back to Dashboard
        </button>
      </div>
    )
  }

  const analysis = report.analysis_result || {}
  const safetyScore = analysis.safety_score || 0
  const videoId = report.video_url?.split('v=')[1]?.split('&')[0]

  return (
    <div className="py-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#6B7280] hover:text-[#2A3D66] transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      {/* Pending Status - Only show when truly pending with no data */}
      {report.status === 'pending' && (
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl p-8 sm:p-12 border-2 border-blue-100 shadow-xl text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 animate-pulse mx-auto">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#2A3D66] mb-3">Analysis Queued</h2>
          <p className="text-[#6B7280] mb-6 max-w-md mx-auto">
            Your video is in the queue and will be analyzed shortly.
          </p>
          <div className="flex items-center gap-2 text-sm text-[#6B7280] justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <span>Waiting to start...</span>
          </div>
        </div>
      )}

      {/* Processing Status Bar - Show above report card when processing */}
      {report.status === 'processing' && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-4 mb-6 shadow-lg">
          <div className="flex items-center gap-3 text-white">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
            <div className="flex-1">
              <p className="font-bold">Analysis in Progress...</p>
              <p className="text-xs text-blue-100">Updates appear automatically as AI reviews the content</p>
            </div>
          </div>
        </div>
      )}

      {/* Failed Status */}
      {report.status === 'failed' && (
        <div className="bg-gradient-to-br from-orange-50 to-white rounded-3xl p-8 sm:p-12 border-2 border-orange-200 shadow-xl text-center">
          <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mb-6 mx-auto">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#2A3D66] mb-3">Analysis Temporarily Unavailable</h2>
          <p className="text-[#6B7280] mb-6 max-w-md mx-auto leading-relaxed">
            {report.error_message && !report.error_message.includes('Unterminated') && !report.error_message.includes('JSON')
              ? report.error_message
              : "We encountered a temporary issue analyzing this video. This sometimes happens with certain videos. Please try again - it usually works on the second attempt!"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gradient-to-r from-[#8FA888] to-[#7a9377] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Try Another Video
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white border-2 border-[#8FA888] text-[#2A3D66] rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Retry This Video
            </button>
          </div>
        </div>
      )}

      {/* Analysis Report Card - Show for processing OR completed */}
      {(report.status === 'processing' || report.status === 'completed') && (
        <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl p-6 sm:p-8 border-2 border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300">

          {/* Video Header with Thumbnail */}
          <div className="flex items-start gap-4 sm:gap-6 mb-6 pb-6 border-b-2 border-gray-100">
              {videoId && (
                <img
                  src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                  alt={report.video_title}
                  className="w-32 sm:w-40 rounded-xl shadow-lg flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#2A3D66] mb-2 line-clamp-2">
                  {report.video_title || 'Video Analysis'}
                </h1>
                <p className="text-sm text-[#6B7280] mb-3">
                  Analyzed {new Date(report.created_at).toLocaleDateString()}
                </p>
                <a
                  href={report.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  <Play className="w-4 h-4" />
                  Watch on YouTube
                </a>
              </div>
            </div>

            {/* Overall Safety Score - Prominent */}
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl p-8 mb-6 border-2 border-blue-100 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#8FA888] to-[#7a9377] rounded-2xl flex items-center justify-center shadow-lg">
                    <Shield className="w-9 h-9 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#2A3D66] mb-1">Overall Safety Rating</p>
                    <p className="text-sm text-[#6B7280]">
                      {safetyScore > 0 ? 'Based on AI content analysis' : 'Analyzing content...'}
                    </p>
                  </div>
                </div>

                {/* Score Display */}
                <div className="text-center">
                  <div className={`inline-flex flex-col items-center justify-center w-28 h-28 rounded-2xl shadow-lg ${
                    safetyScore >= 80 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                    safetyScore >= 50 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    safetyScore > 0 ? 'bg-gradient-to-br from-red-400 to-red-600' :
                    'bg-gradient-to-br from-gray-400 to-gray-500'
                  }`}>
                    <span className="text-5xl font-black text-white">{safetyScore}</span>
                    <span className="text-sm font-semibold text-white opacity-90">/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Breakdown Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { key: 'violence', label: 'Violence', icon: '⚔️' },
                { key: 'nsfw', label: 'NSFW', icon: '🔞' },
                { key: 'scary_content', label: 'Scary', icon: '👻' },
                { key: 'profanity', label: 'Profanity', icon: '🤬', isProfanity: true }
              ].map((category) => {
                const score = category.isProfanity
                  ? (analysis.profanity_detected ? 'Yes' : 'No')
                  : (analysis[`${category.key}_score`] || 0)

                const scoreNum = category.isProfanity ? 0 : score

                return (
                  <div
                    key={category.key}
                    className="bg-white border-2 border-gray-100 rounded-xl p-4 text-center hover:border-[#8FA888] hover:shadow-md transition-all"
                  >
                    <p className="text-2xl mb-2">{category.icon}</p>
                    <p className="text-xs font-semibold text-[#6B7280] mb-2">{category.label}</p>
                    <p className={`text-2xl font-black ${
                      category.isProfanity
                        ? (analysis.profanity_detected ? 'text-red-500' : 'text-green-500')
                        : (scoreNum <= 20 ? 'text-green-500' : scoreNum <= 50 ? 'text-yellow-500' : 'text-red-500')
                    }`}>
                      {score}{!category.isProfanity && '/10'}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Themes */}
            {analysis.themes && analysis.themes.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50/50 to-white border-2 border-purple-100 rounded-xl p-5 mb-6">
                <p className="text-sm font-bold text-[#2A3D66] mb-3 flex items-center gap-2">
                  <span>🎭</span> Content Themes
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysis.themes.map((theme, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-sm"
                    >
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-gray-50 rounded-2xl p-5 mb-6">
              <p className="text-sm font-bold text-[#2A3D66] mb-2">📝 Summary</p>
              {analysis.summary && analysis.summary.trim() && !analysis.summary.includes('Video content analyzed') ? (
                <div>
                  <p className="text-[#2A3D66] text-sm leading-relaxed">
                    {expandedSummary || analysis.summary.length <= 150
                      ? analysis.summary
                      : `${analysis.summary.substring(0, 150)}...`}
                  </p>
                  {analysis.summary.length > 150 && (
                    <button
                      onClick={() => setExpandedSummary(!expandedSummary)}
                      className="mt-2 text-[#8FA888] hover:text-[#7a9377] text-xs font-semibold transition-colors"
                    >
                      {expandedSummary ? 'Show Less ▲' : 'Show More ▼'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[#6B7280] text-sm">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                  <span>Generating summary...</span>
                </div>
              )}
            </div>

            {/* Concerns */}
            <div className="bg-yellow-50/50 border-2 border-yellow-200 rounded-2xl p-5 mb-6">
              <p className="text-sm font-bold text-[#2A3D66] mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Concerns {analysis.concerns && analysis.concerns.length > 0 && `(${analysis.concerns.length})`}
              </p>
              {analysis.concerns && analysis.concerns.length > 0 ? (
                <>
                  <ul className="space-y-2">
                    {(expandedConcerns ? analysis.concerns : analysis.concerns.slice(0, 3)).map((concern, idx) => (
                      <li key={idx} className="text-sm text-[#2A3D66] flex items-start gap-2">
                        <span className="text-yellow-600 mt-0.5">•</span>
                        <span className="flex-1">{linkifyTimestamps(concern.concern || concern, report.video_url)}</span>
                      </li>
                    ))}
                  </ul>
                  {analysis.concerns.length > 3 && (
                    <button
                      onClick={() => setExpandedConcerns(!expandedConcerns)}
                      className="mt-3 text-[#8FA888] hover:text-[#7a9377] text-xs font-semibold"
                    >
                      {expandedConcerns ? 'Show Less ▲' : `Show More (${analysis.concerns.length - 3} more) ▼`}
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-[#6B7280] text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span>Analyzing for potential concerns...</span>
                </div>
              )}
            </div>

            {/* Positive Aspects */}
            <div className="bg-green-50/50 border-2 border-green-200 rounded-2xl p-5 mb-6">
              <p className="text-sm font-bold text-[#2A3D66] mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Positive Aspects {analysis.positive_aspects && analysis.positive_aspects.length > 0 && `(${analysis.positive_aspects.length})`}
              </p>
              {analysis.positive_aspects && analysis.positive_aspects.length > 0 ? (
                <>
                  <ul className="space-y-2">
                    {(expandedPositives ? analysis.positive_aspects : analysis.positive_aspects.slice(0, 3)).map((aspect, idx) => (
                      <li key={idx} className="text-sm text-[#2A3D66] flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        <span className="flex-1">{linkifyTimestamps(aspect.aspect || aspect, report.video_url)}</span>
                      </li>
                    ))}
                  </ul>
                  {analysis.positive_aspects.length > 3 && (
                    <button
                      onClick={() => setExpandedPositives(!expandedPositives)}
                      className="mt-3 text-[#8FA888] hover:text-[#7a9377] text-xs font-semibold"
                    >
                      {expandedPositives ? 'Show Less ▲' : `Show More (${analysis.positive_aspects.length - 3} more) ▼`}
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-[#6B7280] text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Identifying positive elements...</span>
                </div>
              )}
            </div>

            {/* Recommendation */}
            {analysis.recommendations && (
              <div className="bg-gradient-to-br from-[#FFF4F1] to-white border-2 border-[#FF9C8A]/20 rounded-2xl p-5">
                <p className="text-sm font-bold text-[#2A3D66] mb-2">💡 Recommendation</p>
                <p className="text-[#2A3D66] text-sm leading-relaxed font-medium">
                  {analysis.recommendations}
                </p>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-8 text-center">
              <button
                onClick={onBack}
                className="px-8 py-3 bg-gradient-to-r from-[#8FA888] to-[#7a9377] text-white rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-105"
              >
                Analyze Another Video
              </button>
            </div>
          </div>
        )}
    </div>
  )
}
