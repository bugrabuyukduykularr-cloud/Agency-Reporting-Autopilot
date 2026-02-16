import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agency Reporting Autopilot",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {children}
      </div>
    </div>
  );
}
