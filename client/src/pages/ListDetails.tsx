import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Plus, Shuffle, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useList } from "@/hooks/use-lists";
import { ItemCard } from "@/components/ItemCard";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { MarkSeenDialog } from "@/components/MarkSeenDialog";
import { DrawDialog } from "@/components/DrawDialog";
import type { Item } from "@shared/schema";
import { AnimatePresence, motion } from "framer-motion";

export default function ListDetails() {
  const params = useParams();
  const listId = Number(params.id);
  const { data: list, isLoading } = useList(listId);

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isDrawOpen, setIsDrawOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isMarkSeenOpen, setIsMarkSeenOpen] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-secondary border-t-primary animate-spin" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-3xl font-display font-bold mb-4">List not found</h1>
        <Link href="/" className="text-primary hover:underline font-medium">Return home</Link>
      </div>
    );
  }

  const items = list.items || [];
  const pendingItems = items.filter(i => !i.isSeen);
  const completedItems = items.filter(i => i.isSeen).sort((a,b) => b.id - a.id); // Assuming newer IDs were completed later for rough sorting
  
  const displayItems = activeTab === 'pending' ? pendingItems : completedItems;

  const handleMarkSeenClick = (item: Item) => {
    setSelectedItem(item);
    setIsMarkSeenOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Navigation Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 h-16 flex items-center">
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Lists</span>
          </Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 mt-12">
        {/* List Header & Hero Action */}
        <header className="mb-12 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-8">
          <div className="flex-1">
            <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight mb-4">{list.name}</h1>
            {list.description && (
              <p className="text-lg text-muted-foreground">{list.description}</p>
            )}
          </div>
          
          {pendingItems.length > 0 && (
            <Button 
              onClick={() => setIsDrawOpen(true)}
              size="lg"
              className="h-16 px-8 rounded-2xl text-lg font-bold minimal-shadow hover:minimal-shadow-hover hover:-translate-y-1 transition-all bg-foreground text-background hover:bg-foreground/90"
            >
              <Shuffle className="w-6 h-6 mr-3" />
              Draw Random
            </Button>
          )}
        </header>

        {/* Content Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-secondary/50 p-1.5 rounded-2xl w-full sm:w-auto sm:inline-flex">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'pending' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Circle className="w-4 h-4" />
              Pending ({pendingItems.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'completed' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completed ({completedItems.length})
            </div>
          </button>
        </div>

        {/* Action Bar */}
        {activeTab === 'pending' && (
          <div className="mb-6 flex justify-end">
            <Button 
              onClick={() => setIsAddItemOpen(true)}
              variant="outline"
              className="rounded-xl h-11 border-dashed border-2 hover:border-solid hover:bg-secondary/50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        )}

        {/* List Grid */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {displayItems.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="text-center py-20 border border-dashed border-border/50 rounded-3xl bg-secondary/10"
              >
                <p className="text-muted-foreground text-lg">
                  {activeTab === 'pending' 
                    ? (items.length === 0 ? "This list is empty. Add something!" : "You've finished everything! 🎉") 
                    : "No completed items yet."}
                </p>
                {activeTab === 'pending' && items.length === 0 && (
                  <Button 
                    onClick={() => setIsAddItemOpen(true)}
                    variant="link"
                    className="mt-4 text-primary"
                  >
                    Add your first item
                  </Button>
                )}
              </motion.div>
            ) : (
              displayItems.map((item) => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onMarkSeenClick={handleMarkSeenClick}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Dialogs */}
      <ItemFormDialog 
        listId={listId} 
        isOpen={isAddItemOpen} 
        onOpenChange={setIsAddItemOpen} 
      />
      
      <MarkSeenDialog 
        listId={listId}
        item={selectedItem}
        isOpen={isMarkSeenOpen}
        onOpenChange={setIsMarkSeenOpen}
      />

      <DrawDialog
        items={items}
        isOpen={isDrawOpen}
        onOpenChange={setIsDrawOpen}
        onMarkSeen={handleMarkSeenClick}
      />
    </div>
  );
}
