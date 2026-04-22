'use client';

import { useActionState } from 'react';
import { signInAction } from '@/app/sign-in/actions';
import { SignInForm } from './sign-in-form';
import Link from 'next/link';

const initialState = { success: false, error: "" } as const;

export function SignInPage() {
  const [state, action, isPending] = useActionState(signInAction, initialState);

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <SignInForm
          action={action}
          serverError={!state.success ? state.error : null}
          isPending={isPending}
        />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="underline underline-offset-4 hover:text-primary">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
