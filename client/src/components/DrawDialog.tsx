import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Dices, ArrowRight, Calculator, Cpu, Search, Brain, Target, Shuffle, RefreshCw } from "lucide-react";
import type { Item } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dices: Dices,
  calculator: Calculator,
  cpu: Cpu,
  sparkles: Sparkles,
  search: Search,
  brain: Brain,
  target: Target,
  shuffle: Shuffle,
};

interface ThinkingItem {
  text: string;
  icon: string;
  winnerText: string;
}

export function DrawDialog({ items, isOpen, onOpenChange, onMarkSeen }: DrawDialogProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnItem, setDrawnItem] = useState<Item | null>(null);
  const [thinkingItem, setThinkingItem] = useState<ThinkingItem | null>(null);
  const [thinkingKey, setThinkingKey] = useState<string | null>(null);
  const { t } = useTranslation();

  const unseenItems = items.filter(item => !item.isSeen);

  const getRandomThinking = useCallback((currentKey: string | null): { item: ThinkingItem; key: string } => {
    const thinkingData = t('draw.thinking', { returnObjects: true }) as Record<string, ThinkingItem>;
    const thinkingKeys = Object.keys(thinkingData);
    
    // Filter out current key to avoid repetition
    const availableKeys = currentKey 
      ? thinkingKeys.filter(key => key !== currentKey)
      : thinkingKeys;
    
    const randomKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    const item = thinkingData[randomKey];
    
    return { item, key: randomKey };
  }, [t]);

  const drawRandom = useCallback(() => {
    const { item, key } = getRandomThinking(thinkingKey);
    setThinkingItem(item);
    setThinkingKey(key);
    setIsDrawing(true);
    setDrawnItem(null);
    
    const timer = setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * unseenItems.length);
      setDrawnItem(unseenItems[randomIndex]);
      setIsDrawing(false);
    }, 1200);
    
    return () => clearTimeout(timer);
  }, [unseenItems, thinkingKey, getRandomThinking]);

  useEffect(() => {
    if (isOpen) {
      if (unseenItems.length === 0) {
        setDrawnItem(null);
        setThinkingItem(null);
        setThinkingKey(null);
        return;
      }
      
      drawRandom();
    }
  }, [isOpen, unseenItems.length]);

  const ThinkingIcon = thinkingItem ? iconMap[thinkingItem.icon] : Dices;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none minimal-shadow-hover p-0 overflow-hidden bg-background">
        <div className="relative p-6 sm:p-8 flex flex-col items-center text-center min-h-[400px] sm:min-h-[320px] justify-center">
          
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
                <h2 className="text-2xl font-display font-medium mb-2">{t('draw.allCaughtUp')}</h2>
                <p className="text-muted-foreground mb-8">{t('draw.completedAll')}</p>
                <Button onClick={() => onOpenChange(false)} variant="outline" className="rounded-xl h-12 px-8">
                  {t('draw.close')}
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
                  <ThinkingIcon className="w-8 h-8 text-primary/50 animate-pulse" />
                </motion.div>
                <h2 className="text-xl font-medium text-muted-foreground animate-pulse">
                  {thinkingItem?.text || t('draw.title')}
                </h2>
              </motion.div>
            ) : drawnItem ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="flex flex-col items-center w-full"
              >
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">{thinkingItem?.winnerText || t('draw.winner')}</span>
                <h2 className="text-3xl sm:text-4xl font-display font-bold leading-tight mb-6 text-foreground">
                  {drawnItem.name}
                </h2>
                
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 w-full">
                  <Button 
                    variant="outline"
                    className="flex-1 min-w-[140px] rounded-xl h-12 sm:h-14 text-xs sm:text-sm"
                    onClick={() => drawRandom()}
                    disabled={unseenItems.length <= 1}
                  >
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">{t('draw.drawAgain')}</span>
                    <span className="sm:hidden">Sortear</span>
                  </Button>
                  <Button 
                    variant="secondary"
                    className="flex-1 min-w-[140px] rounded-xl h-12 sm:h-14 text-xs sm:text-sm"
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => onMarkSeen(drawnItem), 150); 
                    }}
                  >
                    <span className="hidden sm:inline">{t('home.markAsDone')}</span>
                    <span className="sm:hidden">Feito</span>
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                  </Button>
                  <Button 
                    className="flex-1 min-w-[100px] rounded-xl h-12 sm:h-14 text-xs sm:text-sm"
                    onClick={() => {
                      onOpenChange(false);
                    }}
                  >
                    {t('home.gotIt')}
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

interface DrawDialogProps {
  items: Item[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkSeen: (item: Item) => void;
}
