'use client';

import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';

type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto flex min-h-dvh">
        <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
