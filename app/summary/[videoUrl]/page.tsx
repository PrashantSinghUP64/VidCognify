"use client"

import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { use } from "react"
import ReactMarkdown from "react-markdown"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  AlertCircle,
  X,
  Download,
  ArrowLeft,
  FileText,
  Layers,
  Star,
  ExternalLink,
  BookOpen,
  MessageSquare,
  Send,
  Bot,
  User,
  Loader2,
  GraduationCap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  NotebookPen,
  Printer,
  Highlighter,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProgressStagesEnhanced, type Stage } from "@/components/progress-stages-enhanced"
import { ChapterTimeline } from "@/components/chapter-timeline"
import { TranscriptWithTimestamps } from "@/components/transcript-with-timestamps"
import {
  CollapsibleChapter,
  parseSummaryContent,
  getChapterColor,
  type ParsedSummary,
} from "@/components/collapsible-chapter"
import { extractVideoId } from "@/lib/youtube"
import { generateMarkdown } from "@/lib/exportMarkdown"
import { containerVariants, itemVariants } from "@/lib/animations"
import { cn } from "@/lib/utils"

interface Topic {
  id: string
  title: string
  startMs: number
  endMs: number
  order: number
}

interface TranscriptSegment {
  id: string
  text: string
  offset: number
  duration: number
  order: number
}

interface SummaryData {
  id: string
  videoId: string
  title: string
  content: string
  hasTimestamps: boolean
  sentiment?: string
  difficulty?: string
  category?: string
  keywords?: string
  topics: Topic[]
  transcriptSegments: TranscriptSegment[]
  modelUsed: string
  source: "cache" | "generated"
}

function urlSafeBase64Decode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  const pad = base64.length % 4
  const paddedBase64 = pad ? base64 + "=".repeat(4 - pad) : base64
  return atob(paddedBase64)
}

interface Highlight {
  id: string
  text: string
  note?: string | null
  color: string
  createdAt: string
}

interface PageProps {
  params: Promise<{ videoUrl: string }>
}

