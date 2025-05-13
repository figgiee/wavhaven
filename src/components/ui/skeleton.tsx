import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "animate-shimmer bg-[linear-gradient(110deg,theme(colors.neutral.700)_0%,theme(colors.neutral.600)_50%,theme(colors.neutral.700)_100%)] bg-[length:200%_100%] rounded-md",
        className
      )}
      {...props}
    />
  )
});
Skeleton.displayName = "Skeleton";

export { Skeleton }
