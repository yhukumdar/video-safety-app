import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, AlertTriangle, Smile, CheckCircle, ArrowLeft } from 'lucide-react'

const contentConcerns = [
  { id: 'violence', label: 'Violence', icon: '⚔️' },
  { id: 'scary', label: 'Scary Content', icon: '👻' },
  { id: 'inappropriate', label: 'Inappropriate Language', icon: '🚫' },
  { id: 'nsfw', label: 'Adult Content', icon: '🔞' },
  { id: 'bullying', label: 'Bullying/Mean Behavior', icon: '😢' },
  { id: 'misinformation', label: 'Misinformation', icon: '❌' }
]

const ageRanges = [
  { value: '0-3', label: 'Toddler (0-3)' },
  { value: '4-6', label: 'Preschool (4-6)' },
  { value: '7-9', label: 'Early Elementary (7-9)' },
  { value: '10-12', label: 'Late Elementary (10-12)' },
  { value: '13+', label: 'Teen (13+)' }
]

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export default function SignupOnboarding({ onComplete, userEmail }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    numberOfKids: '',
    kids: [],
    concerns: [],
    mainGoal: ''
  })

  const totalSteps = 3

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    console.log('Onboarding data:', formData)
    onComplete(formData)
  }

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addKid = () => {
    const newKid = { id: Date.now(), name: '', ageRange: '' }
    setFormData(prev => ({
      ...prev,
      kids: [...prev.kids, newKid]
    }))
  }

  const updateKid = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      kids: prev.kids.map(kid =>
        kid.id === id ? { ...kid, [field]: value } : kid
      )
    }))
  }

  const removeKid = (id) => {
    setFormData(prev => ({
      ...prev,
      kids: prev.kids.filter(kid => kid.id !== id)
    }))
  }

  const toggleConcern = (concernId) => {
    setFormData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concernId)
        ? prev.concerns.filter(c => c !== concernId)
        : [...prev.concerns, concernId]
    }))
  }

  const canProceed = () => {
    if (currentStep === 0) {
      return formData.kids.length > 0 && formData.kids.every(kid => kid.name && kid.ageRange)
    }
    if (currentStep === 1) {
      return formData.concerns.length > 0
    }
    if (currentStep === 2) {
      return formData.mainGoal.trim().length > 0
    }
    return false
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFBF7] to-white flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-[#6B7280]">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-[#6B7280]">
              {Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#FF9C8A] to-[#5BC5B8]"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Step 1: Kids Info */}
            {currentStep === 0 && (
              <motion.div
                key="step1"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#FF9C8A] to-[#FF7B6B] rounded-2xl flex items-center justify-center mb-6">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-[#2A3D66] mb-3">
                    Tell us about your kids
                  </h2>
                  <p className="text-lg text-[#6B7280]">
                    We'll customize safety reports for each child's age
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  {formData.kids.map((kid, index) => (
                    <motion.div
                      key={kid.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-[#FFF4F1] to-white rounded-2xl p-6 border-2 border-transparent hover:border-[#FF9C8A] transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="text-sm font-semibold text-[#6B7280]">
                          Child {index + 1}
                        </span>
                        {formData.kids.length > 1 && (
                          <button
                            onClick={() => removeKid(kid.id)}
                            className="text-[#6B7280] hover:text-[#FF7B6B] text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Child's name or nickname"
                        value={kid.name}
                        onChange={(e) => updateKid(kid.id, 'name', e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl mb-4 focus:outline-none focus:border-[#FF9C8A] transition-colors text-[#2A3D66] placeholder-gray-400"
                      />

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ageRanges.map((range) => (
                          <button
                            key={range.value}
                            onClick={() => updateKid(kid.id, 'ageRange', range.value)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                              kid.ageRange === range.value
                                ? 'bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B] text-white shadow-md'
                                : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button
                  onClick={addKid}
                  className="w-full py-3 border-2 border-dashed border-[#FF9C8A] text-[#FF9C8A] rounded-xl hover:bg-[#FFF4F1] transition-all font-medium"
                >
                  + Add Another Child
                </button>
              </motion.div>
            )}

            {/* Step 2: Concerns */}
            {currentStep === 1 && (
              <motion.div
                key="step2"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#5BC5B8] to-[#45B5A8] rounded-2xl flex items-center justify-center mb-6">
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-[#2A3D66] mb-3">
                    What concerns you most?
                  </h2>
                  <p className="text-lg text-[#6B7280]">
                    Select all that apply—we'll prioritize these in safety reports
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {contentConcerns.map((concern) => (
                    <button
                      key={concern.id}
                      onClick={() => toggleConcern(concern.id)}
                      className={`p-5 rounded-2xl border-2 transition-all text-left ${
                        formData.concerns.includes(concern.id)
                          ? 'border-[#5BC5B8] bg-gradient-to-br from-[#F0F9F8] to-white shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{concern.icon}</span>
                        <div className="flex-1">
                          <span className="font-semibold text-[#2A3D66] block">
                            {concern.label}
                          </span>
                        </div>
                        {formData.concerns.includes(concern.id) && (
                          <CheckCircle className="w-6 h-6 text-[#5BC5B8]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Main Goal */}
            {currentStep === 2 && (
              <motion.div
                key="step3"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#A897D4] to-[#9887C4] rounded-2xl flex items-center justify-center mb-6">
                    <Smile className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-[#2A3D66] mb-3">
                    What's your main goal?
                  </h2>
                  <p className="text-lg text-[#6B7280]">
                    Help us understand what success looks like for you
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    'Feel confident about what my kids watch',
                    'Save time by not previewing every video',
                    'Have informed conversations with my kids about content',
                    'Set healthy boundaries around screen time',
                    'Other'
                  ].map((goal) => (
                    <button
                      key={goal}
                      onClick={() => updateFormData('mainGoal', goal)}
                      className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
                        formData.mainGoal === goal
                          ? 'border-[#A897D4] bg-gradient-to-br from-[#F7F3FD] to-white shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#2A3D66]">{goal}</span>
                        {formData.mainGoal === goal && (
                          <CheckCircle className="w-6 h-6 text-[#A897D4]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {formData.mainGoal === 'Other' && (
                  <motion.textarea
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    placeholder="Tell us more about your goal..."
                    className="w-full mt-4 p-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-[#A897D4] transition-colors resize-none"
                    rows={3}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex gap-4 mt-8">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-[#2A3D66] font-semibold rounded-full transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex-1 py-4 rounded-full font-semibold text-lg transition-all ${
                canProceed()
                  ? 'bg-gradient-to-r from-[#FF9C8A] to-[#5BC5B8] hover:opacity-90 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {currentStep === totalSteps - 1 ? 'Complete Setup' : 'Continue'}
            </button>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-[#6B7280] mt-6">
          Your information is private and secure 🔒
        </p>
      </div>
    </div>
  )
}
