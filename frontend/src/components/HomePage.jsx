import { Shield, Search, CheckCircle, Users, Lock, Zap, Heart, Star } from 'lucide-react'
import { motion } from 'framer-motion'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 }
}

export default function HomePage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#FF9C8A] to-[#FF7B6B] rounded-2xl flex items-center justify-center shadow-sm">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#2A3D66] tracking-tight">Video Safety</span>
            </div>
            <motion.button
              onClick={onGetStarted}
              className="px-5 py-3 sm:px-7 sm:py-3.5 bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B] hover:from-[#FF8B7A] hover:to-[#FF6A5A] text-white font-semibold text-sm sm:text-base rounded-full transition-all duration-300 shadow-md hover:shadow-lg min-h-[48px]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="hidden sm:inline">Get Started Free</span>
              <span className="sm:hidden">Get Started</span>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2A3D66] via-[#374B7A] to-[#2A3D66] text-white py-20 sm:py-28 lg:py-36">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#5BC5B8]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#FF9C8A]/10 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full mb-10 border border-white/20"
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
            >
              <span className="text-sm font-medium">✨ Trusted by 10,000+ parents</span>
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-[1.15] px-4 sm:px-0"
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
            >
              Finally,{' '}
              <span className="bg-gradient-to-r from-[#FFB4A6] via-[#FF9C8A] to-[#5BC5B8] bg-clip-text text-transparent">
                peace of mind
              </span>
              <br />
              about screen time
            </motion.h1>

            <motion.p
              className="text-xl sm:text-2xl lg:text-2xl text-white/80 mb-12 sm:mb-14 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0"
              variants={fadeInUp}
              transition={{ duration: 0.7 }}
            >
              Know exactly what's in every video before your child watches. Get detailed safety reports in minutes—not hours of preview watching.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-5 justify-center px-4 sm:px-0"
              variants={fadeInUp}
              transition={{ duration: 0.8 }}
            >
              <motion.button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-10 py-5 min-h-[60px] bg-gradient-to-r from-[#FF9C8A] to-[#FF7B6B] hover:from-[#FF8B7A] hover:to-[#FF6A5A] text-white font-semibold text-lg rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Analyzing Free
              </motion.button>
              <motion.button
                className="w-full sm:w-auto px-10 py-5 min-h-[60px] bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold text-lg rounded-full transition-all duration-300 border-2 border-white/30 hover:border-white/50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                See How It Works
              </motion.button>
            </motion.div>

            <motion.p
              className="text-sm text-white/70 mt-8"
              variants={fadeInUp}
              transition={{ duration: 0.9 }}
            >
              No credit card required • 5 free analyses
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-16 items-center text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {[
              { number: "10K+", label: "Parents Trust Us" },
              { number: "50K+", label: "Videos Analyzed" },
              { number: "98%", label: "Accuracy Rate" },
              { number: "2-3 min", label: "Analysis Time" }
            ].map((stat, idx) => (
              <motion.div key={idx} variants={scaleIn} transition={{ duration: 0.5 }} className="py-4 sm:py-0">
                <p className="text-5xl sm:text-6xl font-bold text-[#2A3D66] mb-3">{stat.number}</p>
                <p className="text-base sm:text-lg text-[#6B7280]">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-24 lg:py-32 bg-gradient-to-b from-[#FFF4F1] to-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div
            className="text-center mb-20 sm:mb-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2A3D66] mb-6">
              Simple. Safe. Smart.
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-[#6B7280] max-w-2xl mx-auto px-4 sm:px-0 leading-relaxed">
              Get detailed safety reports in three easy steps
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-[#FFD4CC] to-[#FF9C8A] rounded-3xl flex items-center justify-center mb-8">
                <span className="text-4xl">1️⃣</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#2A3D66] mb-4">Share the Video</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">
                Paste a YouTube URL, search by name, or upload a screenshot from your child's device
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-[#A8E6DC] to-[#5BC5B8] rounded-3xl flex items-center justify-center mb-8">
                <span className="text-4xl">2️⃣</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#2A3D66] mb-4">AI Analyzes</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">
                Our advanced AI reviews the entire video for violence, scary content, profanity, and age-appropriateness
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-[#D4C8E8] to-[#A897D4] rounded-3xl flex items-center justify-center mb-8">
                <span className="text-4xl">3️⃣</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#2A3D66] mb-4">Get Your Report</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">
                Receive a detailed safety score with timestamps, concerns, and personalized recommendations
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div
            className="text-center mb-20 sm:mb-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2A3D66] mb-6">
              Everything you need to keep kids safe
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-[#6B7280] max-w-2xl mx-auto px-4 sm:px-0 leading-relaxed">
              Powerful features designed with parents in mind
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={scaleIn} className="p-8 rounded-3xl hover:bg-[#FFF4F1] transition-all duration-300 group">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF9C8A] to-[#FF7B6B] rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-shadow">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#2A3D66] mb-3">Comprehensive Safety Scores</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">Get detailed ratings for violence, scary content, NSFW, and profanity</p>
            </motion.div>

            <motion.div variants={scaleIn} className="p-8 rounded-3xl hover:bg-[#F0F9F8] transition-all duration-300 group">
              <div className="w-16 h-16 bg-gradient-to-br from-[#5BC5B8] to-[#45B5A8] rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-shadow">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#2A3D66] mb-3">Multiple Search Methods</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">Find videos by URL, name search, or screenshot upload</p>
            </motion.div>

            <motion.div variants={scaleIn} className="p-8 rounded-3xl hover:bg-[#F7F3FD] transition-all duration-300 group">
              <div className="w-16 h-16 bg-gradient-to-br from-[#A897D4] to-[#9887C4] rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-shadow">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#2A3D66] mb-3">Multiple Kid Profiles</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">Customize preferences for each child based on their age and maturity</p>
            </motion.div>

            <motion.div variants={scaleIn} className="p-8 rounded-3xl hover:bg-[#FFF9E6] transition-all duration-300 group">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FFB86B] to-[#FFA84D] rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-shadow">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#2A3D66] mb-3">Lightning Fast</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">Get comprehensive analysis in just 2-3 minutes</p>
            </motion.div>

            <motion.div variants={scaleIn} className="p-8 rounded-3xl hover:bg-[#F0F9F8] transition-all duration-300 group">
              <div className="w-16 h-16 bg-gradient-to-br from-[#5BC5B8] to-[#45B5A8] rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-shadow">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#2A3D66] mb-3">Timestamp Details</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">See exactly when concerning content appears in the video</p>
            </motion.div>

            <motion.div variants={scaleIn} className="p-8 rounded-3xl hover:bg-[#FFF4F1] transition-all duration-300 group">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF9C8A] to-[#FF7B6B] rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-shadow">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#2A3D66] mb-3">Privacy First</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">Your data stays private. We never share your information</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-24 lg:py-32 bg-gradient-to-br from-[#2A3D66] via-[#374B7A] to-[#2A3D66] text-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div
            className="text-center mb-20 sm:mb-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8">
              Parents love Video Safety
            </h2>
            <div className="flex justify-center gap-2 mb-5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-7 h-7 sm:w-9 sm:h-9 fill-[#FFB86B] text-[#FFB86B]" />
              ))}
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl text-white/80">4.9/5 from 2,000+ reviews</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={scaleIn} className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 sm:p-10 border border-white/20 hover:border-white/30 transition-all duration-300">
              <div className="flex gap-1.5 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#FFB86B] text-[#FFB86B]" />
                ))}
              </div>
              <p className="text-base sm:text-lg text-white/90 mb-8 leading-relaxed">
                "Finally, a tool that helps me make informed decisions! The timestamp feature is a game-changer."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#FF9C8A] to-[#FF7B6B] rounded-full flex items-center justify-center font-bold text-lg">
                  S
                </div>
                <div>
                  <p className="font-bold text-lg">Sarah M.</p>
                  <p className="text-sm text-white/70">Mom of 2</p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={scaleIn} className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 sm:p-10 border border-white/20 hover:border-white/30 transition-all duration-300">
              <div className="flex gap-1.5 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#FFB86B] text-[#FFB86B]" />
                ))}
              </div>
              <p className="text-base sm:text-lg text-white/90 mb-8 leading-relaxed">
                "The screenshot search feature is brilliant! My daughter shows me videos on her tablet and I can quickly check them."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#5BC5B8] to-[#45B5A8] rounded-full flex items-center justify-center font-bold text-lg">
                  J
                </div>
                <div>
                  <p className="font-bold text-lg">James L.</p>
                  <p className="text-sm text-white/70">Dad of 3</p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={scaleIn} className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 sm:p-10 border border-white/20 hover:border-white/30 transition-all duration-300">
              <div className="flex gap-1.5 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#FFB86B] text-[#FFB86B]" />
                ))}
              </div>
              <p className="text-base sm:text-lg text-white/90 mb-8 leading-relaxed">
                "Peace of mind knowing exactly what my kids are watching. The AI is incredibly accurate!"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#A897D4] to-[#9887C4] rounded-full flex items-center justify-center font-bold text-lg">
                  M
                </div>
                <div>
                  <p className="font-bold text-lg">Maria G.</p>
                  <p className="text-sm text-white/70">Mom of 1</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-24 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div
            className="text-center mb-20 sm:mb-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2A3D66] mb-6">
              Frequently asked questions
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-[#6B7280] leading-relaxed">Everything you need to know</p>
          </motion.div>

          <motion.div
            className="space-y-6 sm:space-y-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="bg-gradient-to-br from-[#FFF4F1] to-white rounded-3xl p-8 sm:p-10 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl sm:text-2xl font-bold text-[#2A3D66] mb-4">How accurate is the AI analysis?</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">
                Our AI has a 98% accuracy rate and analyzes videos frame-by-frame for comprehensive safety assessment. It's trained on thousands of parent-reviewed videos.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-gradient-to-br from-[#F0F9F8] to-white rounded-3xl p-8 sm:p-10 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl sm:text-2xl font-bold text-[#2A3D66] mb-4">How long does analysis take?</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">
                Most videos are analyzed in 2-3 minutes. You'll receive a notification when your report is ready.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-gradient-to-br from-[#F7F3FD] to-white rounded-3xl p-8 sm:p-10 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl sm:text-2xl font-bold text-[#2A3D66] mb-4">Can I customize what's flagged?</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">
                Yes! Create profiles for each child and set custom thresholds for violence, scary content, and other categories based on your family's values.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-gradient-to-br from-[#FFF9E6] to-white rounded-3xl p-8 sm:p-10 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl sm:text-2xl font-bold text-[#2A3D66] mb-4">Is my data private?</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">
                Absolutely. We never share your data. All analysis is done securely, and you can delete your data anytime.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-gradient-to-br from-[#FFF4F1] to-white rounded-3xl p-8 sm:p-10 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl sm:text-2xl font-bold text-[#2A3D66] mb-4">Do you support platforms other than YouTube?</h3>
              <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">
                Currently we support YouTube videos. Support for other platforms is coming soon!
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-24 lg:py-32 bg-gradient-to-br from-[#FF9C8A] via-[#FF8A78] to-[#5BC5B8] text-white">
        <motion.div
          className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8"
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
          >
            Ready to keep your kids safe?
          </motion.h2>
          <motion.p
            className="text-xl sm:text-2xl lg:text-2xl mb-12 sm:mb-14 text-white/95 px-4 sm:px-0 leading-relaxed"
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
          >
            Join thousands of parents who trust Video Safety. Start analyzing videos for free today.
          </motion.p>
          <motion.button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-12 py-6 min-h-[64px] bg-white text-[#2A3D66] font-bold text-xl rounded-full transition-all duration-300 shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            variants={scaleIn}
            transition={{ duration: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Get Started Free
          </motion.button>
          <motion.p
            className="text-base mt-8 text-white/90"
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
          >
            No credit card required • 5 free analyses
          </motion.p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2A3D66] text-white py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-16 mb-20">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-[#FF9C8A] to-[#FF7B6B] rounded-2xl flex items-center justify-center shadow-sm">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <span className="text-xl font-bold">Video Safety</span>
              </div>
              <p className="text-white/70 text-base leading-relaxed">
                Helping parents make informed decisions about their children's online content.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-lg">Product</h4>
              <ul className="space-y-4 text-base text-white/70">
                <li><a href="#" className="hover:text-white transition-colors duration-200 inline-block">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-200 inline-block">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-200 inline-block">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-lg">Company</h4>
              <ul className="space-y-4 text-base text-white/70">
                <li><a href="#" className="hover:text-white transition-colors duration-200 inline-block">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-200 inline-block">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-200 inline-block">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-lg">Legal</h4>
              <ul className="space-y-4 text-base text-white/70">
                <li><a href="#" className="hover:text-white transition-colors duration-200 inline-block">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-200 inline-block">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-10 text-center text-base text-white/70">
            <p>© 2024 Video Safety. All rights reserved. Made with <Heart className="w-4 h-4 inline text-[#FF9C8A]" /> for parents.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
