import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCurrentSession } from "@/modules/authentication";
import { ensureModulesBootstrapped } from "@/modules/bootstrap";

export const metadata: Metadata = {
  title: "AI Algebra Platform",
  description: "Phase 0 scaffold"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  await ensureModulesBootstrapped();
  let session = null;
  try {
    const result = await getCurrentSession();
    session = result.session;
  } catch {
    session = null;
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
