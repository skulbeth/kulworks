import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import ConfirmButton from "../_components/ConfirmButton";
import TwoFactorSetup from "../_components/TwoFactorSetup";
import {
  inviteTeammate,
  createAdmin,
  updateAdmin,
  resetAdminPassword,
  deactivateAdmin,
  reactivateAdmin,
  changeOwnPassword,
} from "../_actions";

export const dynamic = "force-dynamic";

const DONE_MSG: Record<string, string> = {
  created: "Admin created. They can log in now with the password you set.",
  updated: "Admin updated.",
  reset: "Password reset.",
  deactivated: "Admin deactivated — access revoked, record kept. Reactivate anytime.",
  reactivated: "Admin reactivated — they can log in again.",
  mypassword: "Your password has been changed.",
};

const ERROR_MSG: Record<string, string> = {
  perm: "Only an owner can manage admins.",
  missing: "Please fill in all the required fields.",
  weak: "Password must be at least 8 characters.",
  create: "Couldn't create that admin. The email may already be in use.",
  update: "Couldn't apply that change. Try again.",
  notfound: "That admin no longer exists.",
  self: "You can't remove your own account.",
  lastowner: "You can't remove or demote the only owner.",
  invite: "Couldn't send the invite.",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string; done?: string; error?: string }>;
}) {
  const { invited, done, error } = await searchParams;
  const { profile } = await requireProfile();
  const isOwner = profile.role === "OWNER";

  const [members, audit, errors] = await Promise.all([
    prisma.profile.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const activeOwnerCount = members.filter((m) => m.role === "OWNER" && !m.deactivatedAt).length;

  const field =
    "rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none";
  const btn = "rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover";
  const btnGhost =
    "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Team</h1>

      {(invited || done) && (
        <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-600">
          {invited ? "Invite sent. They'll get an email to set their password." : DONE_MSG[done!] ?? "Done."}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {ERROR_MSG[error] ?? "Something went wrong."}
        </p>
      )}

      {/* Members */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Members ({members.length})</h2>
        <ul className="space-y-2">
          {members.map((m) => {
            const isSelf = m.id === profile.id;
            return (
              <li key={m.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{m.name ?? m.email}</span>
                  {isSelf && <span className="text-xs text-blue">(you)</span>}
                  <span className="text-sm text-muted">{m.email}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      m.role === "OWNER" ? "bg-gold/15 text-gold" : "bg-surface2 text-muted"
                    }`}
                  >
                    {m.role}
                  </span>
                  {m.deactivatedAt && (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600">
                      Deactivated
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted">since {fmtDate(m.createdAt)}</span>
                </div>

                {isOwner && (
                  <details className="group mt-2">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-blue">
                      Manage
                    </summary>
                    <div className="mt-3 space-y-4 border-t border-border pt-3">
                      {/* Email + role */}
                      <form action={updateAdmin} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={m.id} />
                        <label className="text-xs text-muted">
                          Email
                          <input name="email" type="email" defaultValue={m.email} className={`mt-1 block ${field}`} />
                        </label>
                        <label className="text-xs text-muted">
                          Role
                          <select name="role" defaultValue={m.role} className={`mt-1 block ${field}`}>
                            <option value="STAFF">Staff</option>
                            <option value="OWNER">Owner</option>
                          </select>
                        </label>
                        <button className={btn}>Save</button>
                      </form>

                      {/* Reset password */}
                      <form action={resetAdminPassword} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={m.id} />
                        <label className="text-xs text-muted">
                          New password
                          <input
                            name="password"
                            type="password"
                            minLength={8}
                            required
                            placeholder="at least 8 characters"
                            className={`mt-1 block w-56 ${field}`}
                          />
                        </label>
                        <button className={btnGhost}>Reset password</button>
                      </form>

                      {/* Deactivate (soft) / reactivate */}
                      {!isSelf &&
                        (m.deactivatedAt ? (
                          <form action={reactivateAdmin}>
                            <input type="hidden" name="id" value={m.id} />
                            <button className={btnGhost}>Reactivate access</button>
                          </form>
                        ) : (
                          !(m.role === "OWNER" && activeOwnerCount <= 1) && (
                            <form action={deactivateAdmin}>
                              <input type="hidden" name="id" value={m.id} />
                              <ConfirmButton
                                message={`Deactivate ${m.email}? They lose access, but the record is kept — you can reactivate anytime.`}
                                className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10"
                              >
                                Deactivate access
                              </ConfirmButton>
                            </form>
                          )
                        ))}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Add / invite (owner only) */}
      {isOwner ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-lg font-bold">Add an admin</h2>
            <form action={createAdmin} className="space-y-2">
              <input name="name" placeholder="Name (optional)" className={`w-full ${field}`} />
              <input name="email" type="email" required placeholder="their@email.com" className={`w-full ${field}`} />
              <input
                name="password"
                type="password"
                minLength={8}
                required
                placeholder="Initial password (8+ characters)"
                className={`w-full ${field}`}
              />
              <select name="role" defaultValue="STAFF" className={`w-full ${field}`}>
                <option value="STAFF">Staff</option>
                <option value="OWNER">Owner</option>
              </select>
              <button className={btn}>Create admin</button>
            </form>
            <p className="mt-2 text-xs text-muted">
              Creates the login immediately with the password you set. Share it with them, and
              they can change it under &quot;Change my password.&quot;
            </p>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-lg font-bold">Or invite by email</h2>
            <form action={inviteTeammate} className="space-y-2">
              <input name="email" type="email" required placeholder="their@email.com" className={`w-full ${field}`} />
              <select name="role" defaultValue="STAFF" className={`w-full ${field}`}>
                <option value="STAFF">Staff</option>
                <option value="OWNER">Owner</option>
              </select>
              <button className={btnGhost}>Send invite</button>
            </form>
            <p className="mt-2 text-xs text-muted">
              Sends an email with a link to set their own password.
            </p>
          </section>
        </div>
      ) : (
        <p className="text-sm text-muted">Only owners can add or manage admins.</p>
      )}

      {/* Change my password (everyone) */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">Change my password</h2>
        <form action={changeOwnPassword} className="flex flex-wrap items-end gap-2">
          <input
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="New password (8+ characters)"
            className={`w-64 ${field}`}
          />
          <button className={btn}>Update password</button>
        </form>
      </section>

      {/* Two-factor authentication (everyone, per-account) */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">Two-factor authentication</h2>
        <TwoFactorSetup />
      </section>

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
                    <td className="px-3 py-2 text-muted">{a.detail ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Backups */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-lg font-bold">Backups</h2>
        <p className="mb-3 text-sm text-muted">
          A full data backup is emailed to you every Monday. You can also download one now:
        </p>
        <a
          href="/api/admin/backup/"
          className="inline-block rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue"
        >
          Download backup (JSON)
        </a>
      </section>

      {/* System errors */}
      <section>
        <h2 className="mb-3 text-lg font-bold">System errors</h2>
        {errors.length === 0 ? (
          <p className="text-muted">No errors logged. All clear. ✅</p>
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
