import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AppHeaderProps {
  readonly onMenuToggle?: () => void;
  readonly isSidebarOpen?: boolean;
}

export function AppHeader({ onMenuToggle, isSidebarOpen }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 backdrop-blur">
      <div className="flex items-center gap-4">
        {/* Hamburger - mobile only */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label={isSidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isSidebarOpen}
          className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] transition-colors"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Placeholder for page title or breadcrumbs */}
        <span className="text-[var(--text-lg)] font-semibold text-[var(--color-text)]">
          Algebro
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
