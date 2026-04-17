import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-display font-bold mb-4">Phase 0 scaffold ready.</h1>
        <p className="text-lg text-[var(--color-text-muted)]">Algebro Landing Page (Public)</p>
      </div>
      <div className="flex gap-4">
        <Link 
          href="/dashboard"
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-[var(--color-bg)] font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          Go to AppShell
        </Link>
      </div>
    </main>
  );
}
