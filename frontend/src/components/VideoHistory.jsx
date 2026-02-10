import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, AlertCircle, CheckCircle, TrendingUp, Search, Filter, ExternalLink } from 'lucide-react'
import { StatCard, Card } from './ui/Card'
import { Badge, ScoreBadge } from './ui/Badge'
import { Input } from './ui/Input'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function VideoHistory({ onViewDetails }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRisk, setFilterRisk] = useState('all')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const { parentProfile } = useAuth()

  useEffect(() => {
    fetchReports()
  }, [parentProfile])

  const fetchReports = async () => {
    if (!parentProfile) return

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('parent_id', parentProfile.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalVideos: reports.length,
    safeVideos: reports.filter(r => (r.analysis_result?.safety_score || 0) < 40).length,
    cautionVideos: reports.filter(r => {
      const score = r.analysis_result?.safety_score || 0
      return score >= 40 && score < 70
    }).length,
    dangerVideos: reports.filter(r => (r.analysis_result?.safety_score || 0) >= 70).length
  }

  const filteredVideos = reports.filter(report => {
    const matchesSearch = (report.video_title || '').toLowerCase().includes(searchQuery.toLowerCase())
    const safetyScore = report.analysis_result?.safety_score || 0
    const matchesFilter = filterRisk === 'all' ||
      (filterRisk === 'safe' && safetyScore < 40) ||
      (filterRisk === 'caution' && safetyScore >= 40 && safetyScore < 70) ||
      (filterRisk === 'danger' && safetyScore >= 70)
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9C8A] mx-auto mb-4"></div>
        <p className="text-[#6B7280]">Loading video history...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-[#2A3D66] mb-2">Video History</h1>
          <p className="text-lg text-[#6B7280]">
            Track all analyzed videos and their safety reports
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Videos"
            value={stats.totalVideos}
            icon={<TrendingUp className="w-7 h-7 text-white" />}
            color="purple"
            change={`${stats.totalVideos} analyzed`}
            trend="up"
          />
          <StatCard
            title="Safe Content"
            value={stats.safeVideos}
            icon={<CheckCircle className="w-7 h-7 text-white" />}
            color="green"
            change={stats.totalVideos > 0 ? `${Math.round((stats.safeVideos / stats.totalVideos) * 100)}% of total` : 'No data'}
            trend="neutral"
          />
          <StatCard
            title="Needs Review"
            value={stats.cautionVideos}
            icon={<AlertTriangle className="w-7 h-7 text-white" />}
            color="gold"
            change="Moderate concerns"
            trend="neutral"
          />
          <StatCard
            title="Red Flags"
            value={stats.dangerVideos}
            icon={<AlertCircle className="w-7 h-7 text-white" />}
            color="red"
            change="High risk content"
            trend="down"
          />
        </div>

        {/* Risk Category Breakdown */}
        <Card className="p-6">
          <h3 className="text-xl font-bold text-[#2A3D66] mb-4">Risk Breakdown</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#6B7280]">Safe Content</span>
                <span className="text-sm font-bold text-[#2A3D66]">
                  {stats.safeVideos} videos {stats.totalVideos > 0 && `(${Math.round((stats.safeVideos / stats.totalVideos) * 100)}%)`}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                  style={{ width: stats.totalVideos > 0 ? `${(stats.safeVideos / stats.totalVideos) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#6B7280]">Caution</span>
                <span className="text-sm font-bold text-[#2A3D66]">
                  {stats.cautionVideos} videos {stats.totalVideos > 0 && `(${Math.round((stats.cautionVideos / stats.totalVideos) * 100)}%)`}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full"
                  style={{ width: stats.totalVideos > 0 ? `${(stats.cautionVideos / stats.totalVideos) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#6B7280]">High Risk</span>
                <span className="text-sm font-bold text-[#2A3D66]">
                  {stats.dangerVideos} videos {stats.totalVideos > 0 && `(${Math.round((stats.dangerVideos / stats.totalVideos) * 100)}%)`}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                  style={{ width: stats.totalVideos > 0 ? `${(stats.dangerVideos / stats.totalVideos) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Filters and Search */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
            <div className="flex gap-2">
              {['all', 'safe', 'caution', 'danger'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterRisk(filter)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all capitalize ${
                    filterRisk === filter
                      ? 'bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B] text-white shadow-md'
                      : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Video History Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#2A3D66]">Video</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#2A3D66]">For Child</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#2A3D66]">Safety</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#2A3D66]">Concerns</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#2A3D66]">Analyzed</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#2A3D66]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVideos.map((report) => {
                  const safetyScore = report.analysis_result?.safety_score || 0
                  const concerns = report.analysis_result?.concerns || []
                  const videoId = report.video_url?.split('v=')[1]?.split('&')[0]

                  return (
                    <tr
                      key={report.id}
                      onClick={() => onViewDetails && onViewDetails(report.id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {videoId && (
                            <img
                              src={`https://img.youtube.com/vi/${videoId}/default.jpg`}
                              alt={report.video_title}
                              className="w-24 h-18 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-[#2A3D66] mb-1">{report.video_title}</p>
                            <p className="text-sm text-[#6B7280]">{report.video_duration || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info">{report.kid_name || 'N/A'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <ScoreBadge score={safetyScore} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          {concerns.length > 0 ? (
                            concerns.slice(0, 2).map((concern, idx) => (
                              <span key={idx} className="text-sm text-[#6B7280] block">
                                {concern.concern || concern}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-green-600">None</span>
                          )}
                          {concerns.length > 2 && (
                            <span className="text-xs text-[#6B7280]">+{concerns.length - 2} more</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#6B7280]">
                          {new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={report.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors inline-block"
                        >
                          <ExternalLink className="w-5 h-5 text-[#6B7280]" />
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredVideos.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[#6B7280] text-lg">No videos found</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
