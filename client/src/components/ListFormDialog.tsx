import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateList } from "@/hooks/use-lists";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ListFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ListFormDialog({ isOpen, onOpenChange }: ListFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createList = useCreateList();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createList.mutate(
      { 
        name: name.trim(), 
        description: description.trim() || undefined 
      },
      {
        onSuccess: () => {
          toast({ title: t('common.success') });
          setName("");
          setDescription("");
          onOpenChange(false);
        },
      }
    );
  };

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
          <DialogTitle className="font-display text-2xl">{t('home.createList')}</DialogTitle>
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
              disabled={createList.isPending || !name.trim()}
              className="w-full rounded-xl h-12"
            >
              {createList.isPending ? t('common.loading') : t('home.createList')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
