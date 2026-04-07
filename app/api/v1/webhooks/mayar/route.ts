export async function POST(request: Request) {
  // Preserve raw body before parsing so HMAC signature verification can use exact bytes.
  const rawBody = await request.text();

  let parsedPayload: unknown = null;
  try {
    parsedPayload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsedPayload = null;
  }

  return Response.json(
    {
      message: "mayar webhook route placeholder",
      hasRawBody: rawBody.length > 0,
      payloadParsed: parsedPayload !== null
    },
    { status: 501 }
  );
}
