// Numbered quotes and invoices (Q-0001, INV-0001), shared by the admin actions and the
// automatic invoice made when a client accepts and approves.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Create a numbered quote/invoice. The number is picked and the row written inside one
// transaction holding a lock, so two docs made at once (double click, two tabs) can't
// both get the same Q-/INV- number.
export async function createNumberedDoc<T>(
  type: "QUOTE" | "INVOICE",
  create: (number: string, tx: Prisma.TransactionClient) => Promise<T>
): Promise<{ number: string; doc: T }> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(4207001)`;
    const rows = await tx.invoice.findMany({ where: { type: type as never }, select: { number: true } });
    // Highest number in use + 1 (not a count, which repeats a number if a row is ever removed).
    const top = rows.reduce((m, r) => Math.max(m, Number(r.number.match(/(\d+)$/)?.[1] ?? 0)), 0);
    const number = `${type === "QUOTE" ? "Q" : "INV"}-${String(top + 1).padStart(4, "0")}`;
    return { number, doc: await create(number, tx) };
  });
}
