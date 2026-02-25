import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "./StarRating";
import { useUpdateItem } from "@/hooks/use-items";
import { useToast } from "@/hooks/use-toast";
import type { Item } from "@shared/schema";
import confetti from "canvas-confetti";

interface MarkSeenDialogProps {
  item: Item | null;
  listId?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarkSeenDialog({ item, listId, isOpen, onOpenChange }: MarkSeenDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState("");
  const updateItem = useUpdateItem(listId || "");
  const { toast } = useToast();

  // Reset state when dialog opens for a new item
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRating(0);
      setReview("");
    }
    onOpenChange(open);
  };

  const handleSubmit = () => {
    if (!item || !listId) return;

    updateItem.mutate(
      {
        id: item.externalId,
        data: {
          isSeen: true,
          rating: rating > 0 ? rating : undefined,
          review: review.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#171717', '#a3a3a3', '#e5e5e5'] // Minimal monochrome confetti
          });
          toast({
            title: "Marked as completed",
            description: `You finished "${item.name}"!`,
          });
          handleOpenChange(false);
        },
      }
    );
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-none minimal-shadow-hover">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Mark as Done</DialogTitle>
          <DialogDescription className="text-base mt-2">
            You've completed <span className="font-medium text-foreground">{item.name}</span>. How was it?
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Your Rating</Label>
            <StarRating rating={rating} onRatingChange={setRating} size="lg" />
          </div>

          <div className="space-y-3">
            <Label htmlFor="review" className="text-muted-foreground font-medium uppercase tracking-wider text-xs">
              Notes & Review (Optional)
            </Label>
            <Textarea
              id="review"
              placeholder="What did you think about it?"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="resize-none h-32 rounded-xl bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:border-primary transition-colors"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between flex-row-reverse">
          <Button 
            onClick={handleSubmit} 
            disabled={updateItem.isPending}
            className="rounded-xl px-8 h-12"
          >
            {updateItem.isPending ? "Saving..." : "Save & Complete"}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => handleOpenChange(false)}
            className="rounded-xl h-12 text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
