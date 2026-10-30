"use client";

// The client's side of a proof: a grid of every card, and a viewer that shows one
// card at real size, flips it, and lets them pin a note on the spot they mean.
//
// Real size needs the screen's pixels-per-inch, which a browser cannot know, so the
// client matches an on-screen outline to a real bank card once and we remember it.
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addProofNote,
  deleteProofNote,
  setProofItemApproved,
  sendProofNotes,
  approveWholeProof,
} from "./actions";

export type ViewerNote = {
  id: string;
  side: "front" | "back";
  x: number | null;
  y: number | null;
  body: string;
  fromClient: boolean;
  sent: boolean;
  done: boolean;
};

export type ViewerItem = {
  id: string;
  label: string;
  front: string | null;
  back: string | null;
  approved: boolean;
  updated: boolean; // a new version since the client last approved or commented on it
  notes: ViewerNote[];
};

const PPI_KEY = "kw-proof-ppi";
const DEFAULT_PPI = 96; // the CSS inch; right on many desktop screens, wrong on most phones
const BANK_CARD = { w: 3.37, h: 2.125 }; // ISO ID-1, the one object everyone has

function readPpi(): number | null {
  try {
    const v = Number(localStorage.getItem(PPI_KEY));
    return Number.isFinite(v) && v >= 40 && v <= 400 ? v : null;
  } catch {
    return null;
  }
}

