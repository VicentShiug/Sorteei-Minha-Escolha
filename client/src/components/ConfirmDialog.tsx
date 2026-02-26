import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isPending?: boolean;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  isPending = false,
  variant = 'default',
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsConfirming(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    setIsConfirming(true);
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-none minimal-shadow-hover">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-between flex-row-reverse gap-2">
          <Button 
            onClick={handleConfirm} 
            disabled={isPending || isConfirming}
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            className="rounded-xl px-6 h-11"
          >
            {isPending ? t('common.loading') : (confirmText || t('common.confirm'))}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-11 text-muted-foreground hover:text-foreground"
          >
            {cancelText || t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
