import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'FSL Beader - Shekere Pattern Designer',
  description:
    'Design authentic shekere bead-net patterns with a diamond mesh editor and gourd wrap preview. Mobile-first tool for beaders and musicians.',
}

export const viewport: Viewport = {
  themeColor: '#e8690b',
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased overflow-hidden">{children}</body>
    </html>
  )
}
