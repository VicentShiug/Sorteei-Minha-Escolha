import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({ rating, onRatingChange, readOnly = false, size = "md" }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onRatingChange?.(star)}
          className={cn(
            "transition-all duration-200 focus:outline-none rounded-full",
            readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95",
            !readOnly && "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              star <= rating
                ? "fill-primary text-primary"
                : "fill-transparent text-muted-foreground/30"
            )}
            strokeWidth={star <= rating ? 1 : 1.5}
          />
        </button>
      ))}
    </div>
  );
}
