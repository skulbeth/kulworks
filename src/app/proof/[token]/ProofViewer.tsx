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

      {message && (
        <p className="mt-4 rounded-lg border border-border bg-surface2 px-4 py-2 text-sm" role="status">
          {message}
        </p>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((it, i) => {
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
                <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {it.label}
                </span>
                {it.approved && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-green-600 px-1.5 py-0.5 text-xs font-bold text-white">✓</span>
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
          onMove={(d) => setOpen((o) => (o === null ? o : (o + d + items.length) % items.length))}
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

  // New card: start on its front, with no half-written note carried over.
  useEffect(() => {
    setSide(item.front ? "front" : "back");
    setPin(null);
    setDraft("");
    setError(null);
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

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onMove(1);
      if (e.key === "ArrowLeft") onMove(-1);
      if (e.key.toLowerCase() === "f") setSide((s) => (s === "front" ? "back" : "front"));
    },
    [onClose, onMove]
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

  const save = () =>
    start(async () => {
      const r = await addProofNote({ token, itemId: item.id, side, x: pin?.x ?? null, y: pin?.y ?? null, body: draft });
      if (!r.ok) return setError(r.error);
      setDraft("");
      setPin(null);
      router.refresh();
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
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6" style={{ background: "rgba(10,10,12,0.9)" }} role="dialog" aria-modal="true">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onMove(-1)} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20" aria-label="Previous card">←</button>
            <span className="text-sm font-semibold">Card {item.label} · {index + 1} of {count}</span>
            <button type="button" onClick={() => onMove(1)} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20" aria-label="Next card">→</button>
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
            <button type="button" onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20" aria-label="Close">✕</button>
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
              onClick={save}
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
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(10,10,12,0.9)" }} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-5">
        <h2 className="text-lg font-bold">Set real size</h2>
        <p className="mt-1 text-sm text-muted">
          Hold any bank card or ID card against the screen and move the slider until the outline matches it.
          After that, cards show at their true printed size on this device.
        </p>
        <div className="my-5 flex justify-center overflow-hidden">
          <div
            className="rounded-[0.125in] border-2 border-dashed border-blue bg-blue/5"
            style={{ width: BANK_CARD.w * v, height: BANK_CARD.h * v, borderRadius: 0.125 * v }}
          />
        </div>
        <input
          type="range"
          min={50}
          max={300}
          step={0.5}
          value={v}
          onChange={(e) => setV(Number(e.target.value))}
          className="w-full"
          aria-label="Screen size adjustment"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Cancel</button>
          <button
            type="button"
            onClick={() => {
              onSave(v);
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
