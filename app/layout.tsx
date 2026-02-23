import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VOGUE AI — Your Personal Stylist',
  description: 'AI-powered fashion styling. Upload any outfit and get an instant score, specific fixes, and style advice.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
