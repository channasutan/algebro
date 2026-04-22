'use client';

import { useTransition } from 'react';
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
const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .refine((val) => val.trim().length > 0, {
      message: 'Password cannot be blank',
    }),
});

type SignInFormValues = z.infer<typeof signInSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────
interface SignInFormProps {
  /**
   * Dispatcher returned by useActionState — do NOT pass the raw server action.
   * The raw action has signature (prevState, formData) => Promise<ActionResult>
   * and is incompatible with this slot.
   */
  action: (formData: FormData) => void;
  /** Transport-safe error message returned by the server action */
  serverError?: string | null;
  /** Pending state from useFormStatus or useActionState */
  isPending?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function SignInForm({ action, serverError, isPending: isActionPending }: SignInFormProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const isPending = isActionPending || isTransitionPending;

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = form.handleSubmit((values: SignInFormValues) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('email', values.email);
      formData.set('password', values.password);
      await action(formData);
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}

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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
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

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </Form>
  );
}
