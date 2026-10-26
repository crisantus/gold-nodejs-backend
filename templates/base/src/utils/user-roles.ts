import type { Role } from "../generated/prisma/enums.js";

/** Only roles selected during generation belong to this application. */
export const USER_ROLE = { USER: "user", __ADMIN_ROLE__ } as const satisfies Record<string, Role>;
export type UserRole = Role;
