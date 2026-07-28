"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-neutral-400">
        Something went wrong loading this page.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
      >
        Try again
      </button>
    </div>
  );
}
