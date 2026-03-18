import type { Metadata } from 'next'
import { Geist, Geist_Mono, Caveat } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Footer } from '@/components/footer'
import { PrivacyBanner } from '@/components/privacy-banner'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const _caveat = Caveat({ subsets: ['latin'], variable: '--font-accent' })

export const metadata: Metadata = {
  title: 'DIS AI Search',
  description: 'Search through school documents with AI',
  icons: {
    icon: [
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-TOKsutbVosrZUWb3zKaGAcLVX6jufQ.png',
        href: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-TOKsutbVosrZUWb3zKaGAcLVX6jufQ.png',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased ${_caveat.variable}`}>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <PrivacyBanner />
        <Analytics />
        <script src="https://js.puter.com/v2/" defer></script>
      </body>
    </html>
  )
}
