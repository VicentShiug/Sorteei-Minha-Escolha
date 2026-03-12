import { useState, forwardRef, useCallback } from "react";
import { Check, Trash2, Edit3, MessageSquare, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { useDeleteItem, useUpdateItem } from "@/hooks/use-items";
import { ConfirmDialog } from "./ConfirmDialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import * as Tooltip from "@radix-ui/react-tooltip";

interface ApiItem {
  externalId: string;
  createdAt: Date;
  name: string;
  progress?: {
    externalId: string;
    createdAt: Date;
    isSeen: boolean;
    rating: number | null;
    review: string | null;
    completedAt: Date | null;
  };
  participantsProgress?: {
    externalId: string;
    name: string;
    completedAt: Date | null;
    rating?: number | null;
    review?: string | null;
  }[];
}

interface ItemCardProps {
  item: ApiItem;
  listExternalId: string;
  onMarkSeenClick: (item: ApiItem) => void;
  onEditClick: (item: ApiItem) => void;
  isInCompletedTab?: boolean;
  currentUserExternalId: string;
}

export const ItemCard = forwardRef<HTMLDivElement, ItemCardProps>(function ItemCard({ item, listExternalId, onMarkSeenClick, onEditClick, isInCompletedTab = false, currentUserExternalId }, ref) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
  const deleteItem = useDeleteItem(listExternalId);
  const updateItem = useUpdateItem(listExternalId);
  const { t } = useTranslation();

  const toggleParticipants = useCallback(() => {
    setIsParticipantsExpanded(prev => !prev);
  }, []);

  const isSeen = item.progress?.isSeen ?? false;
  const rating = item.progress?.rating ?? null;
  const review = item.progress?.review ?? null;

  const participantsProgress = item.participantsProgress ?? [];
  const otherParticipantsProgress = participantsProgress.filter(p => {
    const participantId = p.externalId;
    const currentId = currentUserExternalId;
    return participantId != null && participantId !== currentId;
  });
  const pendingParticipants = otherParticipantsProgress.filter(p => p.completedAt === null);
  const completedParticipants = otherParticipantsProgress.filter(p => p.completedAt !== null);

  console.log(currentUserExternalId)

  console.log(otherParticipantsProgress.filter((i) => i.externalId))

  const userCompleted = isSeen;
  const hasOtherParticipantsCompleted = otherParticipantsProgress.length > 0 && otherParticipantsProgress.some(p => p.completedAt !== null);
  const showAsCompleted = userCompleted;
  const showUserPendingBadge = isInCompletedTab && !userCompleted;

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
        showAsCompleted
          ? "bg-secondary/30 text-muted-foreground"
          : "bg-card minimal-shadow hover:minimal-shadow-hover hover:-translate-y-1"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className={cn(
              "text-lg font-medium truncate",
              userCompleted ? "line-through decoration-muted-foreground/30" : "text-foreground"
            )}>
              {item.name}
            </h3>
            {userCompleted && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                Done
              </span>
            )}
            {showUserPendingBadge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
                {t("listDetails.pendingForYou")}
              </span>
            )}
          </div>

          {!userCompleted && otherParticipantsProgress.length > 0 && (
            <>
              <button
                type="button"
                onClick={toggleParticipants}
                className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isParticipantsExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                {isParticipantsExpanded
                  ? t("listDetails.hideParticipantsProgress")
                  : t("listDetails.seeParticipantsProgress", { count: otherParticipantsProgress.length })}
              </button>

              {isParticipantsExpanded && (
                <div className="mt-3 space-y-2">
                  {otherParticipantsProgress.map((participant) => (
                    <div key={participant.externalId} className="text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px]">
                              {participant.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{participant.name}</span>
                        </div>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          participant.completedAt !== null
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}>
                          {participant.completedAt !== null
                            ? t("listDetails.participantCompleted")
                            : t("listDetails.participantPending")}
                        </span>
                      </div>
                      {participant.completedAt !== null && (
                        <>
                          <div className="ml-7 text-xs text-muted-foreground">
                            {new Date(participant.completedAt).toLocaleDateString()}
                          </div>
                          {participant.rating != null && (
                            <div className="ml-7 mt-1">
                              <StarRating rating={participant.rating} readOnly size="sm" />
                            </div>
                          )}
                          {participant.review != null && (
                            <div className="ml-7 text-xs italic text-muted-foreground">
                              "{participant.review}"
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {userCompleted && rating && (
            <div className="mt-3 flex items-center">
              <StarRating rating={rating} readOnly size="sm" />
            </div>
          )}

          {userCompleted && review && (
            <div className="mt-3 text-sm italic border-l-2 border-primary/20 pl-3 py-1 bg-secondary/20 rounded-r-lg">
              "{review}"
            </div>
          )}

          {userCompleted && hasOtherParticipantsCompleted && completedParticipants.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/30 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("listDetails.otherParticipants")}
              </p>
              {completedParticipants.map((participant) => (
                <div key={participant.externalId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[8px]">
                          {participant.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{participant.name}</span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      Done {participant.completedAt ? new Date(participant.completedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  {participant.rating != null && (
                    <div className="ml-7">
                      <StarRating rating={participant.rating} readOnly size="sm" />
                    </div>
                  )}
                  {participant.review != null && (
                    <div className="ml-7 text-xs italic text-muted-foreground">
                      "{participant.review}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {!userCompleted ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full hover:bg-primary/5 hover:text-primary"
                onClick={() => onEditClick(item)}
                title="Edit item"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                onClick={() => onMarkSeenClick(item)}
                title="Mark as done"
              >
                <Check className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                onClick={() => onEditClick(item)}
                title="Edit details"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"
                onClick={handleUnmark}
                disabled={updateItem.isPending}
                title="Move back to pending"
              >
                <Circle className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setIsDeleteOpen(true)}
            disabled={deleteItem.isPending}
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={() => {
          deleteItem.mutate(item.externalId);
          setIsDeleteOpen(false);
        }}
        title={t('common.deleteItem')}
        description={t('common.confirmDelete')}
        variant="destructive"
        isPending={deleteItem.isPending}
      />
    </motion.div>
  );
});
