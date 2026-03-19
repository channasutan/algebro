/**
 * Public environment variable implementation.
 *
 * Contains only environment variables that are safe to expose to the browser.
 * Browser-exposed environment variables should use the "NEXT_PUBLIC_" prefix.
 * "nodeEnv" is also exposed, provided by the build/runtime environment.
 */
export type PublicEnv = {
  nodeEnv: "development" | "test" | "production";
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export type PublicAuthEnv = {
  siteUrl: string;
  authCallbackUrl: string;
};

function readOptionalPublicEnv(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : undefined;
}

function readRequiredPublicEnv(value: string | undefined, name: string): string {
  const normalizedValue = readOptionalPublicEnv(value);

  if (!normalizedValue) {
    throw new Error(`Missing required public environment variable: ${name}`);
  }

  return normalizedValue;
}

function readRequiredPublicUrlEnv(value: string | undefined, name: string): string {
  const normalizedValue = readRequiredPublicEnv(value, name);

  try {
    const parsedUrl = new URL(normalizedValue);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[env.public] Failed to parse URL for ${name}`);
    }
    throw new Error(
      `Invalid public environment variable: ${name}. Expected an absolute http or https URL.`
    );
  }

  return normalizedValue;
}

function readNodeEnv(value: string | undefined): "development" | "test" | "production" {
  if (value === "development" || value === "test" || value === "production") {
    return value;
  }
  return "development";
}

export function getPublicEnv(): PublicEnv {
  return {
    nodeEnv: readNodeEnv(process.env.NODE_ENV),
    supabaseUrl: readRequiredPublicEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL"
    ),
    supabaseAnonKey: readRequiredPublicEnv(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
  };
}

export function hasPublicSupabaseEnv(): boolean {
  return Boolean(
    readOptionalPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && readOptionalPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function getPublicAuthEnv(): PublicAuthEnv {
  return {
    siteUrl: readRequiredPublicUrlEnv(process.env.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL"),
    authCallbackUrl: readRequiredPublicUrlEnv(
      process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL,
      "NEXT_PUBLIC_AUTH_CALLBACK_URL"
    )
  };
}
