import { NextRequest, NextResponse } from "next/server";

import {
  populatePoolPayloadSchema
} from "@/jobs/handlers/populate-pool";
import { getAdminSecret } from "@/config/env.server-entry";
import { enqueuePopulatePoolJob } from "@/jobs/repositories/job-repository";

export async function POST(request: NextRequest) {
  const expectedSecret = getAdminSecret();
  const incomingSecret = request.headers.get("x-admin-secret");

  if (!expectedSecret || incomingSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = populatePoolPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const jobId = await enqueuePopulatePoolJob(parsed.data);
    return NextResponse.json({ queued: true, jobId }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to enqueue job" }, { status: 500 });
  }
}
