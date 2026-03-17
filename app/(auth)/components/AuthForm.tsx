"use client";

import { useActionState } from "react";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

type AuthFormProps = {
  title: string;
  submitLabel: string;
  pendingLabel: string;
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  successMessage: string;
};

const initialState: ActionResult = { success: false, error: "" };

export function AuthForm({ title, submitLabel, pendingLabel, action, successMessage }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <main style={{ maxWidth: "400px", margin: "0 auto", padding: "2rem" }}>
      <h1>{title}</h1>
      {state.success ? (
        <div style={{ color: "green", marginBottom: "1rem" }}>
          {successMessage}
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
          {isPending ? pendingLabel : submitLabel}
        </button>
      </form>
    </main>
  );
}
