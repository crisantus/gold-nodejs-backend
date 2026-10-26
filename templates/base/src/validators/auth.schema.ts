import { USER_ROLE } from "../utils/user-roles.js";
import { z } from "zod";
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(12).max(128);
export const signupSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export const refreshSchema = z.strictObject({
  refresh_token: z.string().min(20).max(256).optional(),
});
export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
export const publicUserSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(USER_ROLE),
  emailVerified: z.boolean(),
});
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const sessionResponseSchema = z.object({
  user: publicUserSchema,
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  access_token_expires_in: z.number(),
});
__ACTION_SCHEMAS__

export type RefreshInput = z.infer<typeof refreshSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
