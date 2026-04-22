'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// ─── Schema ────────────────────────────────────────────────────────────────────
// Keep co-located unless shared — move to schema.ts if reused elsewhere.
const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type SignInFormValues = z.infer<typeof signInSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────
interface SignInFormProps {
  /** Server action bound via useActionState in the parent or passed directly */
  action: (formData: FormData) => void | Promise<void>;
  /** Transport-safe error message returned by the server action */
  serverError?: string | null;
  /** Pending state from useFormStatus or useActionState */
  isPending?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function SignInForm({ action, serverError, isPending }: SignInFormProps) {
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched', // Validate on blur; re-validate on change after first touch
  });

  /**
   * RHF's handleSubmit runs zod validation first.
   * On success, build a FormData and call the server action.
   * react-hook-form never calls onSubmit with invalid data.
   */
  const onSubmit = form.handleSubmit(async (values: SignInFormValues) => {
    const formData = new FormData();
    formData.set('email', values.email);
    formData.set('password', values.password);
    await action(formData);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">

        {/* ── Server-level error (wrong credentials, rate limit, etc.) ── */}
        {serverError && (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}

        {/* ── Email ──────────────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isPending}
                />
              </FormControl>
              {/* FormMessage renders the zod error string automatically */}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Password ───────────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                {/* type="password" is the sole AC requirement for obscuring input */}
                <Input
                  {...field}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </Form>
  );
}
