export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
        <p className="mt-3 text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
