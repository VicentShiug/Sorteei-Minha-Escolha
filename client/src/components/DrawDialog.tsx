import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Dices, ArrowRight } from "lucide-react";
import type { Item } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

interface DrawDialogProps {
  items: Item[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkSeen: (item: Item) => void;
}

export function DrawDialog({ items, isOpen, onOpenChange, onMarkSeen }: DrawDialogProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnItem, setDrawnItem] = useState<Item | null>(null);

  const unseenItems = items.filter(item => !item.isSeen);

  useEffect(() => {
    if (isOpen) {
      if (unseenItems.length === 0) {
        setDrawnItem(null);
        return;
      }
      
      // Animation sequence
      setIsDrawing(true);
      setDrawnItem(null);
      
      const timer = setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * unseenItems.length);
        setDrawnItem(unseenItems[randomIndex]);
        setIsDrawing(false);
      }, 1200); // 1.2s suspense
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, unseenItems.length]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none minimal-shadow-hover p-0 overflow-hidden bg-background">
        <div className="relative p-8 sm:p-10 flex flex-col items-center text-center min-h-[350px] justify-center">
          
          <AnimatePresence mode="wait">
            {unseenItems.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-display font-medium mb-2">All caught up!</h2>
                <p className="text-muted-foreground mb-8">You've completed every item in this list.</p>
                <Button onClick={() => onOpenChange(false)} variant="outline" className="rounded-xl h-12 px-8">
                  Close
                </Button>
              </motion.div>
            ) : isDrawing ? (
              <motion.div 
                key="drawing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center"
              >
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="w-20 h-20 rounded-full border-4 border-secondary border-t-primary flex items-center justify-center mb-8"
                >
                  <Dices className="w-8 h-8 text-primary/50 animate-pulse" />
                </motion.div>
                <h2 className="text-xl font-medium text-muted-foreground animate-pulse">Consulting the oracle...</h2>
              </motion.div>
            ) : drawnItem ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="flex flex-col items-center w-full"
              >
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">You should next consume</span>
                <h2 className="text-4xl sm:text-5xl font-display font-bold leading-tight mb-8 text-foreground">
                  {drawnItem.name}
                </h2>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button 
                    className="flex-1 rounded-xl h-14 text-base"
                    onClick={() => {
                      onOpenChange(false);
                    }}
                  >
                    Got it
                  </Button>
                  <Button 
                    variant="secondary"
                    className="flex-1 rounded-xl h-14 text-base"
                    onClick={() => {
                      onOpenChange(false);
                      // Slight delay to allow dialog to close smoothly before opening the next
                      setTimeout(() => onMarkSeen(drawnItem), 150); 
                    }}
                  >
                    Mark as Done <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
