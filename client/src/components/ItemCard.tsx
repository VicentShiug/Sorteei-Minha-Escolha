import { useState } from "react";
import { Check, Trash2, Edit3, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { useDeleteItem, useUpdateItem } from "@/hooks/use-items";
import type { Item } from "@shared/schema";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ItemCardProps {
  item: Item;
  listExternalId: string;
  onMarkSeenClick: (item: Item) => void;
}

export function ItemCard({ item, listExternalId, onMarkSeenClick }: ItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteItem = useDeleteItem(listExternalId);
  const updateItem = useUpdateItem(listExternalId);

  const handleDelete = () => {
    setIsDeleting(true);
    deleteItem.mutate(item.externalId);
  };

  const handleUnmark = () => {
    updateItem.mutate({
      id: item.externalId,
      data: { isSeen: false, rating: null, review: null }
    });
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative p-5 sm:p-6 rounded-2xl transition-all duration-300 border border-transparent",
        item.isSeen 
          ? "bg-secondary/30 text-muted-foreground" 
          : "bg-card minimal-shadow hover:minimal-shadow-hover hover:-translate-y-1"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className={cn(
              "text-lg font-medium truncate",
              item.isSeen ? "line-through decoration-muted-foreground/30" : "text-foreground"
            )}>
              {item.name}
            </h3>
            {item.isSeen && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                Done
              </span>
            )}
          </div>
          
          {item.isSeen && item.rating && (
            <div className="mt-3 flex items-center">
              <StarRating rating={item.rating} readOnly size="sm" />
            </div>
          )}
          
          {item.isSeen && item.review && (
            <div className="mt-3 text-sm italic border-l-2 border-primary/20 pl-3 py-1 bg-secondary/20 rounded-r-lg">
              "{item.review}"
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {!item.isSeen ? (
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-full border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/20"
              onClick={() => onMarkSeenClick(item)}
              title="Mark as done"
            >
              <Check className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"
              onClick={handleUnmark}
              disabled={updateItem.isPending}
              title="Mark as pending"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteItem.isPending || isDeleting}
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
