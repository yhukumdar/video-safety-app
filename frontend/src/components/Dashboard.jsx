import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink, Search, Camera, Upload, Link as LinkIcon } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Navigation from './Navigation'
import KidProfiles from './KidProfiles'
import ContentPreferences from './ContentPreferences'
import VideoDetail from './VideoDetail'
import VideoHistory from './VideoHistory'
import { LoadingSpinner, LoadingCard } from './LoadingSpinner'
import Tooltip, { TooltipIcon } from './Tooltip'

export default function Dashboard() {
  const { user, parentProfile } = useAuth()
  const [currentView, setCurrentView] = useState('dashboard')
  const [viewingReportId, setViewingReportId] = useState(null)

  // Search tab state
  const [activeTab, setActiveTab] = useState('url') // 'url', 'name', 'image'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [error, setError] = useState(null)
  const [reports, setReports] = useState([])
  const [expandedReports, setExpandedReports] = useState({})
  const [expandedSummaries, setExpandedSummaries] = useState({})
  const [expandedConcerns, setExpandedConcerns] = useState({})
  const [expandedPositives, setExpandedPositives] = useState({})
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

      // Redirect to video detail page to watch analysis progress
      if (result.report_id) {
        setTimeout(() => {
          setViewingReportId(result.report_id)
        }, 1000)
      } else {
        fetchReports()
        setTimeout(() => setUploadStatus(null), 3000)
      }
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

  const toggleSummary = (reportId) => {
    setExpandedSummaries(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }))
  }

  const toggleConcern = (reportId) => {
    setExpandedConcerns(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }))
  }

  const togglePositive = (reportId) => {
    setExpandedPositives(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }))
  }


  // Helper to parse and linkify timestamps in text
  const linkifyTimestamps = (text, videoUrl) => {
    if (!text) return ''
    if (!videoUrl) return text  // Null-safe: return plain text if no video URL

    // Match timestamps like "2:30", "12:45", "1:23:45" or "at 150 seconds"
    const timestampRegex = /(\d{1,2}):(\d{2})(?::(\d{2}))?|at (\d+) seconds?/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = timestampRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      // Calculate seconds
      let seconds
      if (match[4]) {
        // "at X seconds" format
        seconds = parseInt(match[4])
      } else {
        // "MM:SS" or "HH:MM:SS" format
        const hours = match[3] ? parseInt(match[1]) : 0
        const minutes = match[3] ? parseInt(match[2]) : parseInt(match[1])
        const secs = match[3] ? parseInt(match[3]) : parseInt(match[2])
        seconds = hours * 3600 + minutes * 60 + secs
      }

      const timestampUrl = videoUrl.includes('?')
        ? `${videoUrl}&t=${seconds}s`
        : `${videoUrl}?t=${seconds}s`

      parts.push(
        <a
          key={match.index}
          href={timestampUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline font-medium"
        >
          {match[0]}
        </a>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : text
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

  // Search by name handler
  const handleSearchByName = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setError(null)
    setSearchResults([])

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/search/youtube?q=${encodeURIComponent(searchQuery)}&max_results=10`
      )

      if (!response.ok) {
        throw new Error('Failed to search YouTube')
      }

      const data = await response.json()
      setSearchResults(data.videos || [])
    } catch (err) {
      console.error('Search error:', err)
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  // Image upload handlers
  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setSelectedImage(file)
    await handleSearchByImage(file)
  }

  const handleCameraCapture = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setSelectedImage(file)
    await handleSearchByImage(file)
  }

  const handleSearchByImage = async (imageFile) => {
    setSearching(true)
    setError(null)
    setSearchResults([])

    try {
      const formData = new FormData()
      formData.append('file', imageFile)

      console.log('🖼️ Uploading image:', imageFile.name, imageFile.type)

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/search/image`,
        {
          method: 'POST',
          body: formData
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        console.error('Backend error:', errorData)
        throw new Error(errorData.detail || 'Failed to search by image')
      }

      const data = await response.json()
      console.log('✅ Search results:', data)
      setSearchResults(data.videos || [])

      if (data.videos.length === 0) {
        setError('No matching videos found. Try a different image or search by name.')
      }
    } catch (err) {
      console.error('Image search error:', err)
      setError(err.message || 'Failed to analyze image. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  // Analyze video from search results
  const handleAnalyzeFromSearch = async (videoUrl) => {
    if (!parentProfile) {
      setError('Please log in to analyze videos')
      return
    }

    console.log('🎬 Starting analysis for:', videoUrl)
    console.log('👤 Parent ID:', parentProfile.id)
    console.log('🔗 API URL:', import.meta.env.VITE_API_URL)

    setUploading(true)
    setError(null)

    try {
      const requestBody = {
        youtube_url: videoUrl,
        parent_id: parentProfile.id
      }
      console.log('📤 Request body:', requestBody)

      const response = await fetch(`${import.meta.env.VITE_API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Backend error text:', errorText)

        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { detail: errorText }
        }

        console.error('❌ Parsed error:', errorData)
        throw new Error(errorData.detail || errorText || `Server error: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Analysis started:', result)

      setUploadStatus('success')
      setSearchResults([]) // Clear search results
      setSearchQuery('')
      setSelectedImage(null)
      setActiveTab('url') // Switch back to URL tab

      // Redirect to video detail page to watch analysis progress
      if (result.report_id) {
        setTimeout(() => {
          setViewingReportId(result.report_id)
        }, 1000)
      } else {
        fetchReports()
        setTimeout(() => setUploadStatus(null), 3000)
      }
    } catch (err) {
      console.error('❌ Full error object:', err)
      console.error('❌ Error message:', err.message)
      console.error('❌ Error stack:', err.stack)
      setError(err.message || 'Failed to start analysis. Please check console for details.')
    } finally {
      setUploading(false)
    }
  }

  // RETURN STATEMENT STARTS HERE
  // ========================================
  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      {/* Navigation */}
      <Navigation
        currentView={currentView}
        setCurrentView={setCurrentView}
        onViewChange={() => setViewingReportId(null)}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-8">

        {/* Video Detail View */}
        {viewingReportId && (
          <VideoDetail reportId={viewingReportId} onBack={() => setViewingReportId(null)} />
        )}

        {/* Dashboard View */}
        {currentView === 'dashboard' && !viewingReportId && (
          <>
            {/* Hero Section */}
            <div className="mb-12">
              <h1 className="text-4xl sm:text-5xl font-bold text-[#2B4570] mb-4 leading-tight">
                Know what your kids are watching
              </h1>
              <p className="text-lg text-[#6B7280] max-w-2xl">
                AI-powered video analysis to keep your children safe online. Analyze YouTube videos for safety, appropriateness, and age-suitability.
              </p>
            </div>

            {/* Search/Upload Section with Tabs */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 mb-8 border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-[#FF9C8A] to-[#FF7B6B] rounded-xl flex items-center justify-center shadow-lg">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-[#2B4570]">Analyze a Video</h2>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 bg-gray-50 rounded-2xl p-1">
                <button
                  onClick={() => {
                    setActiveTab('url')
                    setSearchResults([])
                    setError(null)
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all ${
                    activeTab === 'url'
                      ? 'bg-white text-[#2B4570] shadow-md scale-[1.02]'
                      : 'text-[#6B7280] hover:text-[#2B4570] hover:bg-white/50'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">By URL</span>
                  <span className="sm:hidden">URL</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('name')
                    setSearchResults([])
                    setError(null)
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all ${
                    activeTab === 'name'
                      ? 'bg-white text-[#2B4570] shadow-md scale-[1.02]'
                      : 'text-[#6B7280] hover:text-[#2B4570] hover:bg-white/50'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Search Name</span>
                  <span className="sm:hidden">Name</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('image')
                    setSearchResults([])
                    setError(null)
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all ${
                    activeTab === 'image'
                      ? 'bg-white text-[#2B4570] shadow-md scale-[1.02]'
                      : 'text-[#6B7280] hover:text-[#2B4570] hover:bg-white/50'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">By Image</span>
                  <span className="sm:hidden">Image</span>
                </button>
              </div>

              {/* Tab Content */}
              <div>
                {/* URL Tab */}
                {activeTab === 'url' && (
                  <div>
                    <label className="block text-sm font-medium text-[#2B4570] mb-2">
                      YouTube Video URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && youtubeUrl && !uploading) {
                          handleYouTubeSubmit()
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-[#2B4570] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9C8A] focus:border-transparent transition-all mb-2"
                    />
                    <p className="text-sm text-[#6B7280] mb-2">
                      Paste a YouTube video URL to analyze its content
                    </p>
                    <p className="text-xs text-[#FF9C8A] mb-4">
                      Analysis usually takes 2-3 minutes. We'll show results here when ready.
                    </p>
                    <button
                      onClick={handleYouTubeSubmit}
                      disabled={!youtubeUrl || uploading || !parentProfile}
                      className="w-full py-3 sm:py-4 bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B] hover:from-[#7a9377] hover:to-[#6b8468] rounded-2xl font-bold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 touch-manipulation text-white"
                    >
                      {uploading ? 'Analyzing...' : '🔍 Analyze Video'}
                    </button>
                  </div>
                )}

                {/* Search by Name Tab */}
                {activeTab === 'name' && (
                  <div>
                    <label className="block text-sm font-medium text-[#2B4570] mb-2">
                      Search YouTube Videos
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter video name or keywords..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && searchQuery && !searching) {
                            handleSearchByName()
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-[#2B4570] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9C8A] focus:border-transparent transition-all"
                      />
                      <button
                        onClick={handleSearchByName}
                        disabled={!searchQuery || searching}
                        className="px-6 py-3 bg-[#FF9C8A] hover:bg-[#7a9377] rounded-2xl font-semibold transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-white"
                      >
                        {searching ? <LoadingSpinner size="sm" /> : <Search className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-sm text-[#6B7280] mt-2">
                      Search for videos by name, channel, or keywords
                    </p>
                  </div>
                )}

                {/* Search by Image Tab */}
                {activeTab === 'image' && (
                  <div>
                    <label className="block text-sm font-medium text-[#2B4570] mb-2">
                      Upload Scene or Screenshot
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCameraCapture}
                        className="hidden"
                      />

                      {/* Upload from files */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={searching}
                        className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 rounded-2xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[#2B4570]"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Choose Image</span>
                        <span className="sm:hidden">Upload</span>
                      </button>

                      {/* Camera button - works best on mobile */}
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={searching}
                        className="flex-1 py-2.5 px-4 bg-[#FF9C8A] hover:bg-[#7a9377] rounded-2xl text-sm font-semibold transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white"
                      >
                        {searching ? <LoadingSpinner size="sm" /> : (
                          <>
                            <Camera className="w-4 h-4" />
                            <span className="hidden sm:inline">Take Photo</span>
                            <span className="sm:hidden">Camera</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-2">
                      💡 Camera button opens camera on mobile, file picker on desktop
                    </p>
                    {selectedImage && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-300 rounded-2xl">
                        <p className="text-sm text-green-600">
                          ✓ Selected: {selectedImage.name}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status Messages */}
              {uploading && (
                <div className="p-4 sm:p-6 bg-blue-50 rounded-2xl border border-blue-300 mt-4">
                  <div className="flex items-center justify-center mb-2">
                    <LoadingSpinner size="md" className="mr-3" />
                    <p className="text-blue-600 text-sm sm:text-base font-medium">Analyzing video...</p>
                  </div>
                  <p className="text-xs text-blue-600/80 text-center">
                    Our AI is carefully reviewing the content. This typically takes 2-3 minutes.
                  </p>
                </div>
              )}

              {searching && (
                <div className="flex items-center justify-center p-4 sm:p-6 bg-blue-50 rounded-2xl border border-blue-300 mt-4">
                  <LoadingSpinner size="md" className="mr-3" />
                  <p className="text-blue-600 text-sm sm:text-base">Searching...</p>
                </div>
              )}

              {uploadStatus === 'success' && (
                <div className="flex items-center justify-center p-6 bg-green-50 rounded-2xl border border-green-300 mt-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  <p className="text-green-600">Analysis started successfully!</p>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center p-6 bg-red-50 rounded-2xl border border-red-300 mt-4">
                  <XCircle className="w-6 h-6 text-red-600 mr-3" />
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (activeTab === 'name' || activeTab === 'image') && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4 text-[#2B4570]">Search Results ({searchResults.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {searchResults.map((video) => (
                      <div
                        key={video.video_id}
                        className="bg-gray-50 rounded-2xl p-4 border border-gray-200 hover:border-[#FF9C8A] hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleAnalyzeFromSearch(video.video_url)}
                      >
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-32 object-cover rounded-2xl mb-3"
                        />
                        <h4 className="font-medium text-sm mb-1 line-clamp-2 text-[#2B4570]">{video.title}</h4>
                        <p className="text-xs text-[#6B7280]">{video.channel}</p>
                        <button
                          className="mt-3 w-full py-2 px-4 bg-[#FF9C8A] hover:bg-[#7a9377] rounded-2xl text-sm font-medium transition-all text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAnalyzeFromSearch(video.video_url)
                          }}
                        >
                          Analyze This Video
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

    </>
  )}

  {/* Video History View */}
        {currentView === 'history' && !viewingReportId && (
          <VideoHistory onViewDetails={setViewingReportId} />
        )}

  {/* Kid Profiles View */}
        {currentView === 'profiles' && (
          <div>
            <h1 className="text-3xl font-bold text-[#2B4570] mb-6">Kid Profiles</h1>
            <KidProfiles />
          </div>
        )}

        {/* Account View */}
        {currentView === 'account' && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
            <h1 className="text-3xl font-bold text-[#2B4570] mb-6">Account Settings</h1>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2B4570] mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-2xl text-[#6B7280]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2B4570] mb-2">Full Name</label>
                <input
                  type="text"
                  value={parentProfile?.full_name || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-2xl text-[#6B7280]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Preferences View */}
        {currentView === 'preferences' && (
        <div>
            <h1 className="text-3xl font-bold text-[#2B4570] mb-6">Content Preferences</h1>
            <ContentPreferences />
        </div>
        )}

        {/* Articles View */}
        {currentView === 'articles' && (
          <div>
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-[#2B4570] mb-3">Safety Articles & Resources</h1>
              <p className="text-lg text-[#6B7280]">Expert advice on keeping your children safe online</p>
            </div>

            {/* Featured Article */}
            <div className="bg-gradient-to-br from-[#2B4570] to-[#1e3151] rounded-2xl p-8 mb-8 text-white">
              <span className="inline-block px-3 py-1 bg-[#FF9C8A] rounded-full text-xs font-medium mb-4">Featured</span>
              <h2 className="text-3xl font-bold mb-3">Understanding Age-Appropriate Content</h2>
              <p className="text-gray-200 mb-6">A comprehensive guide to selecting videos that match your child's developmental stage and emotional maturity.</p>
              <button className="px-6 py-3 bg-white text-[#2B4570] rounded-2xl font-semibold hover:bg-gray-100 transition-colors">
                Read Article →
              </button>
            </div>

            {/* Article Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "What Parents Need to Know About YouTube Kids", category: "Platform Safety", time: "5 min read" },
                { title: "Setting Healthy Screen Time Boundaries", category: "Parenting Tips", time: "7 min read" },
                { title: "Recognizing Red Flags in Children's Videos", category: "Safety Guide", time: "6 min read" },
                { title: "How AI Analyzes Video Content", category: "Technology", time: "4 min read" },
                { title: "Creating a Family Media Plan", category: "Parenting Tips", time: "8 min read" },
                { title: "Understanding Content Ratings", category: "Education", time: "5 min read" },
              ].map((article, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#FF9C8A] hover:shadow-lg transition-all cursor-pointer">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-[#FF9C8A] bg-green-50 px-3 py-1 rounded-full">{article.category}</span>
                    <span className="text-xs text-[#6B7280]">{article.time}</span>
                  </div>
                  <h3 className="font-bold text-lg text-[#2B4570] mb-3">{article.title}</h3>
                  <button className="text-[#FF9C8A] font-medium text-sm hover:text-[#7a9377]">
                    Read more →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions View */}
        {currentView === 'suggestions' && (
          <div>
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-[#2B4570] mb-3">Curated Video Lists</h1>
              <p className="text-lg text-[#6B7280]">Age-appropriate, parent-approved video suggestions for your family</p>
            </div>

            {/* Educational Videos for Ages 3-5 */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#2B4570] mb-1">Educational Videos for Ages 3-5</h2>
                  <p className="text-sm text-[#6B7280]">Gentle learning content for preschoolers</p>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">12 videos</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Alphabet Adventure", channel: "PBS Kids", duration: "8:45", safety: 98 },
                  { title: "Counting with Friends", channel: "Sesame Street", duration: "10:20", safety: 100 },
                  { title: "Colors and Shapes", channel: "Super Simple Songs", duration: "6:15", safety: 100 },
                  { title: "Animal Sounds", channel: "Little Baby Bum", duration: "12:30", safety: 95 },
                ].map((video, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-[#FF9C8A] hover:shadow-lg transition-all">
                    <div className="w-full h-32 bg-gradient-to-br from-[#FF9C8A] to-[#FF7B6B] rounded-2xl mb-3 flex items-center justify-center">
                      <span className="text-white text-4xl">🎬</span>
                    </div>
                    <h3 className="font-bold text-sm text-[#2B4570] mb-1 line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-[#6B7280] mb-2">{video.channel}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6B7280]">{video.duration}</span>
                      <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full font-medium">
                        {video.safety}% safe
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Safe Animated Content for Ages 6-8 */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#2B4570] mb-1">Safe Animated Content for Ages 6-8</h2>
                  <p className="text-sm text-[#6B7280]">Fun, age-appropriate cartoons and stories</p>
                </div>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">18 videos</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Friendship Stories", channel: "StoryBots", duration: "15:20", safety: 92 },
                  { title: "Science Explorers", channel: "Wild Kratts", duration: "22:45", safety: 88 },
                  { title: "Art Adventures", channel: "Art for Kids Hub", duration: "11:30", safety: 100 },
                  { title: "Nature Documentaries", channel: "National Geographic Kids", duration: "18:00", safety: 95 },
                ].map((video, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-[#FF9C8A] hover:shadow-lg transition-all">
                    <div className="w-full h-32 bg-gradient-to-br from-[#2B4570] to-[#1e3151] rounded-2xl mb-3 flex items-center justify-center">
                      <span className="text-white text-4xl">🎨</span>
                    </div>
                    <h3 className="font-bold text-sm text-[#2B4570] mb-1 line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-[#6B7280] mb-2">{video.channel}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6B7280]">{video.duration}</span>
                      <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full font-medium">
                        {video.safety}% safe
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Science & Nature for Ages 9-12 */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#2B4570] mb-1">Science & Nature for Ages 9-12</h2>
                  <p className="text-sm text-[#6B7280]">Engaging STEM content for curious minds</p>
                </div>
                <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">24 videos</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Space Mysteries", channel: "NASA Kids", duration: "25:15", safety: 90 },
                  { title: "Ocean Life", channel: "Blue Planet", duration: "20:30", safety: 93 },
                  { title: "Physics Fun", channel: "Crash Course Kids", duration: "12:45", safety: 95 },
                  { title: "Coding Basics", channel: "Code.org", duration: "16:20", safety: 100 },
                ].map((video, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-[#FF9C8A] hover:shadow-lg transition-all">
                    <div className="w-full h-32 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-3 flex items-center justify-center">
                      <span className="text-white text-4xl">🔬</span>
                    </div>
                    <h3 className="font-bold text-sm text-[#2B4570] mb-1 line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-[#6B7280] mb-2">{video.channel}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6B7280]">{video.duration}</span>
                      <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full font-medium">
                        {video.safety}% safe
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creative & Arts for All Ages */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#2B4570] mb-1">Creative & Arts for All Ages</h2>
                  <p className="text-sm text-[#6B7280]">Inspiring creativity and self-expression</p>
                </div>
                <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-medium">15 videos</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Drawing Tutorials", channel: "Art for Kids", duration: "14:30", safety: 100 },
                  { title: "Music Lessons", channel: "Music Together", duration: "18:45", safety: 98 },
                  { title: "DIY Crafts", channel: "Kids Craft", duration: "10:15", safety: 95 },
                  { title: "Creative Dance", channel: "Movement Kids", duration: "12:00", safety: 100 },
                ].map((video, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-[#FF9C8A] hover:shadow-lg transition-all">
                    <div className="w-full h-32 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl mb-3 flex items-center justify-center">
                      <span className="text-white text-4xl">🎭</span>
                    </div>
                    <h3 className="font-bold text-sm text-[#2B4570] mb-1 line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-[#6B7280] mb-2">{video.channel}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6B7280]">{video.duration}</span>
                      <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full font-medium">
                        {video.safety}% safe
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-br from-[#2B4570] to-[#1e3151] rounded-2xl p-8 text-center text-white">
              <h2 className="text-3xl font-bold mb-3">Want personalized suggestions?</h2>
              <p className="text-gray-200 mb-6 max-w-2xl mx-auto">
                Create kid profiles and set content preferences to get custom video recommendations tailored to your family's values
              </p>
              <button
                onClick={() => setCurrentView('profiles')}
                className="px-8 py-3 bg-[#FF9C8A] hover:bg-[#7a9377] text-white rounded-2xl font-semibold transition-colors shadow-lg"
              >
                Set Up Profiles →
              </button>
            </div>
          </div>
        )}

        {/* Membership View */}
        {currentView === 'membership' && (
          <div>
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl font-bold text-[#2B4570] mb-4">Upgrade to Premium</h1>
              <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
                Get unlimited video analysis, priority support, and advanced features
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
              {/* Free Plan */}
              <div className="bg-white rounded-2xl p-8 border-2 border-gray-200">
                <h3 className="text-2xl font-bold text-[#2B4570] mb-2">Free</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-[#2B4570]">$0</span>
                  <span className="text-[#6B7280]">/month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#6B7280]">5 video analyses per month</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#6B7280]">Basic safety reports</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#6B7280]">1 kid profile</span>
                  </li>
                </ul>
                <button className="w-full py-3 bg-gray-100 text-[#2B4570] rounded-2xl font-semibold hover:bg-gray-200 transition-colors">
                  Current Plan
                </button>
              </div>

              {/* Pro Plan - Featured */}
              <div className="bg-gradient-to-br from-[#2B4570] to-[#1e3151] rounded-2xl p-8 border-2 border-[#FF9C8A] relative transform scale-105 shadow-2xl">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="px-4 py-1 bg-[#FF9C8A] text-white text-sm font-bold rounded-full">Most Popular</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">$9.99</span>
                  <span className="text-gray-300">/month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <span className="text-[#FF9C8A]">✓</span>
                    <span className="text-white">Unlimited video analyses</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#FF9C8A]">✓</span>
                    <span className="text-white">Detailed safety reports</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#FF9C8A]">✓</span>
                    <span className="text-white">Unlimited kid profiles</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#FF9C8A]">✓</span>
                    <span className="text-white">Priority analysis queue</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#FF9C8A]">✓</span>
                    <span className="text-white">Email support</span>
                  </li>
                </ul>
                <button className="w-full py-3 bg-[#FF9C8A] text-white rounded-2xl font-semibold hover:bg-[#7a9377] transition-colors shadow-lg">
                  Upgrade Now
                </button>
              </div>

              {/* Family Plan */}
              <div className="bg-white rounded-2xl p-8 border-2 border-gray-200">
                <h3 className="text-2xl font-bold text-[#2B4570] mb-2">Family</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-[#2B4570]">$19.99</span>
                  <span className="text-[#6B7280]">/month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#6B7280]">Everything in Pro</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#6B7280]">Up to 5 parent accounts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#6B7280]">Advanced analytics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#6B7280]">Custom content rules</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-[#6B7280]">Priority phone support</span>
                  </li>
                </ul>
                <button className="w-full py-3 bg-[#2B4570] text-white rounded-2xl font-semibold hover:bg-[#1e3151] transition-colors">
                  Upgrade Now
                </button>
              </div>
            </div>

            {/* Features Comparison */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-[#2B4570] mb-6">All plans include:</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">🛡️</div>
                  <h3 className="font-bold text-[#2B4570] mb-2">AI Analysis</h3>
                  <p className="text-sm text-[#6B7280]">Advanced content scanning</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3">📊</div>
                  <h3 className="font-bold text-[#2B4570] mb-2">Safety Scores</h3>
                  <p className="text-sm text-[#6B7280]">Detailed safety ratings</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <h3 className="font-bold text-[#2B4570] mb-2">Age Ratings</h3>
                  <p className="text-sm text-[#6B7280]">Personalized recommendations</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3">🔒</div>
                  <h3 className="font-bold text-[#2B4570] mb-2">Privacy First</h3>
                  <p className="text-sm text-[#6B7280]">Your data stays private</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}