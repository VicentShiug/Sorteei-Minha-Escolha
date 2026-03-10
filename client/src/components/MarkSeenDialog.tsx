import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "./StarRating";
import { useUpdateItem } from "@/hooks/use-items";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";

interface ApiItem {
  externalId: string;
  createdAt: Date;
  listId: number;
  name: string;
  progress?: {
    externalId: string;
    createdAt: Date;
    userId: number;
    isSeen: boolean;
    rating: number | null;
    review: string | null;
    completedAt: Date | null;
  };
}

interface MarkSeenDialogProps {
  item: ApiItem | null;
  listId?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode?: boolean;
}

export function MarkSeenDialog({ item, listId, isOpen, onOpenChange, isEditMode = false }: MarkSeenDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState("");
  const updateItem = useUpdateItem(listId || "");
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen && isEditMode && item) {
      setRating(item.progress?.rating || 0);
      setReview(item.progress?.review || "");
    } else if (!isOpen) {
      setRating(0);
      setReview("");
    }
  }, [isOpen, isEditMode, item]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRating(0);
      setReview("");
    }
    onOpenChange(open);
  };

  const handleSubmit = () => {
    if (!item || !listId) return;

    const data = isEditMode
      ? {
          rating: rating > 0 ? rating : undefined,
          review: review.trim() || undefined,
        }
      : {
          isSeen: true,
          rating: rating > 0 ? rating : undefined,
          review: review.trim() || undefined,
        };

    updateItem.mutate(
      {
        id: item.externalId,
        data,
      },
      {
        onSuccess: () => {
          if (!isEditMode) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#171717', '#a3a3a3', '#e5e5e5']
            });
            toast({
              title: t('listDetails.markedAsCompleted'),
              description: t('listDetails.editItemSuccess', { name: item.name }),
            });
          } else {
            toast({
              title: t('listDetails.itemUpdated'),
              description: t('listDetails.editItemSuccess', { name: item.name }),
            });
          }
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
          <DialogTitle className="font-display text-2xl">{isEditMode ? "Edit Details" : "Mark as Done"}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {isEditMode ? (
              <>Update your notes for <span className="font-medium text-foreground">{item.name}</span></>
            ) : (
              <>You've completed <span className="font-medium text-foreground">{item.name}</span>. How was it?</>
            )}
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
            {updateItem.isPending ? "Saving..." : isEditMode ? "Save Changes" : "Save & Complete"}
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
