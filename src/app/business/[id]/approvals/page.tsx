'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ApprovalsPage() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    router.replace('/businesses')
  }, [router])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Approvals</h1>
      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm px-5 py-12 text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900 mb-1">Approvals are managed on the Businesses page</p>
        <p className="text-xs text-neutral-light mb-3">Redirecting you there now...</p>
      </div>
    </div>
  )
}
