import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateItem } from "@/hooks/use-items";
import { useToast } from "@/hooks/use-toast";

interface ItemFormDialogProps {
  listId?: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemFormDialog({ listId, isOpen, onOpenChange }: ItemFormDialogProps) {
  const [name, setName] = useState("");
  const createItem = useCreateItem();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !listId) return;

    createItem.mutate(
      { name: name.trim(), listId },
      {
        onSuccess: () => {
          toast({ title: "Item added to list" });
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
          <DialogTitle className="font-display text-2xl">Add new item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Item Name</Label>
            <Input
              id="name"
              placeholder="e.g. The Matrix, 1984, Inception"
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
              {createItem.isPending ? "Adding..." : "Add to List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
