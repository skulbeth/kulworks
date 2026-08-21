import { prisma } from "@/lib/prisma";

// Remembers the admin's own visitor hashes so background jobs (e.g. the weekly stats
// email) can exclude the owner's own traffic — the cron has no request IP to derive it.
const KEY = "owner_visitor_hashes";

export async function getOwnerHashes(): Promise<string[]> {
  const s = await prisma.setting.findUnique({ where: { key: KEY } });
  if (!s?.value) return [];
  try {
    const arr = JSON.parse(s.value);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function rememberOwnerHash(hash: string): Promise<void> {
  if (!hash) return;
  const cur = await getOwnerHashes();
  if (cur.includes(hash)) return;
  const next = [...cur, hash].slice(-20); // keep the last 20 (handles changing IPs)
  await prisma.setting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(next) },
    create: { key: KEY, value: JSON.stringify(next) },
  });
}
