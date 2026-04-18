import { NavLinks } from './NavLinks';

export function AppSidebar() {
  return (
    <aside className="hidden md:flex w-[260px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex h-16 items-center px-6">
        <span className="font-display text-xl font-bold tracking-tight text-[var(--color-text)]">
          Algebro
        </span>
      </div>
      
      <div className="flex-1 py-4">
        <NavLinks />
      </div>
    </aside>
  );
}
