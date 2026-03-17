"use client";

import { useActionState } from "react";
import { signUpAction } from "./actions";

// Default initial state matching the server action's return signature
const initialState = { success: false, error: "" };

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState);

  return (
    <main style={{ maxWidth: "400px", margin: "0 auto", padding: "2rem" }}>
      <h1>Sign Up</h1>
      {state.success ? (
        <div style={{ color: "green", marginBottom: "1rem" }}>
          Sign up successful! Please check your email to confirm your account.
        </div>
      ) : null}
      {!state.success && state.error ? (
        <div style={{ color: "red", marginBottom: "1rem" }}>{state.error}</div>
      ) : null}
      
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label htmlFor="email" style={{ display: "block" }}>Email</label>
          <input type="email" id="email" name="email" required disabled={isPending} />
        </div>
        <div>
          <label htmlFor="password" style={{ display: "block" }}>Password</label>
          <input type="password" id="password" name="password" required disabled={isPending} />
        </div>
        <button type="submit" disabled={isPending}>
          {isPending ? "Signing up..." : "Sign Up"}
        </button>
      </form>
    </main>
  );
}
