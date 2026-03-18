import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ensureModulesBootstrapped } from "@/modules/bootstrap";

export const metadata: Metadata = {
  title: "AI Algebra Platform",
  description: "Phase 0 scaffold"
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  await ensureModulesBootstrapped();

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
