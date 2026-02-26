import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, ListFilter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLists, useDeleteList } from "@/hooks/use-lists";
import { ListFormDialog } from "@/components/ListFormDialog";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Home() {
        const { data: lists, isLoading } = useLists();
        const deleteList = useDeleteList();
        const [isCreateOpen, setIsCreateOpen] = useState(false);
        const { t } = useTranslation();

        return (
                <div className="min-h-screen bg-background text-foreground pb-20 pt-16">
                        <header className="pt-12 pb-12 px-6 sm:px-12 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div>
                                        <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
                                                {t('home.title')}
                                        </h1>
                                        <p className="text-muted-foreground mt-3 text-lg">
                                                {t('home.subtitle')}
                                        </p>
                                </div>
                        </header>
                        <div className="px-6 sm:px-12 max-w-7xl mx-auto mb-8 flex justify-end">
                                <Button
                                        onClick={() => setIsCreateOpen(true)}
                                        className="rounded-full px-6 h-12 minimal-shadow hover:minimal-shadow-hover transition-all"
                                >
                                        <Plus className="w-5 h-5 mr-2" />
                                        {t('home.createList')}
                                </Button>
                        </div>

                        <main className="px-6 sm:px-12 max-w-7xl mx-auto">
                                {isLoading ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {[1, 2, 3].map((i) => (
                                                        <div
                                                                key={i}
                                                                className="bg-secondary/40 rounded-3xl h-48 animate-pulse"
                                                        />
                                                ))}
                                        </div>
                                ) : lists?.length === 0 ? (
                                        <div className="text-center py-32 bg-secondary/20 rounded-3xl border border-dashed border-border/50">
                                                <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                                                        <ListFilter className="w-10 h-10 text-muted-foreground" />
                                                </div>
                                                <h2 className="text-2xl font-display font-medium mb-2">
                                                        {t('home.noLists')}
                                                </h2>
                                                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                                                        {t('home.noListsDescription')}
                                                </p>
                                                <Button
                                                        onClick={() => setIsCreateOpen(true)}
                                                        variant="outline"
                                                        className="rounded-xl h-12 px-8"
                                                >
                                                        {t('home.createList')}
                                                </Button>
                                        </div>
                                ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                <AnimatePresence>
                                                        {lists?.map((list) => (
                                                                <motion.div
                                                                        key={list.externalId}
                                                                        layout
                                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                                        transition={{ duration: 0.2 }}
                                                                >
                                                                        <Link
                                                                                href={`/lists/${list.externalId}`}
                                                                                className="block h-full group"
                                                                        >
                                                                                <div className="bg-card h-full p-8 rounded-3xl minimal-shadow hover:minimal-shadow-hover hover:-translate-y-1 transition-all duration-300 border border-border/30 relative overflow-hidden flex flex-col">
                                                                                        {/* Decorative gradient blob */}
                                                                                        <div className="absolute -right-12 -top-12 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />

                                                                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                                                                                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                                                                                        <ListFilter className="w-6 h-6" />
                                                                                                </div>

                                                                                                <Button
                                                                                                        size="icon"
                                                                                                        variant="ghost"
                                                                                                        className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                                                                                                        onClick={(e) => {
                                                                                                                e.preventDefault();
                                                                                                                if (
                                                                                                                        confirm(t('home.deleteConfirm'))
                                                                                                                ) {
                                                                                                                        deleteList.mutate(list.externalId);
                                                                                                                }
                                                                                                        }}
                                                                                                >
                                                                                                        <Trash2 className="w-4 h-4" />
                                                                                                </Button>
                                                                                        </div>

                                                                                        <div className="relative z-10 flex-1 flex flex-col">
                                                                                                <h3 className="text-2xl font-display font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
                                                                                                        {list.name}
                                                                                                </h3>
                                                                                                {list.description && (
                                                                                                        <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1">
                                                                                                                {list.description}
                                                                                                        </p>
                                                                                                )}

                                                                                                <div className="mt-auto pt-6 flex items-center gap-2">
                                                                                                        <div className="h-1 flex-1 bg-secondary rounded-full overflow-hidden">
                                                                                                                <div
                                                                                                                        className="h-full bg-primary rounded-full transition-all duration-1000"
                                                                                                                        style={{
                                                                                                                                width: list.items?.length
                                                                                                                                        ? `${(list.items.filter((i) => i.isSeen).length / list.items.length) * 100}%`
                                                                                                                                        : "0%",
                                                                                                                        }}
                                                                                                                />
                                                                                                        </div>
                                                                                                        <span className="text-xs font-bold text-muted-foreground ml-2">
                                                                                                                {list.items?.filter((i) => i.isSeen).length || 0} /{" "}
                                                                                                                {list.items?.length || 0}
                                                                                                        </span>
                                                                                                </div>
                                                                                        </div>
                                                                                </div>
                                                                        </Link>
                                                                </motion.div>
                                                        ))}
                                                </AnimatePresence>
                                        </div>
                                )}
                        </main>

                        <ListFormDialog isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} />
                </div>
        );
}
