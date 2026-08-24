import { Skeleton } from "@/components/ui/skeleton";
import { surfaceClass } from "@/components/surface";
import { cn } from "@/lib/utils";

function CommunityPostSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        surfaceClass,
        "flex min-w-0 flex-col",
        compact ? "h-full p-3.5 sm:p-4" : "p-5 sm:px-6 sm:py-5"
      )}
    >
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className={cn("mt-3 h-16 w-full", compact && "h-12")} />
      {compact ? (
        <Skeleton className="mt-3 aspect-4/3 w-full rounded-lg" />
      ) : (
        <Skeleton className="mt-4 h-40 w-full rounded-lg" />
      )}
    </div>
  );
}

export function CommunityFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="flex flex-col gap-5"
      aria-busy="true"
      aria-label="Loading posts"
    >
      {Array.from({ length: count }, (_, index) => (
        <CommunityPostSkeleton key={index} />
      ))}
    </div>
  );
}

export function CommunitySliderSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading posts"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <CommunityPostSkeleton key={index} compact />
      ))}
    </div>
  );
}
