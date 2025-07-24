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
  title: "🎮 ELO DUEL ARENA",
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
           
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
