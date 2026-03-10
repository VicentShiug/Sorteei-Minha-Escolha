import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateItem } from "@/hooks/use-items";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ApiItem {
  externalId: string;
  name: string;
}

interface EditItemDialogProps {
  item: ApiItem | null;
  listExternalId?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditItemDialog({ item, listExternalId, isOpen, onOpenChange }: EditItemDialogProps) {
  const [name, setName] = useState("");
  const updateItem = useUpdateItem(listExternalId || "");
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen && item) {
      setName(item.name);
    }
  }, [isOpen, item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !item || !listExternalId) return;

    updateItem.mutate(
      {
        id: item.externalId,
        data: { name: name.trim() },
      },
      {
        onSuccess: () => {
          toast({ title: t('listDetails.itemUpdated') });
          onOpenChange(false);
        },
      }
    );
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-none minimal-shadow-hover">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t('listDetails.editItem')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-item-name" className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{t('listDetails.itemName')}</Label>
            <Input
              id="edit-item-name"
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
              disabled={updateItem.isPending || !name.trim()}
              className="w-full rounded-xl h-12"
            >
              {updateItem.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
