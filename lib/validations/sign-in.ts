import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .refine((val) => val.trim().length > 0, {
      message: "Password cannot be blank",
    }),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
