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
const SEEN_MAX = 1000;
const LIST_MAX = 200; // ids looked at per run (newest first, a few days back)
const FETCH_MAX = 60; // messages actually opened per run; the rest wait for the next one
const RUN_BUDGET_MS = 40_000; // stop early so after() isn't cut off mid-run

// ── Payment receipt parsing (pure, unit-tested) ──

export type Receipt = { source: string; amount: number; payer: string | null; memo: string | null };

// Only real payment-service senders count. Zelle has no mail of its own worth
// trusting, so a Zelle receipt is a bank alert that also says "Zelle".
const SOURCES: { name: string; domains: string[]; needsZelle?: boolean }[] = [
  { name: "Venmo", domains: ["venmo.com"] },
  { name: "PayPal", domains: ["paypal.com"] },
  { name: "Cash App", domains: ["cash.app", "square.com", "squareup.com"] },
  {
    name: "Zelle",
    needsZelle: true,
    domains: [
      "zellepay.com", "chase.com", "bankofamerica.com", "wellsfargo.com", "usaa.com", "capitalone.com",
      "navyfederal.org", "frostbank.com", "frost.com", "pnc.com", "ally.com", "citi.com", "citibank.com",
      "usbank.com", "td.com", "truist.com", "schwab.com", "discover.com", "regions.com",
    ],
  },
];

/** service.paypal.com counts as paypal.com; notpaypal.com does not. */
const domainIs = (domain: string, d: string) => domain === d || domain.endsWith(`.${d}`);

