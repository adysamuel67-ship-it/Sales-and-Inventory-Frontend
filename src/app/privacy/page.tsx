import Link from 'next/link'
import BusinessBotLogo from '@/components/BusinessBotLogo'

const sections = [
  {
    title: '1. Information We Collect',
    body: [
      'Account information you provide when you register, such as your name, email address, phone number and password.',
      'Business information you add, such as your business name, products, prices, stock levels, customers, sales records, debts and reports.',
      'Usage data, such as the pages you visit, features you use, device information and chat messages sent within your team.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    body: [
      'To provide, maintain and improve the Business Bot service, including sales, inventory, customer, debt and reporting features.',
      'To operate team chat, notifications, approvals and business member management.',
      'To communicate with you about your account, security and service updates.',
      'To keep the service secure and prevent fraud or unauthorised access.',
    ],
  },
  {
    title: '3. Data Sharing',
    body: [
      'We do not sell your personal or business data to third parties.',
      'Your business data is shared only with the members you add to your business and invited into your team.',
      'We may share data with service providers that help us operate the platform (for example hosting and storage), who are bound to keep it confidential.',
      'We may disclose data when required by law, regulation or a valid legal request.',
    ],
  },
  {
    title: '4. Data Retention',
    body: [
      'We keep your data for as long as your account is active or as needed to provide the service.',
      'When you delete a business, your request is processed and the associated data is removed from active use in line with our data handling procedures.',
      'You can delete your own account and request removal of your data at any time.',
    ],
  },
  {
    title: '5. Data Ownership and Your Responsibility',
    body: [
      'You own and control the data you enter into the platform, including your business and sales records.',
      'You are responsible for the accuracy of that data and for keeping your login credentials secure.',
      'You are responsible for deciding who may access your business and for reviewing and managing your members.',
    ],
  },
  {
    title: '6. Security',
    body: [
      'We apply reasonable technical and organisational measures to protect your data, including encrypted transmission and protected storage.',
      'No method of transmission or storage is completely secure. We cannot guarantee the absolute security of your data.',
    ],
  },
  {
    title: '7. Limitation of Responsibility for Data Loss',
    body: [
      'The Service is provided on an "as is" basis. While we work to keep the platform reliable, we cannot be held responsible for any loss, corruption, or unavailability of data caused by factors outside our reasonable control, including network failures, power outages, third-party service interruptions, user actions, deletions made by members you have authorised, or circumstances beyond our control.',
      'We strongly encourage you to keep your own backups of important business records, such as products, sales and debts, and to export your data regularly using the export tools available in the platform.',
      'To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, consequential, or special damages, or for any loss of profits, revenue, sales, customers or data, whether in contract, tort (including negligence) or otherwise, arising from your use of the Service.',
    ],
  },
  {
    title: '8. Children\u2019s Privacy',
    body: [
      'The Service is intended for adult users operating a business. We do not knowingly collect personal information from children under 18. If you believe a child has provided us with personal information, please contact us and we will take steps to remove it.',
    ],
  },
  {
    title: '9. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top. Continued use of the Service after changes take effect means you accept the updated policy.',
    ],
  },
  {
    title: '10. Contact Us',
    body: [
      'If you have any questions about this Privacy Policy or your data, please contact us at support@businessbot.app.',
    ],
  },
]

export default function PrivacyPage() {
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
          <p className="text-sm text-neutral-light">Last updated: September 2026</p>

          <p className="text-sm text-gray-600 leading-relaxed mt-6">
            This Privacy Policy explains how Business Bot (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, shares and protects your
            information when you use our sales and inventory tracking platform. By creating an account or using the
            Service, you agree to the practices described in this policy.
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
          Questions about privacy? <Link href="/terms" className="text-primary font-medium hover:underline">View our Terms of Service</Link>
          {' '}·{' '}
          <Link href="/" className="text-primary font-medium hover:underline">Back to home</Link>
        </p>
      </div>
    </main>
  )
}