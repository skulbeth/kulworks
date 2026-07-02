// Shared Prisma client. A single instance is reused across hot-reloads in dev
// (and across warm serverless invocations in prod) so we don't exhaust connections.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
