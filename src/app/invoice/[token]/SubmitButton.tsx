"use client";

import { useFormStatus } from "react-dom";

// The page's forms post to server actions that also email Sam, which takes a few
// seconds. Without feedback a client taps again or assumes it did nothing.
export default function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} disabled:opacity-60`}>
      {pending ? pendingText : children}
    </button>
  );
}
