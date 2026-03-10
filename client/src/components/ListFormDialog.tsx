import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateList, useUpdateList } from "@/hooks/use-lists";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ApiList {
  externalId: string;
  name: string;
  description: string | null;
}

interface ListFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  list?: ApiList;
}

export function ListFormDialog({ isOpen, onOpenChange, list }: ListFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createList = useCreateList();
  const updateList = useUpdateList();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isEditMode = !!list;

  useEffect(() => {
    if (isOpen && list) {
      setName(list.name);
      setDescription(list.description || "");
    } else if (!isOpen) {
      setName("");
      setDescription("");
    }
  }, [isOpen, list]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data = { 
      name: name.trim(), 
      description: description.trim() || undefined 
    };

    if (isEditMode && list) {
      updateList.mutate(
        { id: list.externalId, data },
        {
          onSuccess: () => {
            toast({ title: t('common.success') });
            onOpenChange(false);
          },
        }
      );
    } else {
      createList.mutate(data, {
        onSuccess: () => {
          toast({ title: t('common.success') });
          setName("");
          setDescription("");
          onOpenChange(false);
        },
      });
    }
  };

  const isPending = createList.isPending || updateList.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setName("");
        setDescription("");
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md rounded-2xl border-none minimal-shadow-hover">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEditMode ? t('listDetails.editList') : t('home.createList')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="list-name" className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{t('form.listName')}</Label>
            <Input
              id="list-name"
              placeholder={t('form.listNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:border-primary transition-colors text-base"
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="list-desc" className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{t('form.listDescription')}</Label>
            <Textarea
              id="list-desc"
              placeholder={t('form.listDescriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none h-24 rounded-xl bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:border-primary transition-colors text-base"
            />
          </div>

          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isPending || !name.trim()}
              className="w-full rounded-xl h-12"
            >
              {isPending ? t('common.loading') : (isEditMode ? t('common.save') : t('home.createList'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