/** Recognise "X paid you $25.00" style receipts. null when it isn't one. */
export function parseReceipt(fromAddr: string, subject: string, snippet: string): Receipt | null {
  const from = fromAddr.toLowerCase();
  const text = `${subject} \n ${snippet}`;
  const domain = from.split("@")[1] ?? "";
  const src = SOURCES.find((s) => s.domains.some((d) => domainIs(domain, d)));
  if (!src) return null;
  // A bank email without Zelle is payroll, a transfer or a card statement.
  if (src.needsZelle && !/\bzelle\b/i.test(text)) return null;
  // Not money in: a refund, a failed or cancelled payment, a request, a reminder,
  // something Sam paid or sent, or a card-payment "thanks, we got it".
  if (/refund|cancell?ed|declined|failed|unsuccessful|reversed|could not be (?:sent|completed)|reminder/i.test(text)) return null;
  if (/request(?:s|ed|ing)? (?:\$|you|money|a payment)|is requesting|sent you a request|you(?: have| just)? (?:paid|sent)\b/i.test(text)) return null;
  if (/thank you for your payment|(?:we(?:'ve| have)? )?received your payment|your (?:credit )?card payment|statement/i.test(text)) return null;
  // The amount has to follow the "money came in" phrase, which keeps promos
  // ("Get $10 when you invite friends") out.
  const m = text.match(
    /(?:paid you|sent you|you(?:'ve| have)? received(?: money)?(?: with zelle\W?)?|deposited)[^$]{0,60}\$\s?([\d,]+(?:\.\d{2})?)/i
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
  return { source: src.name, amount, payer, memo };
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

/** Ids of recent inbox mail, newest first, paged up to LIST_MAX. */
async function recentIds(token: string): Promise<string[]> {
  const q = encodeURIComponent("in:inbox newer_than:3d -from:me");
  const ids: string[] = [];
  let page = "";
  while (ids.length < LIST_MAX) {
    const list = await gmail(token, `messages?maxResults=100&q=${q}${page ? `&pageToken=${page}` : ""}`);
    ids.push(...(list.messages ?? []).map((m: { id: string }) => m.id));
    if (!list.nextPageToken) break;
    page = encodeURIComponent(list.nextPageToken);
  }
  return ids.slice(0, LIST_MAX);
}

async function fetchMsg(token: string, id: string): Promise<Msg> {
  const d = await gmail(token, `messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
  const h = (n: string) =>
    (d.payload?.headers ?? []).find((x: { name: string }) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
  return {
    id,
    from: h("From"),
    subject: h("Subject"),
    snippet: String(d.snippet ?? "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
    date: new Date(Number(d.internalDate) || Date.now()),
  };
}

// ── Matching ──

const cents = (n: number) => Math.round(n * 100) / 100;
const sameMoney = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * Which unpaid docs a receipt could be for. `hits` is empty (no match), one doc,
 * or several when the amount fits more than one and the payer's name can't split
 * them. `amountOk` is false only for a memo match whose amount doesn't fit.
 */
export async function matchReceipt(r: Receipt) {
  const sent = await prisma.invoice.findMany({
    where: { deletedAt: null, status: "SENT", OR: [{ type: "INVOICE" }, { type: "QUOTE", depositPct: { gt: 0 } }] },
    include: { items: true, client: true },
  });
  // A quote that already has its invoice is paid through that invoice. Counting both
  // would make every receipt on a converted job "matches Q-x or INV-y".
  const converted = new Set(
    (
      await prisma.invoice.findMany({
        where: { deletedAt: null, status: { not: "VOID" }, sourceQuoteId: { in: sent.map((i) => i.id) } },
        select: { sourceQuoteId: true },
      })
    ).map((c) => c.sourceQuoteId)
  );
  const open = sent.filter((i) => !(i.type === "QUOTE" && converted.has(i.id)));
  // Payments are recorded per project, not per doc.
  const sums = await prisma.payment.groupBy({
    by: ["projectId"],
    where: { deletedAt: null, projectId: { in: [...new Set(open.map((i) => i.projectId))] } },
    _sum: { amount: true },
  });
  const paidOn = new Map(sums.map((s) => [s.projectId, s._sum.amount ?? 0]));

  const due = open.map((inv) => {
    const { total } = computeTotals(inv.items, inv.taxRate);
    const { dueNow, balance, hasSplit } = splitDeposit(total, inv.depositPct);
    const paid = paidOn.get(inv.projectId) ?? 0;
    const left = cents(total - paid);
    let owed: number;
    if (inv.type === "QUOTE" && hasSplit) {
      // Deposit first; once anything is in, what's left of the total.
      owed = paid < 0.005 ? dueNow : Math.max(0, left);
    } else {
      // Payments on the project may belong to another doc (a quote's deposit
      // ahead of a balance-only invoice), so fall back to the total when they
      // don't leave a sensible remainder.
      owed = left > 0.005 && left < total ? left : total;
    }
    // Amounts that count as a match, and the wider set that makes a memo match believable.
    const match = [owed, ...(hasSplit ? [dueNow] : []), ...(inv.sourceQuoteId ? [total] : [])];
    const plausible = [...match, total, ...(hasSplit ? [balance] : [])];
    return { inv, owed, match, plausible };
  });

  if (r.memo) {
    const hit = due.find((d) => d.inv.number === r.memo);
    if (hit) return { hits: [hit], amountOk: hit.plausible.some((a) => sameMoney(a, r.amount)) };
  }
  let same = due.filter((d) => d.match.some((a) => sameMoney(a, r.amount)));
  if (same.length > 1 && r.payer) {
    const first = r.payer.split(" ")[0].toLowerCase();
    const byName = same.filter((d) => d.inv.client.name.toLowerCase().includes(first));
    if (byName.length >= 1) same = byName;
  }
  return { hits: same, amountOk: true };
}

// ── The sweep ──

async function handleMessage(m: Msg) {
  const addr = bareAddress(m.from);

  // A known client is always client email first, even when they write about
  // Zelle or paying: Sam needs the alert and the timeline entry.
  const client = await prisma.client.findFirst({
    where: { email: { equals: addr, mode: "insensitive" } },
    include: { projects: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  if (client) {
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

  // Receipts only come from payment-service senders, which a client never is.
  const receipt = parseReceipt(addr, m.subject, m.snippet);
  if (!receipt) return;
  const { hits, amountOk } = await matchReceipt(receipt);
  const money = `$${receipt.amount.toFixed(2)}`;
  const one = hits.length === 1 ? hits[0] : null;
  const from = receipt.payer ? `From ${receipt.payer}. ` : "";
  await notify({
    kind: "payment",
    title: one
      ? `${one.inv.client.name} paid ${money}? (${receipt.source})`
      : `Payment received: ${money} (${receipt.source})`,
    body: !hits.length
      ? `${from}No unpaid invoice matches that amount.`
      : !one
        ? `${from}Matches ${hits.map((h) => h.inv.number).join(" or ")}. Check which before tapping Mark paid.`
        : amountOk
          ? `Matches ${one.inv.number}. Open the project and tap Mark paid if it's theirs.`
          : `Memo says ${one.inv.number}, but ${money} isn't its deposit, balance or total ($${one.owed.toFixed(2)} owed). Check before tapping Mark paid.`,
    url: one ? `${projectUrl(one.inv.projectId)}#doc-${one.inv.id}` : "/admin/notifications/",
    projectId: one?.inv.projectId ?? null,
    clientId: one?.inv.clientId ?? null,
    dedupeKey: `payment:${m.id}`,
  });
}

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
    const ids = await recentIds(token);
    const done: string[] = [];
    const saveSeen = async () => {
      const value = JSON.stringify([...done, ...seenList].slice(0, SEEN_MAX));
      await prisma.setting.upsert({ where: { key: SEEN_KEY }, update: { value }, create: { key: SEEN_KEY, value } });
    };

    // Very first sweep: remember what's already there instead of announcing days
    // of old mail at once. No need to open any of it.
    if (!seenRow) {
      done.push(...ids);
      await saveSeen();
      return { ran: true, checked: 0 };
    }

    // Oldest unseen first, capped, so a backlog drains over a few runs in order.
    const todo = ids.filter((id) => !seen.has(id)).reverse().slice(0, FETCH_MAX);
    for (const id of todo) {
      if (Date.now() - now > RUN_BUDGET_MS) break;
      // One bad message (a Gmail hiccup, a notify error) is logged and skipped for this
      // run, so it can't block everything behind it. It stays unseen and is retried next
      // run (until it ages out of the 3-day window).
      try {
        const m = await fetchMsg(token, id);
        await handleMessage(m);
      } catch (e) {
        console.error("[inbox-sweep] message", id, e);
        continue;
      }
      done.unshift(id);
      // Save as we go: a timeout mid-run must not replay (or forever redo) the lot.
      if (done.length % 10 === 0) await saveSeen();
    }
    if (done.length % 10 !== 0) await saveSeen();
    return { ran: true, checked: done.length };
  } catch (e) {
    console.error("[inbox-sweep]", e);
    return { ran: true, error: (e as Error).message };
  }
}
