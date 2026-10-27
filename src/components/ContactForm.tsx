"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { services } from "@/data/services";
import { site } from "@/data/site";
import TurnstileWidget from "@/components/TurnstileWidget";
import ShippingWhy from "@/components/ShippingWhy";
import {
  DELIVERY_OPTIONS,
  CARD_BACK_OPTIONS,
  CARD_TYPES,
  FEES_NOTE,
  SUPER_RUSH_FEE,
  SUPER_RUSH_LABEL,
  SHIP_COUNTRIES,
  shipCountryOf,
  isTightDate,
  todayISO,
} from "@/lib/order-details";

type Status = "idle" | "submitting" | "success" | "error";

// Selectable project types: the main services, plus Card Design right after
// UV Card Printing (card design lives in the card-printing area, not as its own
// top-level service, but people should be able to request it directly).
const PROJECT_TYPES = services.flatMap((s) =>
  s.id === "card-printing"
    ? [
        { id: s.id, name: s.name },
        { id: "card-design", name: "Card Design & Prototyping" },
        { id: "prototype", name: "Prototype / playtest run" },
      ]
    : [{ id: s.id, name: s.name }]
);

// All selectable project types, including the "Something else" catch-all.
const TYPE_OPTIONS = [...PROJECT_TYPES, { id: "other", name: "Something else" }];

