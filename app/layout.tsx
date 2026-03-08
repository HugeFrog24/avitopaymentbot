import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { AppHeader } from "@/app/_components/AppHeader"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "PaymentCRM",
  description: "Admin dashboard for payment intermediary orders",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans`}>
        <AppHeader />
        <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-zinc-200 dark:border-zinc-800 py-4">
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-6">
              <a href="/tos" className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                Terms of Service
              </a>
              <a href="/privacy-policy" className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                Privacy Policy
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
