import { USER_ROLE } from "../src/utils/user-roles.js";
import { prisma } from "../src/utils/prisma.js";
const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error("Usage: npm run admin:bootstrap -- your-existing-account@example.com");
try {
  await prisma.$transaction(async (tx) => {
    // A fixed unique marker makes concurrent first-admin bootstraps mutually exclusive.
    await tx.adminBootstrap.create({ data: { id: "first-admin" } });
    const user = await tx.user.update({ where: { email }, data: { role: USER_ROLE.ADMIN } });
    await tx.session.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
    await tx.adminAudit.create({ data: { userId: user.id, action: "FIRST_ADMIN_BOOTSTRAPPED" } });
  });
  console.log("First administrator configured. Sign in again.");
} catch {
  console.error("Bootstrap failed: it may already have run, or the account does not exist.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
