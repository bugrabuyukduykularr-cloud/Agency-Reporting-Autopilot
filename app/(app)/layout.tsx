export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar - Coming in Section 3 */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
