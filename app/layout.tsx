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
        {children}
      </body>
    </html>
  )
}
