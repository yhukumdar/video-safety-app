import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Navigation from './Navigation'
import KidProfiles from './KidProfiles'
import ContentPreferences from './ContentPreferences'
import { LoadingSpinner, LoadingCard } from './LoadingSpinner'
import Tooltip, { TooltipIcon } from './Tooltip'

export default function Dashboard() {
  const { user, parentProfile } = useAuth()
  const [currentView, setCurrentView] = useState('dashboard')
  
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [error, setError] = useState(null)
  const [reports, setReports] = useState([])
  const [expandedReports, setExpandedReports] = useState({})
  const [selectedThemes, setSelectedThemes] = useState([])
  const [kidProfiles, setKidProfiles] = useState([])
  const [kidPreferences, setKidPreferences] = useState({})
  const [selectedKidFilter, setSelectedKidFilter] = useState('all')
  const [loadingReports, setLoadingReports] = useState(true)

  // Fetch reports on component mount
  useEffect(() => {
    fetchReports()
    fetchKidProfilesAndPreferences()
  }, [parentProfile])

  const fetchReports = async () => {
    if (!parentProfile) return

    setLoadingReports(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('parent_id', parentProfile.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Error fetching reports:', fetchError)
        setError('Failed to fetch reports')
      } else {
        setReports(data || [])
      }
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError('Failed to fetch reports')
    } finally {
      setLoadingReports(false)
    }
  }

  const fetchKidProfilesAndPreferences = async () => {
    if (!parentProfile) return
    
    try {
      // Fetch kid profiles
      const { data: kids, error: kidsError } = await supabase
        .from('kid_profiles')
        .select('*')
        .eq('parent_id', parentProfile.id)
        .order('name')

      if (kidsError) throw kidsError
      setKidProfiles(kids || [])

      // Fetch all preferences
      if (kids && kids.length > 0) {
        const { data: prefs, error: prefsError } = await supabase
          .from('content_preferences')
          .select('*')
          .in('kid_profile_id', kids.map(k => k.id))

        if (prefsError && prefsError.code !== 'PGRST116') throw prefsError
        
        // Create a map: kid_id -> preferences
        const prefsMap = {}
        if (prefs) {
          prefs.forEach(pref => {
            prefsMap[pref.kid_profile_id] = pref
          })
        }
        setKidPreferences(prefsMap)
      }
    } catch (error) {
      console.error('Error fetching kids/preferences:', error)
    }
  }

  const handleYouTubeSubmit = async () => {
    if (!youtubeUrl || !parentProfile) return
  
    setUploading(true)
    setError(null)
  
    try {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/
      if (!youtubeRegex.test(youtubeUrl)) {
        throw new Error('Please enter a valid YouTube URL')
      }
  
      let videoId = ''
      if (youtubeUrl.includes('youtube.com')) {
        const urlParams = new URLSearchParams(new URL(youtubeUrl).search)
        videoId = urlParams.get('v')
      } else if (youtubeUrl.includes('youtu.be')) {
        videoId = youtubeUrl.split('/').pop().split('?')[0]
      }
  
      if (!videoId) {
        throw new Error('Could not extract video ID from URL')
      }
  
      const response = await fetch(`${import.meta.env.VITE_API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_url: youtubeUrl,
          parent_id: parentProfile.id
        })
      })
  
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to start analysis: ${errorData}`)
      }
  
      const result = await response.json()
      
      setUploadStatus('success')
      setYoutubeUrl('')
      fetchReports()
      
      setTimeout(() => setUploadStatus(null), 3000)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'processing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500'
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500'
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500'
    }
  }

  const toggleReportDetails = (reportId) => {
    setExpandedReports(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }))
  }

  const toggleTheme = (theme) => {
    setSelectedThemes(prev => {
      if (prev.includes(theme)) {
        return prev.filter(t => t !== theme)
      } else {
        return [...prev, theme]
      }
    })
  }

  const clearFilters = () => {
    setSelectedThemes([])
  }

  const checkVideoAgainstPreferences = (report) => {
    if (!report.analysis_result) return []
    
    const warnings = []
    const analysis = report.analysis_result
    
    kidProfiles.forEach(kid => {
      const prefs = kidPreferences[kid.id]
      if (!prefs) return // No preferences set for this kid
      
      const kidWarnings = []
      
      // Check blocked themes
      const reportThemes = analysis.themes || []
      const blockedThemesFound = reportThemes.filter(theme => 
        prefs.blocked_themes?.includes(theme)
      )
      if (blockedThemesFound.length > 0) {
        kidWarnings.push(`Contains blocked themes: ${blockedThemesFound.join(', ')}`)
      }
      
      // Check violence threshold
      if ((analysis.violence_score || 0) > prefs.max_violence_score) {
        kidWarnings.push(`Violence score (${analysis.violence_score}) exceeds limit (${prefs.max_violence_score})`)
      }
      
      // Check scary threshold
      if ((analysis.scary_score || 0) > prefs.max_scary_score) {
        kidWarnings.push(`Scary score (${analysis.scary_score}) exceeds limit (${prefs.max_scary_score})`)
      }
      
      // Check NSFW threshold
      if ((analysis.nsfw_score || 0) > prefs.max_nsfw_score) {
        kidWarnings.push(`NSFW score (${analysis.nsfw_score}) exceeds limit (${prefs.max_nsfw_score})`)
      }
      
      // Check profanity
      if (analysis.profanity_detected && !prefs.allow_profanity) {
        kidWarnings.push('Contains profanity')
      }
      
      // Add to warnings array
      if (kidWarnings.length > 0) {
        warnings.push({
          kid: kid,
          suitable: false,
          warnings: kidWarnings
        })
      } else {
        // Check if video has allowed themes (if any are set)
        if (prefs.allowed_themes?.length > 0) {
          const hasAllowedTheme = reportThemes.some(theme => 
            prefs.allowed_themes.includes(theme)
          )
          if (hasAllowedTheme || reportThemes.length === 0) {
            warnings.push({
              kid: kid,
              suitable: true,
              warnings: []
            })
          }
        } else {
          // No allowed themes set, just check if no violations
          warnings.push({
            kid: kid,
            suitable: true,
            warnings: []
          })
        }
      }
    })
    
    return warnings
  }

  // ========================================
  // RETURN STATEMENT STARTS HERE
  // ========================================
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navigation */}
      <Navigation currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <>
            {/* Upload Section */}
            <div className="bg-slate-800 rounded-xl p-4 sm:p-6 md:p-8 mb-8 md:mb-12 border border-slate-700">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Add Video for Analysis</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  YouTube Video URL
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                />
                <p className="text-sm text-slate-500 mt-2">
                  Paste a YouTube video URL to analyze its content
                </p>
              </div>

              {uploading && (
                <div className="flex items-center justify-center p-4 sm:p-6 bg-blue-500/10 rounded-lg border border-blue-500 mb-4">
                  <LoadingSpinner size="md" className="mr-3" />
                  <p className="text-blue-400 text-sm sm:text-base">Analyzing video...</p>
                </div>
              )}

              {uploadStatus === 'success' && (
                <div className="flex items-center justify-center p-6 bg-green-500/10 rounded-lg border border-green-500 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                  <p className="text-green-400">Analysis started successfully!</p>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center p-6 bg-red-500/10 rounded-lg border border-red-500 mb-4">
                  <XCircle className="w-6 h-6 text-red-400 mr-3" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleYouTubeSubmit}
                disabled={!youtubeUrl || uploading || !parentProfile}
                className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {uploading ? 'Analyzing...' : 'Analyze Video'}
              </button>
            </div>

            {/* Theme Filter Section */}
            {reports.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-4 sm:p-6 mb-6 border border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Filter by Theme</h3>
                  {selectedThemes.length > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors self-start sm:self-auto touch-manipulation"
                    >
                      Clear Filters ({selectedThemes.length})
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {['educational', 'animated', 'scary', 'religious', 'lgbtq', 'political', 'musical', 'action', 'romantic', 'live-action'].map(theme => (
                    <button
                      key={theme}
                      onClick={() => toggleTheme(theme)}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation ${
                        selectedThemes.includes(theme)
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white hover:scale-105'
                      }`}
                    >
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </button>
                  ))}
                </div>
                
                {selectedThemes.length > 0 && (
                  <p className="text-sm text-slate-400 mt-3">
                    Showing videos with: {selectedThemes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Kid Profile Filter */}
            {kidProfiles.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-4 sm:p-6 mb-6 border border-slate-700">
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-3">
                  Show Warnings For
                </label>
                <select
                  value={selectedKidFilter}
                  onChange={(e) => setSelectedKidFilter(e.target.value)}
                  className="w-full px-3 sm:px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-sm sm:text-base text-white focus:outline-none focus:border-blue-500 touch-manipulation"
                >
                  <option value="all">All Kids</option>
                  {kidProfiles.map(kid => (
                    <option key={kid.id} value={kid.id}>
                      {kid.name} ({kid.age} years old)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reports Section */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Analysis Reports</h2>

              {loadingReports ? (
                <LoadingCard message="Loading your video reports..." />
              ) : (() => {
                // Filter reports based on selected themes
                const filteredReports = selectedThemes.length === 0
                  ? reports
                  : reports.filter(report => {
                      const reportThemes = report.analysis_result?.themes || []
                      return selectedThemes.some(selectedTheme =>
                        reportThemes.includes(selectedTheme)
                      )
                    })

                // Results count
                const resultsCount = selectedThemes.length > 0 && filteredReports.length > 0 && (
                  <p className="text-sm text-slate-400 mb-4">
                    Showing {filteredReports.length} of {reports.length} video{reports.length !== 1 ? 's' : ''}
                  </p>
                )

                return (
                  <>
                    {resultsCount}

                    {filteredReports.length === 0 ? (
                      <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
                        <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-400">
                          {reports.length === 0 
                            ? "No reports yet. Upload a video to get started."
                            : "No videos match the selected filters. Try different themes."
                          }
                        </p>
                        {selectedThemes.length > 0 && (
                          <button
                            onClick={clearFilters}
                            className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {filteredReports.map((report) => {
                    const analysisResult = report.analysis_result && typeof report.analysis_result === 'object' 
                      ? report.analysis_result 
                      : null

                    return (
                      <div key={report.id} className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-1">
                        {/* Video Title */}
                        <h3 className="font-semibold text-base sm:text-lg mb-3 text-white line-clamp-2 sm:truncate">
                          {report.video_title || 'Untitled Video'}
                        </h3>

                        {/* Status Badge */}
                        <div className="mb-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                            {report.status || 'unknown'}
                          </span>
                        </div>

                        {/* Safety Score */}
                        {report.status === 'completed' && analysisResult && (
                          <>
                            <div className="bg-slate-900 rounded-lg p-4 mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-xs text-slate-400">Overall Safety Score</p>
                                <TooltipIcon
                                  content="Higher scores (80+) = safer content. Lower scores indicate more potentially inappropriate content."
                                  position="top"
                                />
                              </div>
                              <div className="flex items-center">
                                <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      analysisResult.safety_score >= 80 ? 'bg-green-500' :
                                      analysisResult.safety_score >= 50 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${analysisResult.safety_score || 0}%` }}
                                  />
                                </div>
                                <span className="ml-3 font-bold text-lg">
                                  {analysisResult.safety_score || 0}/100
                                </span>
                              </div>
                            </div>

                            {/* Score Breakdown */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <Tooltip content="0-20: Minimal violence, 21-50: Moderate violence, 51+: High violence content">
                                <div className="bg-slate-900 rounded-lg p-3 text-center cursor-help">
                                  <p className="text-xs text-slate-400 mb-1">Violence</p>
                                  <p className={`text-lg font-bold ${
                                    (analysisResult.violence_score || 0) <= 20 ? 'text-green-400' :
                                    (analysisResult.violence_score || 0) <= 50 ? 'text-orange-400' :
                                    'text-red-600'
                                  }`}>
                                    {analysisResult.violence_score || 0}
                                  </p>
                                </div>
                              </Tooltip>
                              <Tooltip content="0-20: Family-friendly, 21-50: Mild suggestive content, 51+: Explicit content">
                                <div className="bg-slate-900 rounded-lg p-3 text-center cursor-help">
                                  <p className="text-xs text-slate-400 mb-1">NSFW</p>
                                  <p className={`text-lg font-bold ${
                                    (analysisResult.nsfw_score || 0) <= 20 ? 'text-green-400' :
                                    (analysisResult.nsfw_score || 0) <= 50 ? 'text-yellow-400' :
                                    'text-red-400'
                                  }`}>
                                    {analysisResult.nsfw_score || 0}
                                  </p>
                                </div>
                              </Tooltip>
                              <Tooltip content="0-20: Not scary, 21-50: Mildly frightening, 51+: Very scary or intense">
                                <div className="bg-slate-900 rounded-lg p-3 text-center cursor-help">
                                  <p className="text-xs text-slate-400 mb-1">Scary</p>
                                  <p className={`text-lg font-bold ${
                                    (analysisResult.scary_score || 0) <= 20 ? 'text-green-400' :
                                    (analysisResult.scary_score || 0) <= 50 ? 'text-yellow-400' :
                                    'text-red-400'
                                  }`}>
                                    {analysisResult.scary_score || 0}
                                  </p>
                                </div>
                              </Tooltip>
                              <Tooltip content="Indicates whether the video contains profanity or inappropriate language">
                                <div className="bg-slate-900 rounded-lg p-3 text-center cursor-help">
                                  <p className="text-xs text-slate-400 mb-1">Profanity</p>
                                  <p className={`text-lg font-bold ${
                                    !analysisResult.profanity_detected ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {analysisResult.profanity_detected ? 'Yes' : 'No'}
                                  </p>
                                </div>
                              </Tooltip>
                            </div>

                            {/* Themes Section - NEW */}
                            {analysisResult.themes && analysisResult.themes.length > 0 && (
                              <div className="bg-slate-900 rounded-lg p-3 mb-4">
                                <p className="text-xs text-slate-400 mb-2">Content Themes</p>
                                <div className="flex flex-wrap gap-1">
                                  {analysisResult.themes.map((theme, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded border border-blue-500/30"
                                    >
                                      {theme}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Age Recommendation */}
                            {analysisResult.age_recommendation && (
                              <Tooltip content="Suggested minimum age based on content analysis including violence, scary elements, NSFW content, and profanity">
                                <div className="bg-purple-500/10 border border-purple-500 rounded-lg p-3 mb-4 cursor-help">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">🎂</span>
                                    <span className="text-sm font-medium text-purple-300">
                                      Recommended for ages {analysisResult.age_recommendation}+
                                    </span>
                                  </div>
                                </div>
                              </Tooltip>
                            )}

                            {/* Preference Warnings */}
                            {(() => {
                              const prefWarnings = checkVideoAgainstPreferences(report)
                              
                              // Filter warnings by selected kid
                              const filteredWarnings = selectedKidFilter !== 'all'
                                ? prefWarnings.filter(w => w.kid.id === selectedKidFilter)
                                : prefWarnings
                              
                              if (filteredWarnings.length === 0) return null
                              
                              return (
                                <div className="space-y-2 mb-4">
                                  {filteredWarnings.map((warning, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-3 rounded-lg text-sm ${
                                        warning.suitable
                                          ? 'bg-green-500/10 border border-green-500 text-green-400'
                                          : 'bg-red-500/10 border border-red-500 text-red-400'
                                      }`}
                                    >
                                      {warning.suitable ? (
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">✅</span>
                                          <span className="font-medium">
                                            Suitable for {warning.kid.name} ({warning.kid.age} years)
                                          </span>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">⚠️</span>
                                            <span className="font-medium">
                                              Not suitable for {warning.kid.name} ({warning.kid.age} years)
                                            </span>
                                          </div>
                                          <ul className="list-disc list-inside text-xs space-y-1 ml-6">
                                            {warning.warnings.map((w, i) => (
                                              <li key={i}>{w}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}

                            {/* Toggle Button */}
                            <button
                              onClick={() => toggleReportDetails(report.id)}
                              className="w-full py-2 px-4 bg-slate-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 rounded-lg text-xs sm:text-sm text-slate-300 hover:text-white transition-all duration-200 flex items-center justify-center touch-manipulation font-medium"
                            >
                              {expandedReports[report.id] ? 'Hide Details ▲' : 'Show Details ▼'}
                            </button>

                            {/* Expanded Details */}
                            {expandedReports[report.id] && (
                              <div className="mt-4 space-y-3 text-sm">
                                {analysisResult.summary && 
                                 analysisResult.summary.trim() && 
                                 !analysisResult.summary.includes('Video content analyzed') && (
                                  <div className="bg-slate-900 rounded-lg p-3">
                                    <p className="text-xs text-slate-400 mb-1">Summary</p>
                                    <p className="text-slate-200">{analysisResult.summary}</p>
                                  </div>
                                )}
                                {analysisResult.concerns && analysisResult.concerns.length > 0 && (
                                  <div className="bg-slate-900 rounded-lg p-3">
                                    <p className="text-xs text-slate-400 mb-2">Concerns</p>
                                    <ul className="list-disc list-inside space-y-1">
                                      {analysisResult.concerns.map((concern, idx) => (
                                        <li key={idx} className="text-red-400">{concern}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {analysisResult.positive_aspects && analysisResult.positive_aspects.length > 0 && (
                                  <div className="bg-slate-900 rounded-lg p-3">
                                    <p className="text-xs text-slate-400 mb-2">Positive Aspects</p>
                                    <ul className="list-disc list-inside space-y-1">
                                      {analysisResult.positive_aspects.map((aspect, idx) => (
                                        <li key={idx} className="text-green-400">{aspect}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Pending/Processing State */}
                        {(report.status === 'pending' || report.status === 'processing') && (
                          <div className="text-center py-6">
                            <LoadingSpinner size="lg" className="mx-auto mb-3" />
                            <p className="text-slate-400 text-xs sm:text-sm">
                              {report.status === 'pending' ? 'Queued for analysis...' : 'Analyzing video...'}
                            </p>
                            <p className="text-slate-500 text-xs mt-1">This may take a few minutes</p>
                          </div>
                        )}

                        {/* Failed State */}
                        {report.status === 'failed' && (
                          <div className="text-center py-6">
                            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                            <p className="text-red-400 text-sm">Analysis failed</p>
                          </div>
                        )}

                        {/* Timestamp */}
                        <p className="text-xs text-slate-500 mt-4">
                          {new Date(report.created_at).toLocaleString()}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )
        })()}
      </div>
    </>
  )}

  {/* Kid Profiles View */}
        {currentView === 'profiles' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-6">Kid Profiles</h1>
            <KidProfiles />
          </div>
        )}

        {/* Account View */}
        {currentView === 'account' && (
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
            <h1 className="text-3xl font-bold text-white mb-6">Account Settings</h1>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={parentProfile?.full_name || ''}
                  disabled
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded text-slate-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Preferences View */}
        {currentView === 'preferences' && (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Content Preferences</h1>
            <ContentPreferences />
        </div>
        )}
      </div>
    </div>
  )
}