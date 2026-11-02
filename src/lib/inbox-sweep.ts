// Watches the Kulworks Gmail inbox for two things Sam wants on his phone:
//   1. a known client emailing (a reply to a quote, a question), and
//   2. a payment receipt (Venmo / PayPal / Zelle / Cash App) that matches an
//      unpaid invoice. Receipts are flagged, never auto-applied: Sam taps
//      "Mark paid" himself, because a wrong match would quietly close a job.
//
// Vercel Hobby only runs crons daily, so the sweep is lazy: it runs at most every
// SWEEP_EVERY_MS, kicked by site traffic, by opening the admin/app, by the daily
// cron and by the "Check now" button. Read-only Gmail scope; nothing is changed
// in the mailbox.
import { prisma } from "@/lib/prisma";
import { getGoogleAccessToken } from "@/lib/google-oauth";
import { bareAddress } from "@/lib/gmail";
import { notify, projectUrl } from "@/lib/notify";
import { computeTotals, splitDeposit } from "@/lib/invoice";

const SWEEP_EVERY_MS = 10 * 60_000;
const LAST_KEY = "inbox_sweep_last";
const SEEN_KEY = "inbox_sweep_seen";
const SEEN_MAX = 400;

// ── Payment receipt parsing (pure, unit-tested) ──

export type Receipt = { source: string; amount: number; payer: string | null; memo: string | null };

const SOURCES: { name: string; from: RegExp }[] = [
  { name: "Venmo", from: /venmo\.com$/ },
  { name: "PayPal", from: /paypal\.com$/ },
  { name: "Cash App", from: /(cash\.app|square\.com|squareup\.com)$/ },
  { name: "Zelle", from: /zelle|chase\.com|bankofamerica\.com|wellsfargo\.com|usaa\.com|capitalone\.com|navyfederal\.org|frost(bank)?\.com|pnc\.com|ally\.com|citi\.com|usbank\.com/ },
];

