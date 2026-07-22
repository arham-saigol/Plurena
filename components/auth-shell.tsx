export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background grid min-h-screen place-items-center px-4 py-10 sm:px-8">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
