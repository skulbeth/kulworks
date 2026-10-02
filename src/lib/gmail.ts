// Reads the Kulworks Gmail inbox for messages to or from a given client, so the
// back-and-forth that happens outside the admin still lands on their timeline.
//
// Read-only on purpose: the scope is gmail.readonly, nothing here can send, label,
// archive or delete. It also only ever asks Gmail for messages involving one
// specific address, so a sync pulls that client's thread and nothing else.
//
// Needs the refresh token to carry the Gmail scope. The token was originally
// granted for Drive and Calendar only, so `npm run google:auth` has to be re-run
// once after this ships. Until then gmailConfigured() is effectively false and the
// admin shows that rather than failing.
import { getGoogleAccessToken, googleConfigured } from "@/lib/google-oauth";

export type GmailMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  date: Date;
  /** True when Kulworks sent it, rather than received it. */
  outbound: boolean;
};

type RawHeader = { name?: string; value?: string };

function header(headers: RawHeader[], name: string): string {
  const h = headers.find((x) => (x.name ?? "").toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

/** Pulls just the address out of a "Name <a@b.com>" header value. */
export function bareAddress(v: string): string {
  const m = v.match(/<([^>]+)>/);
  return (m ? m[1] : v).trim().toLowerCase();
}

export function gmailConfigured(): boolean {
  return googleConfigured();
}

/**
 * Recent messages exchanged with `email`, newest first.
 * Returns [] rather than throwing: a sync failing should never break the page.
 */
export async function fetchClientMessages(
  email: string,
  max = 25
): Promise<{ messages: GmailMessage[]; error: string | null }> {
  const token = await getGoogleAccessToken();
  if (!token) return { messages: [], error: "Google is not connected." };

  const addr = email.trim().toLowerCase();
  if (!addr) return { messages: [], error: "That client has no email address." };

  const auth = { Authorization: `Bearer ${token}` };
  const q = encodeURIComponent(`from:${addr} OR to:${addr}`);

  try {
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${q}`,
      { headers: auth }
    );
    if (listRes.status === 401 || listRes.status === 403) {
      return {
        messages: [],
        error:
          "Gmail access has not been granted yet. Run `npm run google:auth` and re-authorise, then paste the new GOOGLE_REFRESH_TOKEN into .env.local and Vercel.",
      };
    }
    if (!listRes.ok) {
      return { messages: [], error: `Gmail said ${listRes.status}.` };
    }

    const list = (await listRes.json()) as { messages?: { id: string }[] };
    const ids = (list.messages ?? []).map((m) => m.id);
    if (ids.length === 0) return { messages: [], error: null };

    // Metadata only: headers and the snippet, never the message body.
    const out: GmailMessage[] = [];
    for (const id of ids) {
      const r = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}` +
          `?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: auth }
      );
      if (!r.ok) continue;
      const m = (await r.json()) as {
        id: string;
        threadId: string;
        snippet?: string;
        internalDate?: string;
        payload?: { headers?: RawHeader[] };
      };
      const hs = m.payload?.headers ?? [];
      const from = header(hs, "From");
      out.push({
        id: m.id,
        threadId: m.threadId,
        from,
        to: header(hs, "To"),
        subject: header(hs, "Subject") || "(no subject)",
        snippet: (m.snippet ?? "").slice(0, 400),
        date: m.internalDate ? new Date(Number(m.internalDate)) : new Date(),
        // If the client is the sender it came in; otherwise we sent it.
        outbound: bareAddress(from) !== addr,
      });
    }
    out.sort((a, b) => b.date.getTime() - a.date.getTime());
    return { messages: out, error: null };
  } catch (e) {
    return { messages: [], error: e instanceof Error ? e.message : "Gmail request failed." };
  }
}
