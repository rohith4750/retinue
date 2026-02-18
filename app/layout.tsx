import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { ReactQueryProvider } from '@/lib/react-query'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout'
import { ThemeProvider } from '@/components/ThemeProvider'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hotel The Retinue & Butchiraju Conventions - Management',
  description: 'Hotel The Retinue & Butchiraju Conventions - Hotel & Convention Management System',
  applicationName: 'Hotel The Retinue & Butchiraju Conventions',
  authors: [{ name: 'Hotel The Retinue & Butchiraju Conventions' }],
  keywords: ['hotel', 'management', 'booking', 'hospitality', 'rooms'],
  themeColor: '#0284c7',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={poppins.variable} data-theme="dark" suppressHydrationWarning>
      <body className={`${poppins.className} antialiased`}>
        <ErrorBoundary>
          <ReactQueryProvider>
            <ThemeProvider>
              <AuthenticatedLayout>
                {children}
              </AuthenticatedLayout>
            </ThemeProvider>
          </ReactQueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