export default function ProofViewer({
  token,
  title,
  clientName,
  widthIn,
  heightIn,
  approved,
  items,
}: {
  token: string;
  title: string;
  clientName: string;
  widthIn: number;
  heightIn: number;
  approved: boolean;
  items: ViewerItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<number | null>(null);
  const [ppi, setPpi] = useState<number>(DEFAULT_PPI);
  const [calibrated, setCalibrated] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [onlyUpdated, setOnlyUpdated] = useState(false);

  useEffect(() => {
    const saved = readPpi();
    if (saved) {
      setPpi(saved);
      setCalibrated(true);
    }
  }, []);

  const unsent = useMemo(
    () => items.reduce((n, i) => n + i.notes.filter((c) => c.fromClient && !c.sent).length, 0),
    [items]
  );
  const approvedCount = items.filter((i) => i.approved).length;
  const updatedCount = items.filter((i) => i.updated).length;
  // Indexes into `items` that the grid shows; the viewer steps through these. "Card N"
  // stays the card's place in the whole deck, filtered or not.
  const shown = useMemo(
    () => items.map((it, i) => ({ it, i })).filter(({ it }) => !onlyUpdated || it.updated).map(({ i }) => i),
    [items, onlyUpdated]
  );
  useEffect(() => {
    if (onlyUpdated && updatedCount === 0) setOnlyUpdated(false);
  }, [onlyUpdated, updatedCount]);

  const savePpi = (v: number) => {
    setPpi(v);
    setCalibrated(true);
    try {
      localStorage.setItem(PPI_KEY, String(v));
    } catch {
      /* private window: works for this visit only */
    }
  };

  const send = () =>
    start(async () => {
      const r = await sendProofNotes(token);
      setMessage(r.ok ? `Sent ${r.count} note(s) to Kulworks. Thank you!` : r.error);
      router.refresh();
    });

  const approveAll = () => {
    if (!confirm("Approve every card as it is now? Kulworks will be notified.")) return;
    start(async () => {
      const r = await approveWholeProof(token);
      setMessage(r.ok ? "Approved. Kulworks has been notified." : r.error);
      router.refresh();
    });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Card proof for {clientName}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted">
            {items.length} cards · {approvedCount} approved
            {updatedCount > 0 && ` · ${updatedCount} updated`}
            {approved && <span className="ml-2 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-bold text-green-600">Approved</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCal(true)}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue"
          >
            {calibrated ? "Adjust real size" : "Set real size"}
          </button>
          <button
            type="button"
            disabled={pending || unsent === 0}
            onClick={send}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue disabled:opacity-40"
          >
            Send my notes{unsent ? ` (${unsent})` : ""}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={approveAll}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover disabled:opacity-40"
          >
            Approve all
          </button>
        </div>
      </header>

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>Click a card to see it up close. Use Flip to see the back.</li>
        <li>Click the spot you want changed and write what it should say.</li>
        <li>When you&apos;re done, press <b>Send my notes</b>. Press <b>Approve all</b> when everything looks right.</li>
      </ol>

      {updatedCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm">
          <span>
            <b>{updatedCount}</b> card{updatedCount === 1 ? " has" : "s have"} been updated since you last looked.
          </span>
          <button
            type="button"
            onClick={() => setOnlyUpdated((v) => !v)}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-black hover:bg-primary-hover"
          >
            {onlyUpdated ? "Show all cards" : "Show only updated"}
          </button>
        </div>
      )}

      {message && (
        <p className="mt-4 rounded-lg border border-border bg-surface2 px-4 py-2 text-sm" role="status">
          {message}
        </p>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {shown.map((i) => {
          const it = items[i];
          const notes = it.notes.filter((n) => n.fromClient && !n.done).length;
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="group relative block w-full overflow-hidden rounded-lg border border-border bg-surface2 text-left hover:border-blue"
              >
                {it.front || it.back ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(it.front ?? it.back)!}
                    alt={`Card ${it.label}`}
                    loading="lazy"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="block w-full select-none"
                    style={{ aspectRatio: `${widthIn} / ${heightIn}`, objectFit: "contain" }}
                  />
                ) : null}
                {it.approved && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-green-600 px-1.5 py-0.5 text-xs font-bold text-white">✓</span>
                )}
                {it.updated && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-black">Updated</span>
                )}
                {notes > 0 && (
                  <span className="absolute bottom-1.5 right-1.5 rounded-full bg-blue px-2 py-0.5 text-xs font-bold text-white">
                    {notes} note{notes > 1 ? "s" : ""}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {open !== null && items[open] && (
        <CardViewer
          token={token}
          item={items[open]}
          index={open}
          count={items.length}
          widthIn={widthIn}
          heightIn={heightIn}
          ppi={ppi}
          calibrated={calibrated}
          onCalibrate={() => setShowCal(true)}
          onClose={() => setOpen(null)}
          onMove={(d) =>
            setOpen((o) => {
              if (o === null) return o;
              const at = shown.indexOf(o);
              if (at < 0) return shown[0] ?? null;
              return shown[(at + d + shown.length) % shown.length];
            })
          }
        />
      )}

      {showCal && <Calibrator ppi={ppi} onSave={savePpi} onClose={() => setShowCal(false)} />}
    </main>
  );
}

function CardViewer({
  token,
  item,
  index,
  count,
  widthIn,
  heightIn,
  ppi,
  calibrated,
  onCalibrate,
  onClose,
  onMove,
}: {
  token: string;
  item: ViewerItem;
  index: number;
  count: number;
  widthIn: number;
  heightIn: number;
  ppi: number;
  calibrated: boolean;
  onCalibrate: () => void;
  onClose: () => void;
  onMove: (delta: number) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [side, setSide] = useState<"front" | "back">(item.front ? "front" : "back");
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fit, setFit] = useState(false);
  const [view, setView] = useState({ w: 1200, h: 800 });
  // A typed-but-not-added note stops close/next/prev and asks first.
  const [leaving, setLeaving] = useState<null | (() => void)>(null);

  // New card: start on its front, with no half-written note carried over.
  useEffect(() => {
    setSide(item.front ? "front" : "back");
    setPin(null);
    setDraft("");
    setError(null);
    setLeaving(null);
  }, [item.id, item.front]);

  // Warm both sides so Flip is instant. Without this the browser keeps painting the
  // old side until the new image arrives, so the back can briefly show the front.
  useEffect(() => {
    for (const u of [item.front, item.back]) if (u) new Image().src = u;
  }, [item.front, item.back]);

  useEffect(() => {
    const measure = () => setView({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const guard = useCallback(
    (go: () => void) => {
      if (draft.trim()) setLeaving(() => go);
      else go();
    },
    [draft]
  );
  const close = useCallback(() => guard(onClose), [guard, onClose]);
  const move = useCallback((d: number) => guard(() => onMove(d)), [guard, onMove]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (document.querySelector("[data-calibrator]")) return; // the size popup on top handles its own keys
      // Escape works even while typing; the unsaved-note check still applies.
      if (e.key === "Escape") return close();
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
      if (e.key.toLowerCase() === "f") setSide((s) => (s === "front" ? "back" : "front"));
    },
    [close, move]
  );
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  // Real size unless it can't fit, then the biggest that does (and say so).
  const realW = widthIn * ppi;
  const realH = heightIn * ppi;
  const maxW = Math.max(160, view.w - 48);
  const maxH = Math.max(200, view.h - 260);
  const scale = Math.min(1, maxW / realW, maxH / realH);
  const shrunk = scale < 0.999;
  const useScale = fit ? Math.min(maxW / realW, maxH / realH) : scale;
  const dispW = realW * useScale;
  const dispH = realH * useScale;

  const src = side === "front" ? item.front : item.back;
  const notes = item.notes.filter((n) => n.side === side);
  const pinned = notes.filter((n) => n.x !== null && n.y !== null);
  const allNotes = item.notes;

  const place = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPin({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    setError(null);
  };

  const save = (then?: () => void) =>
    start(async () => {
      const r = await addProofNote({ token, itemId: item.id, side, x: pin?.x ?? null, y: pin?.y ?? null, body: draft });
      if (!r.ok) {
        setLeaving(null);
        return setError(r.error);
      }
      setDraft("");
      setPin(null);
      setLeaving(null);
      router.refresh();
      then?.();
    });

  const remove = (id: string) =>
    start(async () => {
      await deleteProofNote(token, id);
      router.refresh();
    });

  const toggleApproved = () =>
    start(async () => {
      await setProofItemApproved(token, item.id, !item.approved);
      router.refresh();
    });

  const pinNumber = (id: string) => pinned.findIndex((n) => n.id === id) + 1;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6"
      style={{ background: "rgba(10,10,12,0.9)" }}
      role="dialog"
      aria-modal="true"
      // Tap or click the dark area around the card to close.
      onClick={(e) => {
        if ((e.target as HTMLElement).dataset.backdrop) close();
      }}
      data-backdrop="1"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3" data-backdrop="1">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => move(-1)} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20" aria-label="Previous card">←</button>
            {/* Position, not the file key: the key is an export index ("26") that
                rarely matches the number printed on the card ("22"). */}
            <span className="text-sm font-semibold">Card {index + 1} of {count}</span>
            {item.updated && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-black">Updated</span>}
            <button type="button" onClick={() => move(1)} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20" aria-label="Next card">→</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {item.front && item.back && (
              <button type="button" onClick={() => setSide((s) => (s === "front" ? "back" : "front"))} className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black">
                Flip to {side === "front" ? "back" : "front"}
              </button>
            )}
            <button type="button" onClick={() => setFit((f) => !f)} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
              {fit ? "Real size" : "Fit to screen"}
            </button>
            <button type="button" onClick={close} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20" aria-label="Close">✕</button>
          </div>
        </div>

        <p className="text-xs text-white/70">
          {side === "front" ? "Front" : "Back"} ·{" "}
          {fit
            ? "fit to your screen"
            : shrunk
            ? "shrunk to fit your screen"
            : calibrated
            ? `real size (${widthIn} x ${heightIn} in)`
            : "approximate size"}
          {!calibrated && !fit && (
            <>
              {" · "}
              <button type="button" onClick={onCalibrate} className="underline">set real size</button>
            </>
          )}
        </p>

        <div
          className="relative cursor-crosshair select-none overflow-hidden rounded-xl bg-white shadow-2xl"
          style={{ width: dispW, height: dispH }}
          onClick={place}
          onContextMenu={(e) => e.preventDefault()}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={`Card ${item.label} ${side}`} draggable={false} className="pointer-events-none block h-full w-full" />
          ) : (
            <p className="p-6 text-center text-sm text-black/60">No {side} for this card.</p>
          )}
          {pinned.map((n) => (
            <span
              key={n.id}
              className={`pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white ${n.done ? "bg-green-600" : "bg-blue"}`}
              style={{ left: `${n.x! * 100}%`, top: `${n.y! * 100}%` }}
            >
              {pinNumber(n.id)}
            </span>
          ))}
          {pin && (
            <span
              className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-red-500 bg-red-500/20"
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
            />
          )}
        </div>

        <div className="w-full max-w-xl rounded-xl bg-surface p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {pin ? "Note for the spot you marked" : "Click the card to mark a spot, or write a note for the whole card"}
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={toggleApproved}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${item.approved ? "bg-green-600 text-white" : "border border-border hover:border-green-600 hover:text-green-600"}`}
            >
              {item.approved ? "✓ Approved" : "Approve this card"}
            </button>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder='e.g. Replace the text here with: "..."'
            className="mt-2 w-full rounded-lg border border-border bg-surface2 px-3 py-2 focus:border-blue focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={pending || !draft.trim()}
              onClick={() => save()}
              className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover disabled:opacity-40"
            >
              Add note
            </button>
            {pin && (
              <button type="button" onClick={() => setPin(null)} className="text-xs text-muted hover:underline">
                Clear the mark
              </button>
            )}
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
          {leaving && (
            <div className="mt-3 rounded-lg border border-primary bg-primary/10 p-3" role="alert">
              <p className="font-semibold">You have a note you haven&apos;t added yet. Add it before you go?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={pending} onClick={() => save(leaving)} className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-black hover:bg-primary-hover disabled:opacity-40">
                  Add note
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const go = leaving;
                    setDraft("");
                    setPin(null);
                    setLeaving(null);
                    go();
                  }}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold"
                >
                  Discard it
                </button>
                <button type="button" onClick={() => setLeaving(null)} className="px-2 text-xs text-muted hover:underline">
                  Keep writing
                </button>
              </div>
            </div>
          )}

          {allNotes.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-border pt-3">
              {allNotes.map((n) => (
                <li key={n.id} className={`rounded-lg px-3 py-2 ${n.fromClient ? "bg-surface2" : "border border-blue/40 bg-blue/5"}`}>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span>
                      {n.fromClient ? "You" : "Kulworks"} · {n.side}
                      {n.side === side && n.x !== null ? ` · mark ${pinNumber(n.id)}` : ""}
                    </span>
                    <span>
                      {n.done ? <b className="text-green-600">Done</b> : n.fromClient ? (n.sent ? "Sent" : "Not sent yet") : ""}
                      {n.fromClient && !n.sent && (
                        <button type="button" onClick={() => remove(n.id)} className="ml-2 text-red-600 hover:underline">Delete</button>
                      )}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Calibrator({ ppi, onSave, onClose }: { ppi: number; onSave: (v: number) => void; onClose: () => void }) {
  const [v, setV] = useState(ppi);
  // A bank card is wider than most phone screens, so stand it on end there.
  const [upright, setUpright] = useState(false);
  const [maxV, setMaxV] = useState(300);
  useEffect(() => {
    const check = () => {
      const up = window.innerWidth < BANK_CARD.w * 150;
      setUpright(up);
      // Room inside the popup (page padding + popup padding), so the outline never runs off it.
      // Phones run about 150-165 px per inch, so the padding there is kept thin to reach that.
      const room = window.innerWidth - (up ? 44 : 80);
      setMaxV(Math.max(100, Math.min(300, Math.floor(room / (up ? BANK_CARD.h : BANK_CARD.w)))));
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const boxW = (upright ? BANK_CARD.h : BANK_CARD.w) * v;
  const boxH = (upright ? BANK_CARD.w : BANK_CARD.h) * v;
  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto p-2 sm:p-4"
      style={{ background: "rgba(10,10,12,0.9)" }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-calibrator
    >
      <div className="mx-auto my-4 w-fit min-w-[min(100%,32rem)] max-w-full rounded-2xl bg-surface p-3 sm:p-5">
        <h2 className="text-lg font-bold">Set real size</h2>
        <p className="mt-1 max-w-md text-sm text-muted">
          Hold any bank card or ID card against the screen{upright ? ", standing up," : ""} and move the slider until
          the outline matches it. After that, cards show at their true printed size on this device.
        </p>
        <div className="my-5 flex justify-center">
          {/* shrink-0: never squash the outline to fit the popup, or it stops being card-shaped */}
          <div
            className="shrink-0 border-2 border-dashed border-blue bg-blue/5"
            style={{ width: boxW, height: boxH, borderRadius: 0.125 * v }}
          />
        </div>
        <input
          type="range"
          min={50}
          max={maxV}
          step={0.5}
          value={Math.min(v, maxV)}
          onChange={(e) => setV(Number(e.target.value))}
          className="w-full"
          aria-label="Screen size adjustment"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Cancel</button>
          <button
            type="button"
            onClick={() => {
              onSave(Math.min(v, maxV));
              onClose();
            }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
