import Link from "next/link";

export default function TermsPage() {
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
          Terms of Service
        </h1>

        <div className="prose prose-slate text-sm text-slate-600 space-y-4">
          <p>
            These are the terms of service for Agency Reporting Autopilot. By
            using this service, you agree to these terms.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 mt-6">
            1. Service Description
          </h2>
          <p>
            Agency Reporting Autopilot provides automated marketing report
            generation and delivery for digital marketing agencies.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 mt-6">
            2. Account Terms
          </h2>
          <p>
            You are responsible for maintaining the security of your account
            and password. You are responsible for all activity that occurs
            under your account.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 mt-6">
            3. Payment Terms
          </h2>
          <p>
            Paid plans are billed in advance on a monthly or annual basis.
            There are no refunds for partial months of service.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 mt-6">
            4. Data Usage
          </h2>
          <p>
            We access your connected platform data solely for the purpose of
            generating reports. We do not sell or share your data with third
            parties.
          </p>

          <p className="mt-8 text-xs text-slate-400">
            [Add full legal terms before production launch]
          </p>
        </div>
      </main>
    </div>
  );
}
