import { z } from "zod";
export const deviceSchema = z.strictObject({ token: z.string().min(20).max(4096) });
