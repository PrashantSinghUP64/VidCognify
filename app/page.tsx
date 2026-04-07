"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sparkles, Brain, Clock, Globe, MessageSquare, GitCompare,
  BookOpen, HelpCircle, Lightbulb, Star, Zap, BarChart3,
  Key, Github, Linkedin, Twitter, Youtube, Mail, Link2,
  ArrowRight, Play, ChevronRight, Shield, Database, Code2, LayoutDashboard
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  })
};

const features = [
  {
    icon: Sparkles,
    title: "Instant AI Summarization",
    desc: "Paste any YouTube URL and get chapter-based summaries, sentiment analysis, difficulty rating, and key takeaways in seconds.",
    color: "from-violet-500 to-purple-600",
    badge: "Core"
  },
  {
    icon: Clock,
    title: "Smart Chapter Detection",
    desc: "Auto-detect topics with precise timestamps. Navigate directly to any section. Edit and rename chapters to your preference.",
    color: "from-blue-500 to-cyan-500",
    badge: "Smart"
  },
  {
    icon: Globe,
    title: "Multilingual Support",
    desc: "Generate summaries in any language regardless of the video's original language. Hindi, English, and 5+ languages supported.",
    color: "from-emerald-500 to-teal-500",
    badge: "Global"
  },
  {
    icon: MessageSquare,
    title: "AI Video Chat",
    desc: "Ask anything about the video. Get context-aware answers from the AI that has fully read the transcript before responding.",
    color: "from-orange-500 to-amber-500",
    badge: "Interactive"
  },
  {
    icon: GitCompare,
    title: "Video Comparison",
    desc: "Compare two YouTube videos side-by-side. Get AI-generated analysis of similarities, differences, and unique insights from each.",
    color: "from-pink-500 to-rose-500",
    badge: "Unique"
  },
  {
    icon: HelpCircle,
    title: "Auto Quiz Generator",
    desc: "Instantly generate 5 multiple-choice questions from any video transcript. Test your understanding and reinforce learning.",
    color: "from-yellow-500 to-orange-500",
    badge: "Learn"
  },
  {
    icon: BookOpen,
    title: "Structured Study Notes",
    desc: "One-click Markdown-formatted study notes with headers, bullet points, and key concepts extracted from video content.",
    color: "from-indigo-500 to-blue-600",
    badge: "Study"
  },
  {
    icon: Lightbulb,
    title: "Dynamic Learning Paths",
    desc: "Get 5 curated YouTube video recommendations based on AI-determined keywords and category of the video you just summarized.",
    color: "from-teal-500 to-green-500",
    badge: "Curated"
  },
  {
    icon: Star,
    title: "Smart Highlights",
    desc: "Select any text in the summary, highlight it in 4 colors, add personal notes. All highlights saved to a dedicated panel.",
    color: "from-fuchsia-500 to-purple-600",
    badge: "Personal"
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Track your learning with usage stats, API token consumption, topic distribution charts, and daily streak tracking.",
    color: "from-sky-500 to-blue-500",
    badge: "Insights"
  },
  {
    icon: Key,
    title: "Bring Your Own Key",
    desc: "Use your personal Groq or OpenAI API keys. Keys are encrypted and stored securely. Full cost control.",
    color: "from-lime-500 to-emerald-600",
    badge: "BYOK"
  },
  {
    icon: Database,
    title: "Full History Archive",
    desc: "Every summary automatically saved. Access, search, and revisit your entire learning history at any time.",
    color: "from-red-500 to-orange-600",
    badge: "Archive"
  }
];

const steps = [
  { num: "01", title: "Paste YouTube URL", desc: "Copy any YouTube video link and paste it into VidCognify's smart input field.", icon: Play },
  { num: "02", title: "AI Processes Video", desc: "Our AI extracts transcript, detects chapters, analyzes sentiment and generates structured insights.", icon: Brain },
  { num: "03", title: "Learn Smarter", desc: "Read summaries, chat with AI, take quizzes, save highlights, and continue with curated recommendations.", icon: Zap }
];