function FormInner() {
  const params = useSearchParams();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [delivery, setDelivery] = useState("");
  const [cardBacks, setCardBacks] = useState("");
  const [superRush, setSuperRush] = useState(false);
  const [shipCountry, setShipCountry] = useState("US");
  const [postal, setPostal] = useState("");
  const country = shipCountryOf(shipCountry) ?? SHIP_COUNTRIES[0];
  const isCardOrder = selectedTypes.some((t) => CARD_TYPES.includes(t));
  const tight = isTightDate(dueDate);

  // Pre-fill from the URL: ?type=card-printing,card-design and ?details=<summary>
  // (used by the "Request this" CTAs and the card cost estimator).
  useEffect(() => {
    const t = params.get("type");
    if (t) {
      const valid = t
        .split(",")
        .map((s) => s.trim())
        .filter((s) => TYPE_OPTIONS.some((o) => o.id === s));
      if (valid.length) setSelectedTypes(valid);
    }
    const d = params.get("details");
    if (d) setMessage(d);
    // The card calculator passes the due date and whether it priced super rush.
    if (params.get("rush") === "1") setSuperRush(true);
    // ...and where it's going, so the address starts half filled in.
    const ship = params.get("ship");
    if (ship === "pickup") setDelivery("pickup");
    else if (shipCountryOf(ship)) {
      setDelivery("ship");
      setShipCountry(ship as string);
      const zip = params.get("zip");
      if (zip) setPostal(zip.slice(0, 12));
    }
    const due = params.get("due");
    if (due && /^\d{4}-\d{2}-\d{2}$/.test(due)) setDueDate(due);
  }, [params]);

  const toggleType = (id: string) =>
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  function resetForm(form: HTMLFormElement) {
    form.reset();
    setSelectedTypes([]);
    setMessage("");
    setDueDate("");
    setDelivery("");
    setCardBacks("");
    setSuperRush(false);
    setShipCountry("US");
    setPostal("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    setStatus("submitting");
    try {
      const res = await fetch("/api/quote/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          projectType: fd.get("projectType"),
          message: fd.get("message"),
          reference: fd.get("reference"),
          driveFolder: fd.get("driveFolder") === "yes",
          dueDate: dueDate || null,
          deliveryMethod: delivery || null,
          shipStreet: fd.get("shipStreet"),
          shipCity: fd.get("shipCity"),
          shipState: fd.get("shipState"),
          shipPostalCode: fd.get("shipPostalCode"),
          shipCountry: delivery === "ship" ? shipCountry : null,
          cardBacks: isCardOrder ? cardBacks || null : null,
          superRush,
          company_website: fd.get("company_website"), // honeypot
          turnstileToken,
          sessionId: (() => {
            try {
              return sessionStorage.getItem("kw_sid");
            } catch {
              return null;
            }
          })(),
        }),
      });
      if (res.ok) {
        setStatus("success");
        resetForm(form);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const field =
    "w-full rounded-lg border border-border bg-surface2 px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
  const label = "mb-1.5 block text-sm font-semibold";

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-primary/40 bg-surface p-8 text-center">
        <div className="text-4xl">✅</div>
        <h3 className="mt-3 text-xl font-bold">Thanks, your request is in!</h3>
        <p className="mt-2 text-muted">
          We&apos;ve sent a confirmation to your email. We&apos;ll respond as soon as we
          can with next steps and any questions we may have to clarify your request before
          sending a quote.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-5 rounded-full border border-border px-5 py-2 font-semibold hover:border-blue hover:text-blue"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot: hidden from humans; bots that fill it are silently dropped. */}
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="name">Name</label>
          <input id="name" name="name" required className={field} placeholder="Your name" />
        </div>
        <div>
          <label className={label} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className={field} placeholder="Your email" />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="phone">
          Phone <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className={field}
          placeholder="So we can text or call about your project"
        />
      </div>

      <fieldset>
        <legend className={label}>What do you need? (select all that apply)</legend>
        <div className="grid gap-2 rounded-lg border border-border bg-surface2 p-4 sm:grid-cols-2">
          {TYPE_OPTIONS.map((p) => (
            <label key={p.id} className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-primary"
                checked={selectedTypes.includes(p.id)}
                onChange={() => toggleType(p.id)}
              />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
        {/* Submitted as a single, readable field */}
        <input type="hidden" name="projectType" value={selectedTypes.join(", ")} />
      </fieldset>

      <div>
        <label className={label} htmlFor="message">Project details</label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className={field}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your project: quantities, sizes, timeline, and anything else that helps us quote it."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="dueDate">
            When do you need it in hand? <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="dueDate"
            type="date"
            min={todayISO()}
            className={field}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {tight && !superRush && (
            <p className="mt-1.5 text-xs font-semibold text-gold">
              That&apos;s tight. Add super rush below to move to the front of the queue.
            </p>
          )}
        </div>
        <fieldset>
          <legend className={label}>How should we get it to you?</legend>
          <div className="space-y-2 rounded-lg border border-border bg-surface2 p-3">
            {DELIVERY_OPTIONS.map((o) => (
              <label key={o.id} className="flex items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value={o.id}
                  required
                  className="h-4 w-4 shrink-0 accent-primary"
                  checked={delivery === o.id}
                  onChange={() => setDelivery(o.id)}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {delivery === "ship" && (
        <fieldset className="space-y-3">
          <legend className={`${label} flex items-baseline`}>
            Shipping address <ShippingWhy />
          </legend>
          <select
            name="shipCountry"
            aria-label="Country"
            autoComplete="country"
            className={field}
            value={shipCountry}
            onChange={(e) => {
              setShipCountry(e.target.value);
              setPostal(""); // a US ZIP means nothing once Canada is picked
            }}
          >
            {SHIP_COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <input name="shipStreet" required autoComplete="street-address" className={field} placeholder="Street address" />
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <input name="shipCity" required autoComplete="address-level2" className={field} placeholder="City" />
            <input name="shipState" required autoComplete="address-level1" className={field} placeholder={shipCountry === "US" ? "State" : "State / province"} />
            <input
              name="shipPostalCode"
              required
              autoComplete="postal-code"
              inputMode={shipCountry === "US" ? "numeric" : "text"}
              className={field}
              placeholder={shipCountry === "US" ? "ZIP" : "Postal code"}
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted">
            Estimated shipping to {country.label}:{" "}
            <span className="font-semibold text-foreground">{country.estimate}</span>{" "}for a run of
            about 120 cards. The exact amount goes on your invoice. We can&apos;t ship outside the
            US, Canada and Mexico.
          </p>
        </fieldset>
      )}

      {isCardOrder && (
        <fieldset>
          <legend className={label}>Card backs</legend>
          <div className="grid gap-2 rounded-lg border border-border bg-surface2 p-3 sm:grid-cols-2">
            {CARD_BACK_OPTIONS.map((o) => (
              <label key={o.id} className="flex items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="cardBacks"
                  value={o.id}
                  required
                  className="h-4 w-4 shrink-0 accent-primary"
                  checked={cardBacks === o.id}
                  onChange={() => setCardBacks(o.id)}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
          {cardBacks === "different" && (
            <p className="mt-1.5 text-xs text-muted">
              When you upload, please label each back clearly so it&apos;s obvious which front it
              goes with (for example &quot;Card 12 front&quot; and &quot;Card 12 back&quot;).
            </p>
          )}
        </fieldset>
      )}

      <label className="flex items-start gap-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          checked={superRush}
          onChange={(e) => setSuperRush(e.target.checked)}
        />
        <span>
          <strong className="text-foreground">{SUPER_RUSH_LABEL}</strong>{" "}
          <span className="text-muted">(+${SUPER_RUSH_FEE} flat)</span>
        </span>
      </label>

      <p className="rounded-lg border border-border bg-surface2 px-4 py-3 text-xs text-muted">
        {FEES_NOTE}
      </p>

      <div>
        <label className={label} htmlFor="reference">Reference / artwork (optional)</label>
        <input
          id="reference"
          name="reference"
          type="text"
          className={field}
          placeholder="Paste a link to your artwork or references."
        />
        <p className="mt-1.5 text-xs text-muted">
          Have a lot of files? Use the shared folder option below.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface2 px-4 py-3">
        <input
          id="driveFolder"
          name="driveFolder"
          type="checkbox"
          value="yes"
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <label htmlFor="driveFolder" className="text-sm text-muted">
          Set me up a shared Google Drive folder to exchange files. We&apos;ll send you
          the link to drop in artwork and project files.
        </label>
      </div>

      {status === "error" && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          Something went wrong sending your message. Please email{" "}
          <a href={`mailto:${site.email}`} className="underline">{site.email}</a> instead.
        </p>
      )}

      <TurnstileWidget onToken={setTurnstileToken} />

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full bg-primary px-6 py-4 text-lg font-bold text-black transition-all hover:bg-primary-hover hover:shadow-glow disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" ? "Sending…" : "Request a Quote"}
      </button>
    </form>
  );
}

export default function ContactForm() {
  return (
    <Suspense fallback={<div className="text-muted">Loading form…</div>}>
      <FormInner />
    </Suspense>
  );
}
