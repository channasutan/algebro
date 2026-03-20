import { redirect } from "next/navigation";
import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { getCurrentSession } from "@/modules/authentication";
import {
  getOrCreateUserProfile,
  InitializationSource,
} from "@/modules/user-profiles";
import { getRequestId } from "@/lib/observability";

export default async function ProfilePage() {
  await ensureModulesBootstrapped();

  const { session } = await getCurrentSession();
  if (!session) {
    redirect("/sign-in");
  }

  if (!session.email) {
    throw new Error("Missing email in session for profile bootstrap");
  }

  // ROOT boundary for request correlation resolution
  const requestId = await getRequestId();

  // Orchestration service encapsulates data access strategy, bootstrap side-effects, 
  // and infrastructure consistency guarantees (retries).
  const profile = await getOrCreateUserProfile(
    {
      userId: session.userId,
      email: session.email,
      source: InitializationSource.LAZY_PAGE_LOAD,
    },
    { requestId }
  );

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
      <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(profile, null, 2)}</pre>
    </div>
  );
}
