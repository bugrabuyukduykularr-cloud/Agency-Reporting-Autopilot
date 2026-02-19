import Link from "next/link";
import { BarChart3, Brain, Send } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900">
            Agency Reporting Autopilot
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
            Automate Your
            <br />
            Client Reporting
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
            AI-powered marketing reports delivered on autopilot. Connect your
            platforms, set a schedule, and let us handle the rest.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-[#0F172A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1e293b] transition-colors"
            >
              Start Free Trial
            </Link>
            <a
              href="#features"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              See How It Works
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-xl bg-white border border-slate-200 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Connect Once, Report Forever
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Link Google Analytics, Meta Ads, and LinkedIn Ads. We pull
                the data automatically every reporting period.
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                AI Writes the Insights
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                GPT-4 analyzes performance data and generates executive
                summaries, wins, concerns, and recommendations.
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Send className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Delivered Automatically
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Set the schedule — weekly or monthly — and branded PDF reports
                get emailed to your clients on time, every time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Start Your 14-Day Free Trial
          </h2>
          <p className="mt-2 text-slate-500">
            No credit card required. Set up in under 5 minutes.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-block rounded-lg bg-[#0F172A] px-8 py-3 text-sm font-semibold text-white hover:bg-[#1e293b] transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Agency Reporting Autopilot
          </p>
          <div className="flex gap-4 text-xs text-slate-400">
            <Link href="/terms" className="hover:text-slate-600">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-600">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
