'use client'

import Link from 'next/link'

export default function NoBusinessGuide({ pageName }: { pageName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">No business set up yet</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        {pageName} requires a business. Create or join one to start using this feature.
      </p>

      <div className="max-w-sm w-full mb-6 bg-primary/5 border border-primary/10 rounded-2xl p-5 text-left">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Getting started is easy</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
            <div>
              <p className="text-sm font-medium text-gray-900">Create a business</p>
              <p className="text-xs text-gray-500">Set up your store, inventory, and team</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
            <div>
              <p className="text-sm font-medium text-gray-900">Add products</p>
              <p className="text-xs text-gray-500">Stock your inventory with items to sell</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
            <div>
              <p className="text-sm font-medium text-gray-900">Start selling</p>
              <p className="text-xs text-gray-500">Record sales, track customers, and manage debts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/businesses"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Join Business
        </Link>
        <Link
          href="/businesses"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Business
        </Link>
      </div>
    </div>
  )
}
