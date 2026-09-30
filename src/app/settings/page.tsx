'use client'

import { useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'

const Row = ({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: React.ReactNode
}) => (
  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-neutral-light">{description}</p>
    </div>
    <div className="shrink-0">{action}</div>
  </div>
)

const SignOutIcon = (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

/**
 * Account settings.
 *
 * Signing out used to live in the profile menu at the bottom of the sidebar -
 * one tap from the bottom edge of a phone screen, with no confirmation. It now
 * sits here, behind an explicit heading and a confirmation, so it cannot be hit
 * by accident.
 */
export default function AccountSettingsPage() {
  const { user, currentBusiness, logout } = useAuth()
  const [confirming, setConfirming] = useState(false)

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Account"
          title="Settings"
          subtitle="Your profile, your password, and getting signed out."
        />

        <section className="surface-card overflow-hidden">
          <header className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-section-title text-slate-900">Account</h2>
            <p className="mt-0.5 text-xs text-neutral-light">Who you are signed in as.</p>
          </header>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user?.name || 'Your account'}
                </p>
                <p className="truncate text-xs text-neutral-light">
                  {user?.email}
                  {currentBusiness ? ` · ${currentBusiness.name}` : ''}
                </p>
              </div>
            </div>
            <Link href="/profile" className="shrink-0">
              <Button variant="secondary" size="sm" fullWidth>
                View profile
              </Button>
            </Link>
          </div>
        </section>

        <section className="surface-card overflow-hidden">
          <header className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-section-title text-slate-900">Security</h2>
            <p className="mt-0.5 text-xs text-neutral-light">Keep your account safe.</p>
          </header>
          <Row
            title="Change your password"
            description="Use a password you do not use anywhere else."
            action={
              <Link href="/settings/change-password">
                <Button variant="secondary" size="sm" fullWidth>
                  Change password
                </Button>
              </Link>
            }
          />
        </section>

        {/* Sign out sits in a visually distinct danger area so it does not read
            as just another row of settings. */}
        <section className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-card">
          <header className="border-b border-rose-100 bg-rose-50/60 px-5 py-4 sm:px-6">
            <h2 className="text-section-title text-rose-900">Sign out</h2>
            <p className="mt-0.5 text-xs text-rose-700">
              You will need your password to get back in.
            </p>
          </header>
          <Row
            title="Sign out of this device"
            description="Nothing in your account is deleted. Your products, sales and debts stay exactly as they are, and you can sign straight back in."
            action={
              <Button variant="dangerOutline" size="sm" fullWidth leftIcon={SignOutIcon} onClick={() => setConfirming(true)}>
                Sign out
              </Button>
            }
          />
        </section>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirming(false)}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            aria-describedby="signout-body"
            className="relative w-full max-w-md animate-scale-in rounded-2xl border border-slate-200 bg-white p-6 shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="signout-title" className="text-section-title text-slate-900">
              Sign out of Business Bot GH?
            </h2>
            <p id="signout-body" className="mt-2 text-sm leading-relaxed text-slate-600">
              You will be returned to the sign-in page. Nothing in your account is
              deleted, and you can sign straight back in.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Stay signed in
              </Button>
              <Button variant="danger" leftIcon={SignOutIcon} onClick={logout}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}