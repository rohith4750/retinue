import type { Metadata } from 'next'
import './globals.css'
import { ReactQueryProvider } from '@/lib/react-query'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Hotel The Retinue & Butchiraju Conventions',
  description: 'Hotel The Retinue & Butchiraju Conventions - Hotel & Convention Management System',
  applicationName: 'Hotel The Retinue & Butchiraju Conventions',
  authors: [{ name: 'Hotel The Retinue & Butchiraju Conventions' }],
  keywords: ['hotel', 'management', 'booking', 'hospitality', 'rooms'],
  themeColor: '#0284c7',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo-retinue.png' },
      { url: '/logo-retinue.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: ['/logo-retinue.png'],
    apple: [
      { url: '/logo-retinue.png' },
      { url: '/logo-retinue.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="antialiased">
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
