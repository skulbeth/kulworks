import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { inviteTeammate } from "../_actions";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string; error?: string }>;
}) {
  const { invited, error } = await searchParams;
  const { profile } = await requireProfile();
  const isOwner = profile.role === "OWNER";

  const [members, audit, errors] = await Promise.all([
    prisma.profile.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const field =
    "rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Team</h1>

      {invited && (
        <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-600">
          Invite sent — they&apos;ll get an email to set their password.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error === "perm" ? "Only an owner can invite teammates." : "Couldn't send the invite."}
        </p>
      )}

      {/* Members */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Members ({members.length})</h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <span className="font-semibold">{m.name ?? m.email}</span>
              <span className="text-sm text-muted">{m.email}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  m.role === "OWNER" ? "bg-gold/15 text-gold" : "bg-surface2 text-muted"
                }`}
              >
                {m.role}
              </span>
              <span className="ml-auto text-xs text-muted">since {fmtDate(m.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Invite */}
      {isOwner ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-lg font-bold">Invite a teammate</h2>
          <form action={inviteTeammate} className="flex flex-wrap items-end gap-2">
            <input name="email" type="email" required placeholder="their@email.com" className={`flex-1 ${field}`} />
            <select name="role" defaultValue="STAFF" className={field}>
              <option value="STAFF">Staff</option>
              <option value="OWNER">Owner</option>
            </select>
            <button className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover">
              Send invite
            </button>
          </form>
          <p className="mt-2 text-xs text-muted">
            They&apos;ll get an email with a link to set their password, then they can log in.
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted">Only owners can invite teammates.</p>
      )}

      {/* Audit log */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Activity log</h2>
        {audit.length === 0 ? (
          <p className="text-muted">No admin activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="bg-surface2 text-left text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">Who</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(a.createdAt)}</td>
                    <td className="px-3 py-2 text-muted">{a.actorEmail}</td>
                    <td className="px-3 py-2">{a.action}</td>
                    <td className="px-3 py-2 text-muted">{a.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* System errors */}
      <section>
        <h2 className="mb-3 text-lg font-bold">System errors</h2>
        {errors.length === 0 ? (
          <p className="text-muted">No errors logged — all clear. ✅</p>
        ) : (
          <ul className="space-y-2">
            {errors.map((e) => (
              <li key={e.id} className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-red-600">{e.context ?? "error"}</span>
                  <span className="text-xs text-muted">{fmtDateTime(e.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-muted">{e.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
