import { z } from "zod";

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const signUpSchema = z.object({
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    email: z.string().email("Invalid email address"),
    password: z.string(),
    //password: z.string().regex(passwordRegex, "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string(),
  }),
});
