import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to Business Bot GH to record sales, manage stock, follow up on debts and see your profit reports.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
