import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Appointment Setter',
  description: 'AI-powered appointment setting agent for Instagram DMs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
