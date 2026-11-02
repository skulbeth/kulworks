"use client";

// The browser's own print dialog has "Save as PDF" on every platform, and the print
// stylesheet strips the page down to the document itself.
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue print:hidden"
    >
      Save as PDF / Print
    </button>
  );
}
