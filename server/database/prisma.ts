import "server-only";

import { PrismaClient } from "@prisma/client";

declare global {
  var __superchannelPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__superchannelPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__superchannelPrisma__ = prisma;
}
