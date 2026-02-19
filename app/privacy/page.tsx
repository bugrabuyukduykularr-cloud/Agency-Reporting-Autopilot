import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="text-lg font-bold text-slate-900 hover:text-slate-700"
          >
            Agency Reporting Autopilot
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Privacy Policy
        </h1>

        <div className="prose prose-slate text-sm text-slate-600 space-y-4">
          <p>
            Your privacy is important to us. This policy explains what data
            we collect and how we use it.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 mt-6">
            Data We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Email address and company name (at signup)</li>
            <li>Connected platform data (Google Analytics, Meta Ads, LinkedIn Ads)</li>
            <li>Payment information (processed securely by Stripe)</li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-800 mt-6">
            How We Use Your Data
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Generating marketing performance reports</li>
            <li>Sending report delivery emails</li>
            <li>Improving our service</li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-800 mt-6">
            Third-Party Services
          </h2>
          <p>
            We use Supabase for data storage, Stripe for payment processing,
            OpenAI for AI-generated insights, and Resend for email delivery.
            We do not sell your data.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 mt-6">
            Data Retention
          </h2>
          <p>
            Your data is retained as long as your account is active. Upon
            account deletion, all data is permanently removed.
          </p>

          <p className="mt-8 text-xs text-slate-400">
            [Add full privacy policy before production launch]
          </p>
        </div>
      </main>
    </div>
  );
}
