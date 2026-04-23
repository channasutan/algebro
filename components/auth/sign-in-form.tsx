'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SignInActionState } from '@/app/sign-in/actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending} aria-disabled={pending}>
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}

interface SignInFormProps {
  /**
   * The raw server action.
   * SignInForm will wrap this in useActionState.
   */
  action: (prevState: SignInActionState, formData: FormData) => Promise<SignInActionState>;
}

export function SignInForm({ action }: Readonly<SignInFormProps>) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} noValidate className="space-y-4">
      {state?.error && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      <SubmitButton />

      <p className="text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="underline underline-offset-4 hover:text-primary">
          Sign up
        </Link>
      </p>
    </form>
  );
}
