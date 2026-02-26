import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateItem } from "@/hooks/use-items";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ItemFormDialogProps {
  listId?: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemFormDialog({ listId, isOpen, onOpenChange }: ItemFormDialogProps) {
  const [name, setName] = useState("");
  const createItem = useCreateItem();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !listId) return;

    createItem.mutate(
      { name: name.trim(), listId },
      {
        onSuccess: () => {
          toast({ title: t('common.success') });
          setName("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) setName("");
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md rounded-2xl border-none minimal-shadow-hover">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t('listDetails.addItem')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{t('listDetails.itemName')}</Label>
            <Input
              id="name"
              placeholder={t('listDetails.itemNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:border-primary transition-colors text-base"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button 
              type="submit" 
              disabled={createItem.isPending || !name.trim()}
              className="w-full rounded-xl h-12"
            >
              {createItem.isPending ? t('common.loading') : t('listDetails.addItem')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