export default function SummaryPage({ params }: PageProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [currentStage, setCurrentStage] = useState<Stage | null>(null)
  const [videoId, setVideoId] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"chapters" | "transcript">("chapters")
  const [showFullSummary, setShowFullSummary] = useState(false)

  // Chat feature state
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'assistant', content: string}[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isChatLoading, setIsChatLoading] = useState(false)

  // Quiz feature state
  interface QuizQuestion {
    question: string
    options: [string, string, string, string]
    correct: "A" | "B" | "C" | "D"
  }
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [quizStarted, setQuizStarted] = useState(false)
  const [userAnswers, setUserAnswers] = useState<("A" | "B" | "C" | "D" | null)[]>([])
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  const handleGenerateQuiz = async () => {
    setQuizLoading(true)
    setQuizError(null)
    setQuizQuestions([])
    setUserAnswers([])
    setQuizSubmitted(false)
    setQuizStarted(false)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoUrl: Array.isArray(videoUrl) ? videoUrl[0] : videoUrl }),
      })
      const data = await response.json()
      if (!response.ok) {
        setQuizError(data.error || "Failed to generate quiz")
        return
      }
      setQuizQuestions(data.questions || [])
      setUserAnswers(new Array(data.questions.length).fill(null))
      setQuizStarted(true)
    } catch {
      setQuizError("Network error. Please try again.")
    } finally {
      setQuizLoading(false)
    }
  }

  const handleSelectAnswer = (qIdx: number, answer: "A" | "B" | "C" | "D") => {
    if (quizSubmitted) return
    setUserAnswers(prev => {
      const updated = [...prev]
      updated[qIdx] = answer
      return updated
    })
  }

  const handleSubmitQuiz = () => {
    if (userAnswers.some(a => a === null)) return
    setQuizSubmitted(true)
  }

  const handleResetQuiz = () => {
    setQuizQuestions([])
    setUserAnswers([])
    setQuizSubmitted(false)
    setQuizStarted(false)
    setQuizError(null)
  }

  const quizScore = quizSubmitted
    ? quizQuestions.filter((q, i) => userAnswers[i] === q.correct).length
    : 0

  // Notes feature state
  const [notesMarkdown, setNotesMarkdown] = useState<string | null>(null)
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)

  const handleGenerateNotes = async () => {
    setNotesLoading(true)
    setNotesError(null)
    setNotesMarkdown(null)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoUrl: Array.isArray(videoUrl) ? videoUrl[0] : videoUrl }),
      })
      const data = await response.json()
      if (!response.ok) {
        setNotesError(data.error || "Failed to generate notes")
        return
      }
      setNotesMarkdown(data.notes || "")
    } catch {
      setNotesError("Network error. Please try again.")
    } finally {
      setNotesLoading(false)
    }
  }

  const handleDownloadNotesPDF = () => {
    if (!notesMarkdown) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    const titleText = summary?.title || "Video Notes"
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${titleText} — Notes</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #1e293b; line-height: 1.7; }
    h1 { font-size: 1.6rem; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 24px; }
    h2 { font-size: 1.15rem; color: #334155; margin-top: 28px; margin-bottom: 10px; }
    ul { padding-left: 20px; margin: 8px 0; }
    li { margin: 6px 0; }
    strong { color: #1e293b; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>${titleText}</h1>
  ${notesMarkdown
    .replace(/## 📌 Key Concepts/g, "<h2>📌 Key Concepts</h2>")
    .replace(/## ✅ Main Takeaways/g, "<h2>✅ Main Takeaways</h2>")
    .replace(/## 📖 Important Terms/g, "<h2>📖 Important Terms</h2>")
    .replace(/^- \*\*(.+?)\*\*: (.+)$/gm, "<li><strong>$1</strong>: $2</li>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)}
</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 300)
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isChatLoading) return

    const userMessage = chatInput.trim()
    setChatInput("")
    
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: userMessage }]
    setChatMessages(updatedMessages)
    setIsChatLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: Array.isArray(videoUrl) ? videoUrl[0] : videoUrl,
          question: userMessage,
          history: chatMessages.slice(-4)
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || 'Failed to get answer'}` }])
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Network error communicating with chat service.' }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const searchParams = useSearchParams()
  const detailLevel = parseInt(searchParams.get("detail") || "3", 10)
  const language = searchParams.get("lang") || "en"
  const { videoUrl } = use(params)

  // Highlights state and handlers
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [highlightsLoading, setHighlightsLoading] = useState(true)
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null)
  const [highlightNote, setHighlightNote] = useState("")
  const [highlightColor, setHighlightColor] = useState<"yellow" | "green" | "blue" | "pink">("yellow")
  const [savingHighlight, setSavingHighlight] = useState(false)

  const fetchHighlights = async () => {
    try {
      setHighlightsLoading(true)
      const token = localStorage.getItem("token")
      const safeVideoUrl = Array.isArray(videoUrl) ? videoUrl[0] : videoUrl
      const response = await fetch(`/api/highlights?videoUrl=${encodeURIComponent(safeVideoUrl)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setHighlights(data.highlights || [])
      }
    } catch (error) {
      console.error("Failed to fetch highlights", error)
    } finally {
      setHighlightsLoading(false)
    }
  }

  useEffect(() => {
    fetchHighlights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl])

  const handleMouseUp = () => {
    const selectedText = window.getSelection()?.toString().trim()
    if (selectedText && selectedText.length > 0) {
      const range = window.getSelection()?.getRangeAt(0)
      const rect = range?.getBoundingClientRect()
      if (rect) {
        const x = Math.max(10, rect.left + rect.width / 2)
        const y = Math.max(10, rect.top - 10)
        setSelection({ text: selectedText, x, y })
        setHighlightColor("yellow")
        setHighlightNote("")
      }
    }
  }

  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("#highlight-popup")) {
        setSelection(null)
      }
    }
    const handleScroll = () => setSelection(null)
    
    document.addEventListener("mousedown", handleGlobalMouseDown)
    window.addEventListener("scroll", handleScroll, { passive: true })
    
    return () => {
      document.removeEventListener("mousedown", handleGlobalMouseDown)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const handleSaveHighlight = async () => {
    if (!selection) return
    try {
      setSavingHighlight(true)
      const token = localStorage.getItem("token")
      const safeVideoUrl = Array.isArray(videoUrl) ? videoUrl[0] : videoUrl
      const response = await fetch("/api/highlights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoUrl: safeVideoUrl,
          text: selection.text,
          note: highlightNote,
          color: highlightColor,
        }),
      })
      if (response.ok) {
        setSelection(null)
        fetchHighlights()
      }
    } catch (error) {
      console.error("Failed to save highlight", error)
    } finally {
      setSavingHighlight(false)
    }
  }

  const handleDeleteHighlight = async (id: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/highlights", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })
      if (response.ok) {
        setHighlights((prev) => prev.filter((h) => h.id !== id))
      }
    } catch (error) {
      console.error("Failed to delete highlight", error)
    }
  }

  // Parse the summary content into structured format
  const parsedSummary = useMemo<ParsedSummary | null>(() => {
    if (!summary?.content) return null
    return parseSummaryContent(summary.content)
  }, [summary?.content])

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true)
        setError(null)
        setErrorDismissed(false)

        const url = urlSafeBase64Decode(videoUrl)

        try {
          const id = extractVideoId(url)
          setVideoId(id)
        } catch {
          // Continue even if video ID extraction fails
        }

        const token = localStorage.getItem("token")
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            url,
            detailLevel,
            language,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to generate summary")
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("Failed to read response stream")
        }

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (!line.trim()) continue

            try {
              const data = JSON.parse(line)

              if (data.type === "progress") {
                setCurrentStage(data.stage as Stage)
              } else if (data.type === "complete") {
                setSummary(data.summary)
                setCurrentStage(null)
                setVideoId(data.summary.videoId)
                break
              } else if (data.type === "error") {
                setError("Summary unavailable for this video")
                break
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) continue
              throw parseError
            }
          }
        }
      } catch (err) {
        console.error("Error fetching summary:", err)
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while generating the summary"
        )
        setCurrentStage(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [videoUrl, detailLevel, language])

  const youtubeUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : ""
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : ""

  const displayTopics = summary?.topics || []

  const handleExport = () => {
    if (!summary || !videoId) return

    const markdown = generateMarkdown(
      { title: summary.title, content: summary.content },
      displayTopics,
      videoId
    )

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${videoId}-summary.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Loading state with enhanced progress
  if (loading) {
    return (
      <div className="min-h-screen gradient-soft p-4 md:p-8">
        <div className="max-w-2xl mx-auto py-20">
          <ProgressStagesEnhanced currentStage={currentStage} />
        </div>
      </div>
    )
  }

  // Determine if we should use the structured view or fallback to raw markdown
  const useStructuredView = parsedSummary && parsedSummary.chapters.length > 0

  return (
    <div className="min-h-screen gradient-soft">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-full"
              asChild
            >
              <a href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </a>
            </Button>

            <div className="flex items-center gap-2">
              {useStructuredView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullSummary(!showFullSummary)}
                  className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-full"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  {showFullSummary ? "Structured View" : "Full Text"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                disabled={!summary}
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 lg:p-8">
        <motion.div
          className="max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Error Toast */}
          <AnimatePresence>
            {error && !errorDismissed && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6"
              >
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Error</p>
                    <p className="text-sm opacity-90">{error}</p>
                  </div>
                  <button
                    onClick={() => setErrorDismissed(true)}
                    className="flex-shrink-0 hover:opacity-70 transition-opacity"
                    aria-label="Dismiss error"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content Grid - Left: Video+Chapters, Right: Summary */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left Column - Video & Chapters/Transcript */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-5">
              {/* Video Thumbnail Card */}
              {videoId && (
                <div className="card-elevated overflow-hidden">
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative aspect-video group"
                  >
                    <img
                      src={thumbnailUrl}
                      alt={summary?.title || "Video thumbnail"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        if (target.src.includes("maxresdefault")) {
                          target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                        }
                      }}
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-xl"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Play className="w-7 h-7 text-indigo-600 fill-indigo-600 ml-0.5" />
                      </motion.div>
                    </div>

                    {/* Title overlay */}
                    {summary?.title && (
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h1 className="font-semibold text-white text-base md:text-lg line-clamp-2 drop-shadow-lg">
                          {summary.title}
                        </h1>
                      </div>
                    )}
                  </a>
                </div>
              )}

              {/* Chapters & Transcript Tabs */}
              <div className="card-soft">
                {/* Tab Headers */}
                <div className="flex border-b border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setActiveTab("chapters")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                      activeTab === "chapters"
                        ? "text-indigo-600 dark:text-indigo-400 border-indigo-500"
                        : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    <Layers className="w-4 h-4" />
                    Chapters
                    {displayTopics.length > 0 && (
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">
                        {displayTopics.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("transcript")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                      activeTab === "transcript"
                        ? "text-indigo-600 dark:text-indigo-400 border-indigo-500"
                        : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    Transcript
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-4">
                  <AnimatePresence mode="wait">
                    {activeTab === "chapters" ? (
                      <motion.div
                        key="chapters"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                      >
                        {displayTopics.length > 0 ? (
                          <ChapterTimeline topics={displayTopics} videoId={videoId} variant="compact" />
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No chapters available</p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="transcript"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                      >
                        <TranscriptWithTimestamps
                          segments={summary?.transcriptSegments || []}
                          topics={displayTopics}
                          videoId={videoId}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Summary */}
            <motion.div variants={itemVariants} className="lg:col-span-3">
              <div className="card-soft h-full">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Summary</h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">AI-generated insights</p>
                        </div>
                    </div>
                    {summary?.source === "cache" && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                        From cache
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5" onMouseUp={handleMouseUp}>
                  {selection && (
                    <div
                      id="highlight-popup"
                      className="fixed z-[100] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700/60 p-3 w-64 transform -translate-x-1/2 -translate-y-full"
                      style={{ top: selection.y, left: selection.x }}
                    >
                      <div className="flex gap-2 mb-3">
                        {(["yellow", "green", "blue", "pink"] as const).map((color) => (
                          <button
                            key={color}
                            onClick={() => setHighlightColor(color)}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all",
                              highlightColor === color
                                ? "border-slate-800 dark:border-slate-200 scale-110"
                                : "border-transparent",
                              color === "yellow" ? "bg-yellow-300 dark:bg-yellow-500/80"
                              : color === "green" ? "bg-emerald-400 dark:bg-emerald-500/80"
                              : color === "blue" ? "bg-sky-400 dark:bg-sky-500/80"
                              : "bg-pink-400 dark:bg-pink-500/80"
                            )}
                          />
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Add a note (optional)..."
                        value={highlightNote}
                        onChange={(e) => setHighlightNote(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveHighlight}
                        disabled={savingHighlight}
                        className="w-full py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
                      >
                        {savingHighlight ? "Saving..." : "Save Highlight"}
                      </button>
                    </div>
                  )}
                  {summary?.content ? (
                    <>
                      {/* Analytics Badges */}
                      {(summary.sentiment || summary.difficulty || summary.category) && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {summary.sentiment && (
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                              summary.sentiment === "Positive" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300" :
                              summary.sentiment === "Negative" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300" :
                              "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            )}>
                              {summary.sentiment === "Positive" ? "😊 " : summary.sentiment === "Negative" ? "😔 " : "😐 "}
                              {summary.sentiment}
                            </span>
                          )}
                          {summary.difficulty && (
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                              summary.difficulty === "Beginner" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" :
                              summary.difficulty === "Advanced" ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300" :
                              "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                            )}>
                              {summary.difficulty === "Beginner" ? "🟢 " : summary.difficulty === "Advanced" ? "🔴 " : "🟡 "}
                              {summary.difficulty}
                            </span>
                          )}
                          {summary.category && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                              🏷️ {summary.category}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Keywords Badges */}
                      {summary.keywords && (
                        <div className="flex flex-wrap gap-2 mb-8">
                          {summary.keywords.split(',').map((kw: string) => {
                            const trimmedKw = kw.trim();
                            if (!trimmedKw) return null;
                            return (
                              <button
                                key={trimmedKw}
                                onClick={() => {
                                  if (navigator.clipboard) {
                                    navigator.clipboard.writeText(trimmedKw);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer shadow-sm"
                                title="Click to copy keyword"
                              >
                                #{trimmedKw}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {useStructuredView && !showFullSummary ? (
                      // Structured progressive disclosure view
                      <div className="space-y-6">
                        {/* Title */}
                        {parsedSummary.title && (
                          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {parsedSummary.title}
                          </h1>
                        )}

                        {/* Overview */}
                        {parsedSummary.overview && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {parsedSummary.overview}
                            </p>
                          </div>
                        )}

                        {/* Recommended Chapters */}
                        {parsedSummary.recommendedChapters.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-500" />
                              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                Recommended to Watch
                              </h3>
                            </div>
                            <div className="space-y-2">
                              {parsedSummary.recommendedChapters.map((rec, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-3 p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30"
                                >
                                  <Star className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    {rec.link ? (
                                      <a
                                        href={rec.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                                      >
                                        {rec.name}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      <span className="font-medium text-amber-700">{rec.name}</span>
                                    )}
                                    {rec.reason && (
                                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">{rec.reason}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Collapsible Chapters */}
                        {parsedSummary.chapters.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-indigo-500" />
                              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                Chapter Summaries
                              </h3>
                            </div>
                            <div className="space-y-3">
                              {parsedSummary.chapters.map((chapter, index) => (
                                <CollapsibleChapter
                                  key={index}
                                  title={chapter.title}
                                  timestamp={chapter.timestamp}
                                  youtubeLink={chapter.link}
                                  content={chapter.content + (chapter.transition ? `\n\n*${chapter.transition}*` : "")}
                                  index={index}
                                  color={getChapterColor(index)}
                                  defaultExpanded={index === 0}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Conclusion */}
                        {parsedSummary.conclusion && (
                          <div className="p-4 bg-gradient-to-r from-indigo-50 to-teal-50 dark:from-indigo-900/20 dark:to-teal-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                              <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                                Key Takeaways
                              </h3>
                            </div>
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown>{parsedSummary.conclusion}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Fallback to raw markdown view
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{summary.content}</ReactMarkdown>
                      </div>
                    )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No summary available</p>
                    </div>
                  )}

                  {/* Enhanced Chat with Video Section */}
                  {summary && summary.content && (
                    <div className="mt-12 border-t border-slate-200/60 dark:border-slate-800/60 pt-8" id="chat-section">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Chat with Video</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Ask any specific questions about the video content.</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 overflow-hidden flex flex-col">
                        <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[400px] space-y-5">
                          {chatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-3 pb-8">
                              <Bot className="w-12 h-12 opacity-20" />
                              <p className="text-sm text-center max-w-[250px]">
                                Ask a question about the video and I will find the answer using the transcript.
                              </p>
                            </div>
                          ) : (
                            chatMessages.slice(-5).map((msg, idx) => (
                              <div key={idx} className={cn("flex flex-col gap-1.5", msg.role === 'user' ? "items-end" : "items-start")}>
                                <span className={cn("text-xs font-medium px-1", msg.role === 'user' ? "text-indigo-600 dark:text-indigo-400 mr-9" : "text-slate-500 dark:text-slate-400 ml-9")}>
                                  {msg.role === 'user' ? 'You' : 'VidCognify AI'}
                                </span>
                                <div className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                                    msg.role === 'user' ? "bg-indigo-600 dark:bg-indigo-500" : "bg-teal-500 dark:bg-teal-600"
                                  )}>
                                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                                  </div>
                                  <div className={cn(
                                    "px-4 py-3 rounded-2xl text-sm shadow-sm",
                                    msg.role === 'user' 
                                      ? "bg-blue-800 dark:bg-indigo-600 text-white rounded-tr-sm" 
                                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-sm"
                                  )}>
                                    <ReactMarkdown className={cn(
                                      "prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-100 dark:prose-pre:bg-slate-900",
                                      msg.role === 'user' ? "text-white prose-strong:text-white" : "dark:text-slate-200 dark:prose-strong:text-white"
                                    )}>
                                      {msg.content}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                          {isChatLoading && (
                            <div className="flex flex-col gap-1.5 items-start">
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1 ml-9">
                                VidCognify AI
                              </span>
                              <div className="flex gap-3 max-w-[85%] flex-row">
                                <div className="w-8 h-8 rounded-full bg-teal-500 dark:bg-teal-600 flex items-center justify-center flex-shrink-0 mt-1">
                                  <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="px-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm">
                                  <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                                  <span className="text-sm text-slate-500 dark:text-slate-400">Thinking...</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200/60 dark:border-slate-800/80 break-all">
                          <form onSubmit={handleChatSubmit} className="relative flex items-center">
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Ask anything about this video..."
                              className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                              disabled={isChatLoading}
                            />
                            <button
                              type="submit"
                              disabled={!chatInput.trim() || isChatLoading}
                              className="absolute right-2 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-800 transition-colors"
                            >
                              <Send className="w-4 h-4 -ml-0.5 mt-0.5" />
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quiz Generator Section */}
                  {summary && summary.content && (
                    <div className="mt-10 border-t border-slate-200/60 dark:border-slate-800/60 pt-8" id="quiz-section">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Quiz Generator</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Test your understanding of the video content.</p>
                        </div>
                      </div>

                      {!quizStarted && !quizLoading && (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
                          <GraduationCap className="w-12 h-12 mx-auto mb-3 text-teal-400 dark:text-teal-500 opacity-60" />
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-xs mx-auto">
                            Generate 5 multiple choice questions based on this video to test your knowledge.
                          </p>
                          {quizError && (
                            <p className="text-sm text-red-500 dark:text-red-400 mb-4 flex items-center justify-center gap-1">
                              <AlertCircle className="w-4 h-4" />{quizError}
                            </p>
                          )}
                          <button
                            onClick={handleGenerateQuiz}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md shadow-teal-200 dark:shadow-teal-900/30"
                          >
                            <GraduationCap className="w-4 h-4" />
                            Generate Quiz
                          </button>
                        </div>
                      )}

                      {quizLoading && (
                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
                          <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto mb-3" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">Generating quiz questions...</p>
                        </div>
                      )}

                      {quizStarted && !quizLoading && quizQuestions.length > 0 && (
                        <div className="space-y-5">
                          {quizSubmitted && (
                            <div className={cn(
                              "flex items-center justify-between p-5 rounded-2xl border",
                              quizScore >= 4
                                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40"
                                : quizScore >= 3
                                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40"
                                : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/40"
                            )}>
                              <div>
                                <p className={cn(
                                  "text-2xl font-bold",
                                  quizScore >= 4 ? "text-emerald-700 dark:text-emerald-300"
                                  : quizScore >= 3 ? "text-amber-700 dark:text-amber-300"
                                  : "text-rose-700 dark:text-rose-300"
                                )}>
                                  {quizScore}/{quizQuestions.length} Correct!
                                </p>
                                <p className="text-sm mt-0.5 text-slate-600 dark:text-slate-400">
                                  {quizScore === quizQuestions.length ? "Perfect score! 🎉" : quizScore >= 3 ? "Good job! 👍" : "Keep watching and try again! 💪"}
                                </p>
                              </div>
                              <button
                                onClick={handleResetQuiz}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Retake
                              </button>
                            </div>
                          )}

                          {quizQuestions.map((q, qIdx) => {
                            const userAnswer = userAnswers[qIdx]
                            const isCorrect = quizSubmitted && userAnswer === q.correct
                            const isWrong = quizSubmitted && userAnswer !== null && userAnswer !== q.correct
                            const optionLetters: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"]
                            return (
                              <div
                                key={qIdx}
                                className={cn(
                                  "p-5 rounded-2xl border transition-all",
                                  quizSubmitted && isCorrect
                                    ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40"
                                    : quizSubmitted && isWrong
                                    ? "bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/40"
                                    : "bg-white dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60"
                                )}
                              >
                                <div className="flex items-start gap-3 mb-4">
                                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center">
                                    {qIdx + 1}
                                  </span>
                                  <p className="font-medium text-slate-900 dark:text-slate-100 leading-snug">{q.question}</p>
                                  {quizSubmitted && (
                                    isCorrect
                                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 ml-auto" />
                                      : <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 ml-auto" />
                                  )}
                                </div>

                                <div className="grid grid-cols-1 gap-2 pl-10">
                                  {optionLetters.map((letter, oIdx) => {
                                    const isSelected = userAnswer === letter
                                    const isThisCorrect = q.correct === letter
                                    let optStyle = "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/10"
                                    if (!quizSubmitted && isSelected) {
                                      optStyle = "bg-teal-100 dark:bg-teal-900/30 border-teal-500 dark:border-teal-600 text-teal-800 dark:text-teal-200"
                                    } else if (quizSubmitted && isThisCorrect) {
                                      optStyle = "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200 font-semibold"
                                    } else if (quizSubmitted && isSelected && !isThisCorrect) {
                                      optStyle = "bg-rose-100 dark:bg-rose-900/30 border-rose-500 dark:border-rose-600 text-rose-800 dark:text-rose-200 line-through opacity-70"
                                    }
                                    return (
                                      <button
                                        key={letter}
                                        onClick={() => handleSelectAnswer(qIdx, letter)}
                                        disabled={quizSubmitted}
                                        className={cn(
                                          "w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all duration-150",
                                          optStyle,
                                          !quizSubmitted && "cursor-pointer",
                                          quizSubmitted && "cursor-default"
                                        )}
                                      >
                                        <span className="font-bold mr-2">{letter}.</span>
                                        {q.options[oIdx]}
                                      </button>
                                    )
                                  })}
                                </div>

                                {quizSubmitted && isWrong && (
                                  <p className="mt-3 pl-10 text-sm text-slate-500 dark:text-slate-400">
                                    ✅ Correct answer: <span className="font-semibold text-emerald-700 dark:text-emerald-300">{q.correct}. {q.options[["A","B","C","D"].indexOf(q.correct)]}</span>
                                  </p>
                                )}
                              </div>
                            )
                          })}

                          {!quizSubmitted && (
                            <button
                              onClick={handleSubmitQuiz}
                              disabled={userAnswers.some(a => a === null)}
                              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                            >
                              Submit Answers
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes Generator Section */}
                  {summary && summary.content && (
                    <div className="mt-10 border-t border-slate-200/60 dark:border-slate-800/60 pt-8" id="notes-section">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                          <NotebookPen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Notes Generator</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Auto-generate structured study notes from the summary.</p>
                        </div>
                      </div>

                      {/* Idle state */}
                      {!notesMarkdown && !notesLoading && (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
                          <NotebookPen className="w-12 h-12 mx-auto mb-3 text-violet-400 dark:text-violet-500 opacity-60" />
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-xs mx-auto">
                            Generate key concepts, main takeaways, and important terms from this video's summary.
                          </p>
                          {notesError && (
                            <p className="text-sm text-red-500 dark:text-red-400 mb-4 flex items-center justify-center gap-1">
                              <AlertCircle className="w-4 h-4" />{notesError}
                            </p>
                          )}
                          <button
                            onClick={handleGenerateNotes}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md shadow-violet-200 dark:shadow-violet-900/30"
                          >
                            <NotebookPen className="w-4 h-4" />
                            Generate Notes
                          </button>
                        </div>
                      )}

                      {/* Loading state */}
                      {notesLoading && (
                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
                          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-3" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">Generating notes...</p>
                        </div>
                      )}

                      {/* Notes display */}
                      {notesMarkdown && !notesLoading && (
                        <div className="space-y-4">
                          {/* Action bar */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Study Notes</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleGenerateNotes}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Regenerate
                              </button>
                              <button
                                onClick={handleDownloadNotesPDF}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 transition-colors"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Download PDF
                              </button>
                            </div>
                          </div>

                          {/* Rendered notes */}
                          <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6">
                            <ReactMarkdown
                              className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-strong:text-slate-800 dark:prose-strong:text-slate-100 prose-li:text-slate-700 dark:prose-li:text-slate-300"
                            >
                              {notesMarkdown}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Highlights Panel */}
                  {summary && summary.content && (
                    <div className="mt-10 border-t border-slate-200/60 dark:border-slate-800/60 pt-8" id="highlights-section">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                          <Highlighter className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">My Highlights</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Key sentences you have saved.</p>
                        </div>
                      </div>

                      {highlightsLoading ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                      ) : highlights.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
                          <Highlighter className="w-10 h-10 mx-auto mb-3 text-slate-400 opacity-50" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">No highlights yet.</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Select text in the summary to add one.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {highlights.map((h) => (
                            <div
                              key={h.id}
                              className={cn(
                                "group relative p-4 rounded-xl border bg-white dark:bg-slate-800/60 transition-all",
                                h.color === "yellow" ? "border-l-4 border-l-yellow-400 border-slate-200 dark:border-slate-700/60"
                                : h.color === "green" ? "border-l-4 border-l-emerald-400 border-slate-200 dark:border-slate-700/60"
                                : h.color === "blue" ? "border-l-4 border-l-sky-400 border-slate-200 dark:border-slate-700/60"
                                : "border-l-4 border-l-pink-400 border-slate-200 dark:border-slate-700/60"
                              )}
                            >
                              <div className="pr-8">
                                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed italic">
                                  "{h.text}"
                                </p>
                                {h.note && (
                                  <div className="mt-3 text-xs bg-slate-50 dark:bg-slate-900/80 rounded-lg p-2 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700/50">
                                    <span className="font-semibold text-slate-500">Note:</span> {h.note}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteHighlight(h.id)}
                                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Delete highlight"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
