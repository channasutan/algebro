import { cn } from '@/lib/utils';
import { NavLinks } from './NavLinks';

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden" 
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      <aside 
        id="app-sidebar" 
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-300 ease-in-out md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center px-6">
          <span className="font-display text-xl font-bold tracking-tight text-[var(--color-text)]">
            Algebro
          </span>
        </div>
        
        <div className="flex-1 py-4">
          <NavLinks />
        </div>
      </aside>
    </>
  );
}