const techStack = [
  { name: "Next.js 16", category: "Framework" },
  { name: "Groq AI", category: "LLM" },
  { name: "OpenAI GPT", category: "LLM" },
  { name: "PostgreSQL", category: "Database" },
  { name: "Prisma ORM", category: "ORM" },
  { name: "Framer Motion", category: "Animation" },
  { name: "Tailwind CSS", category: "Styling" },
  { name: "TypeScript", category: "Language" },
  { name: "Better Auth", category: "Auth" },
  { name: "Radix UI", category: "Components" },
  { name: "Vercel", category: "Deployment" }
];

const socialLinks = [
  { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/prashant-kumar-singh-51b225230/", color: "text-blue-500" },
  { icon: Github, label: "GitHub", href: "https://github.com/PrashantSinghUP64", color: "text-foreground" },
  { icon: Twitter, label: "Twitter / X", href: "https://x.com/prashant_UP_64", color: "text-sky-400" },
  { icon: Youtube, label: "YouTube", href: "https://www.youtube.com/@technicalknowledgehindi1949", color: "text-red-500" },
  { icon: Mail, label: "Email", href: "mailto:ps7027804@gmail.com", color: "text-emerald-500" },
  { icon: Link2, label: "All Links", href: "https://linktr.ee/Prashantsingh64", color: "text-violet-500" }
];

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0f] text-gray-900 dark:text-white overflow-x-hidden">
      
      {/* ─── HEADER ─── */}
      <header className="absolute top-0 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg hidden sm:block">VidCognify</span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            <Link href="/history" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">History</Link>
            <Link href="/compare" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Compare</Link>
            <Link href="/dashboard" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Dashboard</Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-28 pb-28 px-6 text-center overflow-hidden">
        {/* Background mesh */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-violet-500/10 via-purple-500/5 to-transparent dark:from-violet-600/15 dark:via-purple-700/8 rounded-full blur-3xl" />
          <div className="absolute top-40 left-10 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-10 w-64 h-64 bg-pink-500/5 dark:bg-pink-500/10 rounded-full blur-3xl" />
          {/* Dot grid */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
              backgroundSize: "32px 32px"
            }}
          />
        </div>

        <motion.div initial="hidden" animate="visible" className="relative max-w-4xl mx-auto">
          <motion.div variants={fadeUp} custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-sm font-medium mb-8"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered YouTube Intelligence Platform
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            Transform YouTube
            <br />
            <span className="bg-gradient-to-r from-violet-600 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              into Intelligence
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2}
            className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Stop wasting hours watching. Start learning smarter.
            <br />
            AI summaries, quizzes, notes, and learning paths — from any YouTube video.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isLoading ? (
              <div className="h-12 w-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            ) : isAuthenticated ? (
              <Link href="/dashboard">
                <motion.div
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="flex cursor-pointer items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-base shadow-lg shadow-violet-500/25 transition-all duration-200"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <motion.div
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="flex cursor-pointer items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-base shadow-lg shadow-violet-500/25 transition-all duration-200"
                  >
                    <Sparkles className="w-4 h-4" />
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </Link>
                <Link href="/login">
                  <motion.div
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex cursor-pointer items-center gap-2 px-7 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold text-base hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                  >
                    Sign In
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </Link>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Hero visual - floating summary card mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-16 max-w-3xl mx-auto"
        >
          <motion.div
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl dark:shadow-violet-900/20 overflow-hidden">
              {/* Mockup header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="ml-4 flex-1 h-5 rounded-md bg-gray-200 dark:bg-gray-800 text-xs flex items-center px-3 text-gray-500 dark:text-gray-600">
                  vid-cognify.vercel.app/summary/...
                </div>
              </div>
              {/* Mockup body */}
              <div className="grid grid-cols-2 gap-0">
                <div className="p-5 border-r border-gray-100 dark:border-gray-800">
                  <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/40 dark:to-blue-900/40 mb-3 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow flex items-center justify-center">
                      <Play className="w-5 h-5 text-violet-600 ml-0.5" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {["Introduction", "Key Concepts", "Deep Dive", "Conclusion"].map((c, i) => (
                      <div key={c} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${["bg-violet-500","bg-blue-500","bg-emerald-500","bg-orange-500"][i]}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex gap-1.5 mb-3">
                    {["POSITIVE", "INTERMEDIATE", "TECH"].map((t, i) => (
                      <span key={t} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        i===0?"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400":
                        i===1?"bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400":
                        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                      }`}>{t}</span>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-full" />
                    <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-5/6" />
                    <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-4/5" />
                    <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-full" />
                    <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-3/4" />
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                    {["Quiz", "Notes", "Chat"].map(btn => (
                      <span key={btn} className="text-xs px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium">{btn}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating badges */}
          <motion.div
            animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute -left-8 top-1/3 hidden sm:block"
          >
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs font-medium text-gray-700 dark:text-gray-300">
              ✨ Summary in 3 seconds
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [4, -4, 4] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -right-8 top-1/4 hidden sm:block"
          >
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs font-medium text-gray-700 dark:text-gray-300">
              🌍 5+ Languages
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="py-10 border-y border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { val: "12+", label: "Features Packed" },
              { val: "5+", label: "Languages Supported" },
              { val: "5", label: "AI Models Integrated" },
              { val: "100%", label: "Open Source" }
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }} viewport={{ once: true }}>
                <div className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">{s.val}</div>
                <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
              <Zap className="w-3.5 h-3.5" />
              Everything You Need
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Packed with Powerful Features</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Every tool a serious learner needs — built directly into one seamless platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i % 6) * 0.07, duration: 0.5 }} viewport={{ once: true }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 cursor-default overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:shadow-xl dark:hover:shadow-violet-900/10"
                >
                  {/* hover gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 rounded-2xl`} />

                  <div className="flex items-start gap-4 relative">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${f.color} shadow-sm flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base text-gray-900 dark:text-white">{f.title}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex-shrink-0">{f.badge}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-4">
              <Code2 className="w-3.5 h-3.5" />
              Simple Process
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How VidCognify Works</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Three steps from URL to understanding</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.num}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.5 }} viewport={{ once: true }}
                  className="text-center relative"
                >
                  {i < 2 && (
                    <div className="hidden md:block absolute top-10 left-[calc(50%+48px)] w-[calc(100%-48px)] h-px border-t-2 border-dashed border-gray-200 dark:border-gray-800" />
                  )}
                  <div className="relative inline-flex">
                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-900 border-2 border-violet-200 dark:border-violet-800 flex items-center justify-center shadow-lg mx-auto mb-5">
                      <Icon className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-violet-500 dark:text-violet-400 mb-1 tracking-wider">{step.num}</div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Removed tech stack section */}

      {/* ─── CTA SECTION ─── */}
      <section className="py-24 px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center relative"
        >
          <div className="relative rounded-3xl overflow-hidden border border-violet-200 dark:border-violet-900 bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 p-12 shadow-2xl shadow-violet-500/25">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="relative">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-4xl font-bold text-white mb-4">Start Learning Smarter Today</h2>
              <p className="text-violet-200 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of students who use VidCognify to extract maximum knowledge from every YouTube video.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-violet-700 font-bold text-base hover:bg-violet-50 transition-all duration-200 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    Create Free Account
                  </motion.button>
                </Link>
                <Link href="/compare">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all duration-200"
                  >
                    Try Video Compare
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── CREATOR SECTION ─── */}
      <section className="py-20 px-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-10">
            <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Built by</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Prashant Kumar Singh</h2>
            <p className="text-violet-600 dark:text-violet-400 font-semibold text-lg">B.Tech CSE (AI/ML)</p>
            <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto text-sm">
              A passionate AI/ML student building tools that solve real problems. Every line of code written with one goal — make learning more efficient.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {socialLinks.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }} viewport={{ once: true }}
                  whileHover={{ y: -4, scale: 1.03 }}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg transition-all duration-200 group"
                >
                  <Icon className={`w-6 h-6 ${s.color} group-hover:scale-110 transition-transform duration-200`} />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{s.label}</span>
                </motion.a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-6 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">VidCognify</span>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
            © 2024–2026 VidCognify — MIT License.
            <span className="mx-2">·</span>
            Built by{" "}
            <a href="https://www.linkedin.com/in/prashant-kumar-singh-51b225230/"
              target="_blank" rel="noopener noreferrer"
              className="text-violet-600 dark:text-violet-400 hover:underline font-medium">
              Prashant Kumar Singh
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
