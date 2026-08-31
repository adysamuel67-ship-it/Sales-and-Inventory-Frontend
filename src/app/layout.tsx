import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import RouteLoadingOverlay from '@/components/RouteLoadingOverlay'

export const metadata: Metadata = {
  title: 'Business Bot — Sales & Inventory',
  description: 'Multi-tenant inventory & sales platform for informal market traders',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <RouteLoadingOverlay />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
