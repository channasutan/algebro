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
  // Warm the Supabase session cookie so downstream server components
  // can read authenticated state without a redundant round-trip.
  // The result is intentionally unused here; child routes consume it.
  try {
    await getCurrentSession();
  } catch {
    // Session unavailable — continue with unauthenticated layout
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
