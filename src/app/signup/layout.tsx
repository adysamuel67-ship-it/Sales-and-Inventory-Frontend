import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create a free account',
  description:
    'Create a free Business Bot GH account and start recording sales, tracking stock and following up on debts. No credit card needed.',
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
