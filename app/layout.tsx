import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { ReactQueryProvider } from '@/lib/react-query'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'The Retinue - Hotel Management',
  description: 'The Retinue - Luxury Hotel & Hospitality Management System',
  applicationName: 'The Retinue',
  authors: [{ name: 'The Retinue' }],
  keywords: ['hotel', 'management', 'booking', 'hospitality', 'rooms'],
  themeColor: '#0284c7',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className={`${poppins.className} antialiased`}>
        <ErrorBoundary>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
