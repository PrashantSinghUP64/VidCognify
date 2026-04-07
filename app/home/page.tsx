"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Loader2, Sparkles, Zap, Clock, BookOpen, ArrowRight } from "lucide-react"
import { extractVideoId } from "@/lib/youtube"
import { UrlInputEnhanced } from "@/components/url-input-enhanced"
import { ModelDropdown } from "@/components/model-dropdown"
import { LanguageDropdown, getDefaultLanguage, type OutputLanguage } from "@/components/language-dropdown"
import { GlassCard } from "@/components/ui/glass-card"
import { useAuth } from "@/hooks/useAuth"
import { containerVariants, itemVariants } from "@/lib/animations"

export default function Home() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [url, setUrl] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [language, setLanguage] = useState<OutputLanguage>("en")
  const [urlError, setUrlError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUrlValid, setIsUrlValid] = useState(false)
  const router = useRouter()

  // Set default language based on browser
  useEffect(() => {
    setLanguage(getDefaultLanguage())
  }, [])

  // Redirects to setup based on completion status removed entirely

  const validateUrl = (inputUrl: string): boolean => {
    if (!inputUrl.trim()) {
      setUrlError("Please enter a YouTube URL")
      setIsUrlValid(false)
      return false
    }

    try {
      extractVideoId(inputUrl)
      setUrlError("")
      setIsUrlValid(true)
      return true
    } catch {
      setUrlError("Invalid YouTube URL. Please enter a valid YouTube video URL.")
      setIsUrlValid(false)
      return false
    }
  }

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    if (urlError && newUrl) {
      validateUrl(newUrl)
    } else if (!newUrl) {
      setUrlError("")
      setIsUrlValid(false)
    }
  }

  const handleUrlBlur = () => {
    if (url) {
      validateUrl(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateUrl(url)) {
      return
    }

    setIsSubmitting(true)

    try {
      const videoId = extractVideoId(url)
      const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`
      const encodedUrl = btoa(cleanUrl)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")

      const params = new URLSearchParams({
        detail: "5",
        model: aiModel,
        lang: language,
      })

      const summaryUrl = `/summary/${encodedUrl}?${params.toString()}`
      router.push(summaryUrl)
    } catch {
      setUrlError("Invalid YouTube URL. Please enter a valid YouTube URL.")
      setIsSubmitting(false)
    }
  }

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen gradient-soft-animated flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    )
  }


  if (!isAuthenticated) {
    return null
  }

  // Main app for authenticated users
  return (
    <div className="min-h-screen gradient-soft-animated">
      <div className="min-h-screen p-4 md:p-8 lg:p-12 flex flex-col items-center justify-center">
        <motion.div
          className="max-w-xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col items-center justify-center space-y-8">
            {/* Headline */}
            <motion.div variants={itemVariants} className="text-center">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Vid
                <span className="text-gradient">Cognify</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg">
                Transform any YouTube video into a concise, chapter-based summary with intelligent topic detection
              </p>
            </motion.div>

            {/* Action Card */}
            <motion.div variants={itemVariants} className="w-full">
              <div className="card-elevated p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* URL Input */}
                  <UrlInputEnhanced
                    value={url}
                    onChange={handleUrlChange}
                    onBlur={handleUrlBlur}
                    error={urlError}
                    isLoading={isSubmitting}
                    isValid={isUrlValid && !urlError}
                    disabled={isSubmitting}
                  />

                  {/* Model & Language Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Model Selector */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        AI Model
                      </label>
                      <ModelDropdown
                        value={aiModel}
                        onChange={setAiModel}
                      />
                    </div>

                    {/* Language Selector */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        Summary Language
                      </label>
                      <LanguageDropdown
                        value={language}
                        onChange={setLanguage}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || !url.trim()}
                    className="w-full relative overflow-hidden group rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-400 opacity-100 group-hover:opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-center gap-3 px-8 py-4 text-white font-semibold text-lg">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>Summarize Video</span>
                        </>
                      )}
                    </div>
                  </motion.button>
                </form>
              </div>

            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
