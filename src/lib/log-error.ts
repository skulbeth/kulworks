// Records a server-side error into the ErrorLog table so it's visible in the admin.
// Best-effort — never throws (logging must not break the request).
import { prisma } from "@/lib/prisma";

export async function logError(err: unknown, context: string) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack ?? null : null;
  console.error(`[${context}]`, message);
  try {
    await prisma.errorLog.create({ data: { message: message.slice(0, 1000), context, stack: stack?.slice(0, 4000) } });
  } catch {
    /* ignore */
  }
}
