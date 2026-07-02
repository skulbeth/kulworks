"use client";

// A submit button that asks for confirmation before letting the form submit.
// Used for destructive/irreversible actions (deletes, sending a newsletter).
export default function ConfirmButton({
  message,
  children,
  className,
  disabled,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
