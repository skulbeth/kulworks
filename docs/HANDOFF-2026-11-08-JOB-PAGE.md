# HANDOFF 2026-11-08: one job page (quote link = everything)

Sam (11-08): "send everyone a quote link where everything is housed... when they click accept, their google drive
link, their invoice with payment option... their proofing link should also be on the quote". Review found the
quote / invoice / proof / folder pieces built over time duplicate each other and disagree.

## Sam's decisions (AskUserQuestion, 11-08, all = my recommendation)
1. No-proof jobs: invoice goes up ON ACCEPT. Proof jobs wait for Approve all.
   -> new `Invoice.proofFirst Boolean @default(true)` (quote checkbox "Sample proof before payment", ON by default;
   untick for 3D prints / tokens). Deliberate: default ON so a card job never gets billed before its sample.
2. Invoice lives INLINE on the job page. Any /invoice/<INV token>/ redirects to the job's hub page (?only=1 skips).
3. Auto-invoice EMAILS the client ("Your invoice is ready" + job link), from contact@, reply-to + BCC contact@.
4. Deposit / balance split KEPT.

## Review findings (what was wrong before)
1. Aaron Q-0001: $65 deposit recorded as a Payment but Q-0001 never marked PAID, INV-0005 (balance) had no
   sourceQuoteId -> his quote page still offered "Pay the 50% deposit". DATA FIX after deploy.
2. Drive folder in 2 places: quote page read Project.driveFolderUrl only; admin page + Send email read
   Submission.driveFolderUrl only (Scott's folder invisible in admin).
3. Quote->invoice copy existed twice (convertQuoteToInvoice DRAFT, ensureInvoiceForProject SENT); "main invoice of
   this quote" where-clause copied 5x.
4. Money owed computed twice with different rules (invoice page = sourceQuoteId-linked only; proof page = project).
5. Up to 3 links per job; admin Send emailed the INV link; auto-invoice emailed nobody.
6. No-proof jobs never auto-invoiced.
7. Accept copy promised "payment after sample" even on deposit quotes.
8. Emails inconsistent (reply-to gmail vs contact@, signed Sam vs Kulworks, no BCC, stale template).
9. Stage only moved on accept.
10. Mark paid defaulted to PayPal (Sam wants Venmo + Zelle only).

## The rules now (single sources of truth)
- `src/lib/job.ts` = THE job model: hub doc, payment rows, proofs, folder, steps. Used by the job page, proof page,
  admin. `mainInvoiceWhere(quoteId)` = the one "already invoiced" clause. `copyQuoteToInvoice` = the one copier.
- Folder: `jobFolderUrl()` = Project.driveFolderUrl, else the submission's (ensureProjectFolder adopts it on accept).
- Client emails: `sendToClient()` in src/lib/email.ts (reply-to + BCC contact@). Every one carries the job link.

## Progress log
- [x] schema + migration `20261108120000_quote_proof_first` (additive, default true; safe for the old code)
- [x] src/lib/job.ts (pickHub, payRows, mainInvoiceWhere, copyQuoteToInvoice, jobFolderUrl, loadJob, jobHubToken);
      src/lib/billing.ts DELETED (proof page used it; now lib/job.ts)
- [x] email.ts: bcc + sendToClient (reply-to + BCC contact@, env CLIENT_MAIL_BCC overrides)
- [x] auto-invoice: proofFirst rule + "Your invoice is ready" email; convertQuoteToInvoice uses copyQuoteToInvoice (DRAFT);
      markInvoicePaid guard = mainInvoiceWhere; paid up -> stage IN_PRODUCTION (from LEAD/QUOTED/APPROVED)
- [x] job page rewrite (src/app/invoice/[token]/page.tsx): steps strip, one next-action banner, quote doc, accept,
      SendFiles, "Your proof" (placeholder until uploaded), #pay "Invoice and payment" rows w/ Venmo/Zelle inline,
      ship-to form, Message Sam. SENT/PAID invoice tokens redirect to hub#pay; ?only=1 = printable single doc.
- [x] proof page: Payment block -> "Your invoice is ready: $X / Pay on my job page" + "Back to your job page"
- [x] admin project page: Job page link + Copy, Client folder (Open / "Make + share folder" -> makeProjectFolder),
      "with Drive folder" checkbox removed, Mark paid defaults Venmo, QuoteLine says when the invoice goes up;
      editor: "Sample proof before payment" checkbox (quotes), due date no longer wiped on draft save
- [x] Send email (sendInvoiceDoc) rewritten: quote = job page + Looks good + numbered steps (if proofFirst);
      invoice = amount + Venmo/Zelle on job page; paid = receipt. Proof email + project update + started + client email
      all go through sendToClient; proof email + project update add the job page link.
- [x] submission -> project (convert + quoteFromSubmission) copies the submission's folder onto the project;
      ensureProjectFolder adopts only this job's submission folder (or an unattached one), never another job's
- [x] tsc + build clean; pure tests 17/17 (scratchpad harness/pure.test.mjs)
- [ ] Sam runs db:deploy; DB e2e test; push; data fix Aaron; verify live
