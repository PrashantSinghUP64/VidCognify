import type { Metadata } from "next"
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Sidebar, MobileSidebar } from "@/components/sidebar"
import { Providers } from "@/components/providers"
import LandingChatBot from "@/components/LandingChatBot"
import type React from "react"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "VidCognify",
  description: "AI-powered YouTube video summarization with Groq LLM",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('vidcognify-ui-theme');
                if (!theme) {
                  theme = 'light';
                  localStorage.setItem('vidcognify-ui-theme', theme);
                }
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans`}
      >
        <Providers>
          <div className="flex min-h-screen">
            {/* Minimal Sidebar - Hidden on mobile, visible on md+ */}
            <Sidebar className="hidden md:flex" />
            {/* Mobile Sidebar - centralized here for all pages */}
            <MobileSidebar />

            {/* Main Content Area */}
            <main className="flex-1 min-h-screen gradient-mesh overflow-y-auto">
              {children}
            </main>
          </div>
          <LandingChatBot />
        </Providers>
      </body>
    </html>
  )
}
