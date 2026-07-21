// Premium skeleton loaders — Foodpanda-style shimmer
export const StoreCardSkeleton = () => (
  <div className="bg-card rounded-2xl border overflow-hidden shadow-sm">
    <div className="w-full h-24 bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse" />
    <div className="p-2.5 space-y-2">
      <div className="h-3 rounded bg-muted animate-pulse w-3/4" />
      <div className="h-2.5 rounded bg-muted animate-pulse w-1/2" />
    </div>
  </div>
);

export const RestaurantCardSkeleton = () => (
  <div className="bg-card rounded-2xl border overflow-hidden shadow-sm">
    <div className="h-44 bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse" />
    <div className="p-4 space-y-2.5">
      <div className="h-4 rounded bg-muted animate-pulse w-2/3" />
      <div className="flex gap-2">
        <div className="h-5 w-14 rounded bg-muted animate-pulse" />
        <div className="h-5 w-16 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-3 rounded bg-muted animate-pulse w-1/2" />
    </div>
  </div>
);

export const StoreGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <StoreCardSkeleton key={i} />
    ))}
  </div>
);

export const RestaurantGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {Array.from({ length: count }).map((_, i) => (
      <RestaurantCardSkeleton key={i} />
    ))}
  </div>
);
