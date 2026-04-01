"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Check, Key, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card"
import { AnimatedBackground } from "@/components/animated-background"
import { useAuth } from "@/hooks/useAuth"
import { containerVariants, itemVariants } from "@/lib/animations"

export default function SetupWizard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, updateSetupCompleted } = useAuth()
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)

  // Groq API key state
  const [groqKey, setGroqKey] = useState("")
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [testError, setTestError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    setIsCheckingStatus(false)
  }, [])

  const handleTest = async () => {
    if (!groqKey.trim()) return
    setTestStatus("testing")
    setTestError("")

    try {
      const response = await fetch("/api/setup/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ service: "groq", apiKey: groqKey }),
      })
      const data = await response.json()

      if (data.success) {
        setTestStatus("success")
      } else {
        setTestStatus("error")
        setTestError(data.error || "Validation failed")
      }
    } catch {
      setTestStatus("error")
      setTestError("Failed to test API key")
    }
  }

  const handleFinishSetup = async () => {
    setSaving(true)
    // Simply redirect to register, as the API key is now configured via .env locally
    router.push("/register")
  }

  if (authLoading || isCheckingStatus) {
    return (
      <>
        <AnimatedBackground intensity="low" />
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard variant="elevated" className="w-full max-w-lg p-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
              <p className="text-muted-foreground">Checking configuration...</p>
            </div>
          </GlassCard>
        </div>
      </>
    )
  }

  return (
    <>
      <AnimatedBackground intensity="low" />
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-lg"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <GlassCard variant="elevated" className="p-6">
              <GlassCardHeader className="text-center">
                <GlassCardTitle className="text-2xl font-bold">Setup VidCognify</GlassCardTitle>
                <GlassCardDescription>
                  Add your Groq API key to start summarizing videos
                </GlassCardDescription>
              </GlassCardHeader>

              <GlassCardContent className="space-y-6">
                <div className="flex items-center space-x-2 text-lg font-medium text-slate-900">
                  <Key className="h-5 w-5 text-accent-primary" />
                  <span>Groq API Key</span>
                </div>

                <p className="text-sm text-slate-500">
                  Groq powers fast AI summarization using{" "}
                  <strong className="text-slate-700">llama-3.3-70b-versatile</strong>. Get your
                  free API key from{" "}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-primary hover:underline"
                  >
                    console.groq.com
                  </a>
                  .
                </p>

                {/* API Key Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">API Key</label>
                  <div className="flex space-x-2">
                    <Input
                      type="password"
                      value={groqKey}
                      onChange={(e) => {
                        setGroqKey(e.target.value)
                        setTestStatus("idle")
                        setTestError("")
                      }}
                      placeholder="gsk_..."
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleTest}
                      disabled={!groqKey.trim() || testStatus === "testing"}
                    >
                      {testStatus === "testing" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                  </div>

                  {testStatus === "success" && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>API key is valid ✓</span>
                    </div>
                  )}
                  {testStatus === "error" && (
                    <div className="flex items-center space-x-2 text-sm text-red-500">
                      <XCircle className="h-4 w-4" />
                      <span>{testError}</span>
                    </div>
                  )}
                </div>

                {/* Info box */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                  <h4 className="font-medium text-sm text-slate-900">Why Groq?</h4>
                  <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
                    <li>Blazing-fast inference with llama-3.3-70b-versatile</li>
                    <li>Free tier available – no credit card required</li>
                    <li>Excellent multi-language summarization quality</li>
                    <li>Supports long video transcripts</li>
                  </ul>
                </div>

                {saveError && (
                  <div className="flex items-center space-x-2 text-sm text-red-500">
                    <XCircle className="h-4 w-4" />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleFinishSetup}
                    disabled={saving}
                    className="bg-gradient-to-r from-accent-primary to-accent-secondary hover:opacity-90"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Finish Setup
                    <Check className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
