interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      {/* Logo */}
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F172A] text-white font-bold text-lg tracking-tight select-none">
        ARA
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}