/** Recognise "X paid you $25.00" style receipts. null when it isn't one. */
export function parseReceipt(fromAddr: string, subject: string, snippet: string): Receipt | null {
  const from = fromAddr.toLowerCase();
  const text = `${subject} \n ${snippet}`;
  const domain = from.split("@")[1] ?? "";
  const src = SOURCES.find((s) => s.from.test(domain));
  // A bank's Zelle alert can come from any bank domain, but a client writing
  // "I'll Zelle you" from their own mailbox is not a receipt.
  const personal = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol|proton|protonmail)\./.test(domain);
  const zelleWord = /\bzelle\b/i.test(text) && !personal;
  if (!src && !zelleWord) return null;
  // Not a request, a payment Sam sent, or a reminder.
  if (/you paid|you sent|request(ed)? \$|requests \$|is requesting|reminder/i.test(subject)) return null;
  // The amount has to follow the "money came in" phrase, which keeps promos
  // ("Get $10 when you invite friends") out.
  const m = text.match(
    /(?:paid you|sent you|you(?:'ve| have)? received(?: money)?(?: with zelle\W?)?|payment received(?: of)?|deposited)[^$]{0,60}\$\s?([\d,]+(?:\.\d{2})?)/i
  );
  if (!m) return null;
  const amount = Number(m[1].replace(/,/g, ""));
  if (!(amount > 0)) return null;
  const NAME = "([A-Z][\\w'.-]*(?:[ ][A-Z][\\w'.-]*){0,3})";
  const payer =
    text.match(new RegExp(`${NAME} (?:paid|sent) you`))?.[1]?.replace(/^(?:Fwd?|Re):?\s*/, "") ??
    text.match(new RegExp(`from ${NAME}`))?.[1] ??
    null;
  const memo = text.match(/\b(INV-\d{4}|Q-\d{4})\b/i)?.[1]?.toUpperCase() ?? null;
  return { source: src?.name ?? "Zelle", amount, payer, memo };
}

// ── Gmail ──

type Msg = { id: string; from: string; subject: string; snippet: string; date: Date };

async function gmail(token: string, path: string) {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Gmail ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function recentInbox(token: string, seen: Set<string>): Promise<Msg[]> {
  const list = await gmail(token, `messages?maxResults=40&q=${encodeURIComponent("in:inbox newer_than:2d -from:me")}`);
  const ids: string[] = (list.messages ?? []).map((m: { id: string }) => m.id).filter((id: string) => !seen.has(id));
  const out: Msg[] = [];
  for (const id of ids) {
    const d = await gmail(token, `messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
    const h = (n: string) =>
      (d.payload?.headers ?? []).find((x: { name: string }) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
    out.push({
      id,
      from: h("From"),
      subject: h("Subject"),
      snippet: String(d.snippet ?? "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
      date: new Date(Number(d.internalDate) || Date.now()),
    });
  }
  return out;
}

// ── Matching ──

export async function matchReceipt(r: Receipt) {
  const open = await prisma.invoice.findMany({
    where: { deletedAt: null, status: "SENT", OR: [{ type: "INVOICE" }, { type: "QUOTE", depositPct: { gt: 0 } }] },
    include: { items: true, client: true },
  });
  const due = open.map((inv) => {
    const { total } = computeTotals(inv.items, inv.taxRate);
    return { inv, amount: splitDeposit(total, inv.depositPct).dueNow };
  });
  if (r.memo) {
    const hit = due.find((d) => d.inv.number === r.memo);
    if (hit) return hit;
  }
  const same = due.filter((d) => Math.abs(d.amount - r.amount) < 0.005);
  if (same.length === 1) return same[0];
  if (same.length > 1 && r.payer) {
    const first = r.payer.split(" ")[0].toLowerCase();
    const byName = same.filter((d) => d.inv.client.name.toLowerCase().includes(first));
    if (byName.length === 1) return byName[0];
  }
  return null;
}

// ── The sweep ──

/** Runs the sweep if it hasn't run in the last SWEEP_EVERY_MS. Never throws. */
export async function maybeSweepInbox(force = false): Promise<{ ran: boolean; checked?: number; error?: string }> {
  try {
    const now = Date.now();
    if (!force) {
      // Claim the slot atomically so two requests don't both sweep.
      await prisma.setting.upsert({ where: { key: LAST_KEY }, update: {}, create: { key: LAST_KEY, value: "0" } });
      const claimed = await prisma.setting.updateMany({
        where: { key: LAST_KEY, value: { lt: String(now - SWEEP_EVERY_MS).padStart(13, "0") } },
        data: { value: String(now).padStart(13, "0") },
      });
      if (claimed.count === 0) return { ran: false };
    } else {
      await prisma.setting.upsert({
        where: { key: LAST_KEY },
        update: { value: String(now).padStart(13, "0") },
        create: { key: LAST_KEY, value: String(now).padStart(13, "0") },
      });
    }

    const token = await getGoogleAccessToken();
    if (!token) return { ran: true, checked: 0, error: "Google is not connected" };
    const seenRow = await prisma.setting.findUnique({ where: { key: SEEN_KEY } });
    const seenList: string[] = seenRow ? JSON.parse(seenRow.value) : [];
    const seen = new Set(seenList);
    const msgs = await recentInbox(token, seen);
    // Very first sweep: remember what's already there instead of announcing two
    // days of old mail at once.
    const baseline = !seenRow;

    for (const m of msgs) {
      if (baseline) continue;
      const addr = bareAddress(m.from);
      const receipt = parseReceipt(addr, m.subject, m.snippet);
      if (receipt) {
        const hit = await matchReceipt(receipt);
        await notify({
          kind: "payment",
          title: hit
            ? `${hit.inv.client.name} paid $${receipt.amount.toFixed(2)}? (${receipt.source})`
            : `Payment received: $${receipt.amount.toFixed(2)} (${receipt.source})`,
          body: hit
            ? `Matches ${hit.inv.number}. Open the project and tap Mark paid if it's theirs.`
            : `${receipt.payer ? `From ${receipt.payer}. ` : ""}No unpaid invoice matches that amount.`,
          url: hit ? `${projectUrl(hit.inv.projectId)}#doc-${hit.inv.id}` : "/admin/notifications/",
          projectId: hit?.inv.projectId ?? null,
          clientId: hit?.inv.clientId ?? null,
          dedupeKey: `payment:${m.id}`,
        });
        continue;
      }

      const client = await prisma.client.findFirst({
        where: { email: { equals: addr, mode: "insensitive" } },
        include: { projects: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 1 } },
      });
      if (!client) continue;
      const project = client.projects[0] ?? null;
      await prisma.activity
        .create({
          data: {
            type: "EMAIL_RECEIVED",
            body: `${m.subject}\n${m.snippet}`,
            occurredAt: m.date,
            clientId: client.id,
            projectId: project?.id ?? null,
            externalId: m.id,
          },
        })
        .catch(() => {}); // already pulled in by a manual sync (unique externalId)
      await notify({
        kind: "email_reply",
        title: `${client.name} emailed`,
        body: `${m.subject || "(no subject)"} · ${m.snippet.slice(0, 140)}`,
        url: project ? projectUrl(project.id) : `/admin/clients/${client.id}/`,
        projectId: project?.id ?? null,
        clientId: client.id,
        dedupeKey: `email:${m.id}`,
      });
    }

    const nextSeen = [...msgs.map((m) => m.id), ...seenList].slice(0, SEEN_MAX);
    const value = JSON.stringify(nextSeen);
    await prisma.setting.upsert({ where: { key: SEEN_KEY }, update: { value }, create: { key: SEEN_KEY, value } });
    return { ran: true, checked: msgs.length };
  } catch (e) {
    console.error("[inbox-sweep]", e);
    return { ran: true, error: (e as Error).message };
  }
}
