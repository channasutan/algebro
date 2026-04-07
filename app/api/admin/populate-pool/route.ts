import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  populatePoolPayloadSchema
} from "@/jobs/handlers/populate-pool";
import { getAdminSecret } from "@/config/env.server-entry";
import { enqueuePopulatePoolJob } from "@/jobs/repositories/job-repository";

export async function POST(request: NextRequest) {
  const expectedSecret = getAdminSecret();
  const incomingSecret = request.headers.get("x-admin-secret");

  // Return 401 if either secret is missing
  if (!expectedSecret || !incomingSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use timingSafeEqual to prevent timing attacks
  let isValid = false;
  try {
    isValid = timingSafeEqual(
      Buffer.from(incomingSecret),
      Buffer.from(expectedSecret)
    );
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

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
