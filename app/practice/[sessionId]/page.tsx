import "server-only";

import { redirect } from "next/navigation";

import { getCurrentSession } from "@/modules/authentication";
import { ensureModulesBootstrapped } from "@/modules/bootstrap";

import { HintPanel } from "./components/hint-panel";

type PageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ attemptId?: string; stepIndex?: string }>;
};

export default async function PracticeSessionPage({
  params,
  searchParams
}: PageProps) {
  const { sessionId } = await params;
  const { attemptId, stepIndex: stepIndexStr } = await searchParams;

  await ensureModulesBootstrapped();

  const sessionResult = await getCurrentSession();
  if (!sessionResult.session?.isAuthenticated) {
    redirect("/login");
  }

  if (!attemptId) {
    redirect("/practice");
  }

  const parsedStepIndex = parseInt(stepIndexStr ?? "0", 10);
  const stepIndex = Number.isNaN(parsedStepIndex) ? 0 : Math.max(parsedStepIndex, 0);
  // TODO: replace fallback with active-step lookup once practice module exposes getAttempt/getSession read API.

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Practice Session</h1>
      <div className="p-4 bg-gray-100 rounded-lg border">
        <p className="text-sm text-gray-600">Session ID</p>
        <p className="font-mono text-gray-800">{sessionId}</p>
      </div>

      <hr className="my-6 border-gray-200" />

      <HintPanel attemptId={attemptId} stepIndex={stepIndex} />
    </div>
  );
}
