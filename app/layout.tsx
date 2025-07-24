import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Press_Start_2P, VT323 } from "next/font/google"
import { AuthProvider } from "@/lib/auth-context"

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
})

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
})

export const metadata: Metadata = {
  title: "🎮 EDUARENA",
  description: "Retro gaming ELO-based competition platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${pressStart2P.variable} ${vt323.variable}`}>
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
            {/* Pixel grid background */}
            <div className="absolute inset-0 opacity-10 z-0" style={{ zIndex: 0 }}>
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `
                  linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
                `,
                  backgroundSize: "20px 20px",
                  pointerEvents: 'none'
                }}
              />
            </div>
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
