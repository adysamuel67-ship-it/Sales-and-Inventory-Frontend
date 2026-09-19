import Link from 'next/link'
import BusinessBotLogo from '@/components/BusinessBotLogo'

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: [
      'By creating an account, signing in, or using Business Bot ("the Service"), you agree to these Terms of Service. If you do not agree, please do not use the Service.',
      'You confirm that you are at least 18 years old and have the authority to bind the business you operate to these terms.',
    ],
  },
  {
    title: '2. Description of the Service',
    body: [
      'The Service provides a multi-tenant platform for tracking sales, managing inventory and products, recording customers and debts, generating reports, and facilitating team communication and business membership management.',
    ],
  },
  {
    title: '3. Accounts and Security',
    body: [
      'You are responsible for safeguarding your password and for all activity that occurs under your account.',
      'You agree to notify us of any unauthorised use of your account. We are not liable for losses caused by the unauthorised use of your account where you have failed to keep your credentials secure.',
    ],
  },
  {
    title: '4. User Responsibilities',
    body: [
      'You agree to provide accurate information and to keep your account and business details up to date.',
      'You are responsible for all content you add to the platform, including products, prices, sales records, customer details and debts.',
      'You are responsible for managing who has access to your business, including adding, removing and setting roles for members. Authorised members may view, edit or delete data according to the roles you grant them.',
      'You must not use the Service to store or transmit unlawful, defamatory, discriminatory, or infringing content, or to violate any applicable law.',
    ],
  },
  {
    title: '5. Data Ownership and Backups',
    body: [
      'You retain ownership of the data you enter into the Service. We do not claim ownership of your business data.',
      'You are strongly encouraged to maintain your own backups of important records. The Service provides export tools for this purpose, and we recommend you use them regularly.',
    ],
  },
  {
    title: '6. No Fault for Data Loss — Limitation of Liability',
    body: [
      'The Service is provided on an "as is" and "as available" basis, without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.',
      'While we make reasonable efforts to keep the Service available and your data safe, we are NOT responsible for any loss, corruption, theft, or unavailability of data, and we shall NOT be held liable for any damage, loss, or harm (whether direct, indirect, incidental, consequential or special) arising from or relating to such loss of data.',
      'This includes, without limitation: server or network outages, power failures, third-party hosting or infrastructure failures, software bugs, accidental or intentional deletion by you or any member you have authorised, lost or stolen devices, entry of incorrect data, failure to export or back up data, or any other event beyond our reasonable control.',
      'To the maximum extent permitted by applicable law, our total aggregate liability arising out of or in connection with these Terms or your use of the Service shall not exceed the amounts you have paid to us (if any) during the twelve (12) months preceding the event giving rise to the liability.',
    ],
  },
  {
    title: '7. Acceptable Use',
    body: [
      'You must not attempt to gain unauthorised access to the Service, other users\u2019 accounts, or the systems used to operate the Service.',
      'You must not use automated means to access, scrape, or interfere with the Service.',
      'You must not reverse engineer, decompile, or attempt to derive the source code of the Service.',
    ],
  },
  {
    title: '8. Termination',
    body: [
      'You may stop using the Service at any time. You may delete your business or leave a business through the settings provided.',
      'We may suspend or terminate your access to the Service if you violate these Terms, misuse the Service, or if keeping your account active would expose us to legal or security risk.',
      'On termination, sections of these Terms that by their nature should survive will survive, including the limitation of liability and data ownership provisions.',
    ],
  },
  {
    title: '9. Changes to the Service or Terms',
    body: [
      'We may modify or discontinue features of the Service at any time with or without notice.',
      'We may revise these Terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.',
    ],
  },
  {
    title: '10. Governing Law',
    body: [
      'These Terms are governed by the laws of the Republic of Ghana, without regard to conflict of law principles. Any disputes arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of Ghana.',
    ],
  },
  {
    title: '11. Contact Us',
    body: [
      'If you have any questions about these Terms, please contact us at support@businessbot.app.',
    ],
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <BusinessBotLogo size={36} />
            <div>
              <p className="font-semibold text-gray-900 text-[15px] leading-tight">Business Bot</p>
              <p className="text-[11px] text-neutral-light">Sales & Inventory Tracking</p>
            </div>
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-full hover:bg-primary/15 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Legal</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Terms of Service</h1>
          <p className="text-sm text-neutral-light">Last updated: September 2026</p>

          <p className="text-sm text-gray-600 leading-relaxed mt-6">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Business Bot sales and inventory
            tracking platform. Please read them carefully before you create an account or use the Service.
          </p>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h2>
                {section.body.map((text, i) => (
                  <p key={i} className="text-sm text-gray-600 leading-relaxed mb-2">{text}</p>
                ))}
              </section>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-neutral-light mt-6">
          How we handle your information? <Link href="/privacy" className="text-primary font-medium hover:underline">View our Privacy Policy</Link>
          {' '}·{' '}
          <Link href="/" className="text-primary font-medium hover:underline">Back to home</Link>
        </p>
      </div>
    </main>
  )
}