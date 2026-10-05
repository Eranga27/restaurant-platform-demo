import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while a page loads: a heading, a few lines and a grid of cards. */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 sm:px-6 lg:pt-14"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-12 w-2/3 max-w-md rounded-xl" />
        <Skeleton className="mt-5 h-4 w-full max-w-xl" />
        <Skeleton className="mt-2 h-4 w-5/6 max-w-lg" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border bg-card">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="space-y-2 p-5">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
