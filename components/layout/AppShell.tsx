import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto flex min-h-dvh">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
