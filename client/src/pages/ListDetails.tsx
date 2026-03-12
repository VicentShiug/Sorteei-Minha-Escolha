import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import {
	ArrowLeft,
	Plus,
	Shuffle,
	CheckCircle2,
	Circle,
	Pencil,
	Users,
	Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useList } from "@/hooks/use-lists";
import { useAuth } from "@/context/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { ItemCard } from "@/components/ItemCard";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { MarkSeenDialog } from "@/components/MarkSeenDialog";
import { DrawDialog } from "@/components/DrawDialog";
import { ListFormDialog } from "@/components/ListFormDialog";
import { EditItemDialog } from "@/components/EditItemDialog";
import { ShareListModal } from "@/components/ShareListModal";
import { MembersList } from "@/components/MembersList";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface ApiItem {
	externalId: string;
	createdAt: Date;
	name: string;
	progress?: {
		externalId: string;
		createdAt: Date;
		isSeen: boolean;
		rating: number | null;
		review: string | null;
		completedAt: Date | null;
	};
	participantsProgress?: {
		externalId: string;
		name: string;
		completedAt: Date | null;
		rating?: number | null;
		review?: string | null;
	}[];
}

interface ApiList {
	externalId: string;
	name: string;
	description: string | null;
	isShared?: boolean;
	items: ApiItem[];
	userPermission?: {
		permission: number;
		isOwner: boolean;
	};
}

export default function ListDetails() {
	const params = useParams();
	const listId = params.id as string;
	const { data: list, isLoading } = useList(listId);
	const { user } = useAuth();
	const { t } = useTranslation();

	const [isAddItemOpen, setIsAddItemOpen] = useState(false);
	const [isDrawOpen, setIsDrawOpen] = useState(false);
	const [isShareOpen, setIsShareOpen] = useState(false);
	const [isMembersOpen, setIsMembersOpen] = useState(false);

	const [selectedItem, setSelectedItem] = useState<	ApiItem | null>(
		null,
	);
	const [isMarkSeenOpen, setIsMarkSeenOpen] = useState(false);
	const [isEditItemMode, setIsEditItemMode] = useState(false);
	const [isEditListOpen, setIsEditListOpen] = useState(false);
	const [isEditPendingItemOpen, setIsEditPendingItemOpen] = useState(false);

	// Tab state
	const [activeTab, setActiveTab] = useState<"pending" | "completed">(
		"pending",
	);

	const handleTabChange = useCallback((tab: "pending" | "completed") => {
		setActiveTab(tab);
	}, []);

	useEffect(() => {
		return () => {
			queryClient.invalidateQueries({ queryKey: [api.lists.list.path] });
		};
	}, []);

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
				<Link href="/" className="text-primary hover:underline font-medium">
					Return home
				</Link>
			</div>
		);
	}

	const items = list.items || [];
	const userPermission = list.userPermission?.permission ?? 1;
	const isOwner = list.userPermission?.isOwner ?? false;

	const canEditList = isOwner || userPermission >= 2;
	const canEditItems = isOwner || userPermission >= 3;
	const canInvite = isOwner || userPermission >= 4;

	const pendingItems = items.filter((i) => !(i.progress?.isSeen ?? false));
	const completedItems = items
		.filter((i) => i.progress?.isSeen ?? false)
		.sort((a, b) => a.externalId.localeCompare(b.externalId));

	const displayItems = activeTab === "pending" ? pendingItems : completedItems;

	const handleMarkSeenClick = (item: 	ApiItem) => {
		setSelectedItem(item);
		setIsEditItemMode(false);
		setIsMarkSeenOpen(true);
	};

	const handleEditItemClick = (item: 	ApiItem) => {
		if (item.progress?.isSeen) {
			setSelectedItem(item);
			setIsEditItemMode(true);
			setIsMarkSeenOpen(true);
		} else {
			if (!canEditItems) return;
			setSelectedItem(item);
			setIsEditPendingItemOpen(true);
		}
	};

	return (
		<div className="min-h-screen bg-background text-foreground pb-24 pt-16">
			<main className="max-w-4xl mx-auto px-4 sm:px-8 mt-12">
				{/* List Header & Hero Action */}
				<header className="mb-12 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-8">
					<div className="flex-1">
						<div className="flex items-center gap-4 mb-4">
							<Link
								href="/"
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								<ArrowLeft className="w-6 h-6" />
							</Link>
							<h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
								{list.name}
							</h1>

							{canEditList && (
								<Button
									variant="ghost"
									size="icon"
									className="h-10 w-10 rounded-full"
									onClick={() => setIsEditListOpen(true)}
									title="Edit list"
								>
									<Pencil className="w-4 h-4" />
								</Button>
							)}

							{canInvite && (
								<Button
									variant="ghost"
									size="icon"
									className="h-10 w-10 rounded-full"
									onClick={() => setIsShareOpen(true)}
									title="Share list"
								>
									<Share2 className="w-4 h-4" />
								</Button>
							)}

							<Button
								variant="ghost"
								size="icon"
								className="h-10 w-10 rounded-full"
								onClick={() => setIsMembersOpen(true)}
								title="View members"
							>
								<Users className="w-4 h-4" />
							</Button>
						</div>
						{list.description && (
							<p className="text-lg text-muted-foreground">
								{list.description}
							</p>
						)}
						{(!list.description || list.isShared) && (
							<div className={list.description ? "mt-2" : ""}>
								{list.isShared && (
									<Badge className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full border-0 shadow-none font-normal">
										{t('home.shared')}
									</Badge>
								)}
							</div>
						)}
					</div>

					{pendingItems.length > 0 && (
						<Button
							onClick={() => setIsDrawOpen(true)}
							size="lg"
							className="h-16 px-8 rounded-2xl text-lg font-bold minimal-shadow hover:minimal-shadow-hover hover:-translate-y-1 transition-all bg-foreground text-background hover:bg-foreground/90"
						>
							<Shuffle className="w-6 h-6 mr-3" />
							{t("home.drawWinner")}
						</Button>
					)}
				</header>

				{/* Content Tabs */}
				<div className="flex items-center gap-2 mb-8 bg-secondary/50 p-1.5 rounded-2xl w-full sm:w-auto sm:inline-flex">
					<button
						type="button"
						onClick={() => handleTabChange("pending")}
						className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
							activeTab === "pending"
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<div className="flex items-center justify-center gap-2">
							<Circle className="w-4 h-4" />
							{t("home.pending")} ({pendingItems.length})
						</div>
					</button>
					<button
						type="button"
						onClick={() => handleTabChange("completed")}
						className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
							activeTab === "completed"
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<div className="flex items-center justify-center gap-2">
							<CheckCircle2 className="w-4 h-4" />
							{t("home.completed")} ({completedItems.length})
						</div>
					</button>
				</div>

				{/* Action Bar */}
				{activeTab === "pending" && canEditItems && (
					<div className="mb-6 flex justify-end">
						<Button
							onClick={() => setIsAddItemOpen(true)}
							variant="outline"
							className="rounded-xl h-11 border-dashed border-2 hover:border-solid hover:bg-secondary/50"
						>
							<Plus className="w-4 h-4 mr-2" />
							{t("listDetails.addItem")}
						</Button>
					</div>
				)}

				{/* Items Grid */}
				<div className="grid grid-cols-1 gap-4">
					<AnimatePresence mode="popLayout">
						{displayItems.length > 0 ? (
							displayItems.map((item) => (
								<ItemCard
									key={item.externalId}
									item={item}
									listExternalId={list.externalId}
									onMarkSeenClick={handleMarkSeenClick}
									onEditClick={handleEditItemClick}
									isInCompletedTab={activeTab === "completed"}
									currentUserExternalId={user?.externalId ?? ""}
								/>
							))
						) : (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed border-border/50"
							>
								<p className="text-muted-foreground">
									{activeTab === "pending"
										? t("listDetails.noPendingItems")
										: t("listDetails.noCompletedItems")}
								</p>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</main>

			<ItemFormDialog
				isOpen={isAddItemOpen}
				onOpenChange={setIsAddItemOpen}
				listExternalId={list.externalId}
			/>

			<MarkSeenDialog
				item={selectedItem}
				listId={list.externalId}
				isOpen={isMarkSeenOpen}
				onOpenChange={setIsMarkSeenOpen}
				isEditMode={isEditItemMode}
			/>

			<EditItemDialog
				item={selectedItem}
				listExternalId={list?.externalId}
				isOpen={isEditPendingItemOpen}
				onOpenChange={setIsEditPendingItemOpen}
			/>

			<DrawDialog
				items={items}
				isOpen={isDrawOpen}
				onOpenChange={setIsDrawOpen}
				onMarkSeen={handleMarkSeenClick}
			/>

			<ListFormDialog
				isOpen={isEditListOpen}
				onOpenChange={setIsEditListOpen}
				list={list}
			/>

			{listId && (
				<ShareListModal
					listExternalId={listId}
					isOpen={isShareOpen}
					onOpenChange={setIsShareOpen}
				/>
			)}

			{listId && user && (
				<MembersList
					listExternalId={listId}
					currentExternalId={user.externalId}
					isOwner={isOwner}
					isOpen={isMembersOpen}
					onOpenChange={setIsMembersOpen}
				/>
			)}
		</div>
	);
}
//   };

//   return (
//     <div className="min-h-screen bg-background text-foreground pb-24 pt-16">
//       <main className="max-w-4xl mx-auto px-4 sm:px-8 mt-12">
//         {/* List Header & Hero Action */}
//         <header className="mb-12 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-8">
//           <div className="flex-1">
//             <div className="flex items-center gap-4 mb-4">
//               <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
//                 <ArrowLeft className="w-6 h-6" />
//               </Link>
//               <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">{list.name}</h1>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="h-10 w-10 rounded-full"
//                 onClick={() => setIsEditListOpen(true)}
//                 title="Edit list"
//               >
//                 <Pencil className="w-4 h-4" />
//               </Button>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="h-10 w-10 rounded-full"
//                 onClick={() => setIsShareOpen(true)}
//                 title="Share list"
//               >
//                 <Share2 className="w-4 h-4" />
//               </Button>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="h-10 w-10 rounded-full"
//                 onClick={() => setIsMembersOpen(true)}
//                 title="View members"
//               >
//                 <Users className="w-4 h-4" />
//               </Button>
//             </div>
//             {list.description && (
//               <p className="text-lg text-muted-foreground">{list.description}</p>
//             )}
//           </div>

//           {pendingItems.length > 0 && (
//             <Button
//               onClick={() => setIsDrawOpen(true)}
//               size="lg"
//               className="h-16 px-8 rounded-2xl text-lg font-bold minimal-shadow hover:minimal-shadow-hover hover:-translate-y-1 transition-all bg-foreground text-background hover:bg-foreground/90"
//             >
//               <Shuffle className="w-6 h-6 mr-3" />
//               {t('home.drawWinner')}
//             </Button>
//           )}
//         </header>

//         {/* Content Tabs */}
//         <div className="flex items-center gap-2 mb-8 bg-secondary/50 p-1.5 rounded-2xl w-full sm:w-auto sm:inline-flex">
//           <button
//             onClick={() => setActiveTab('pending')}
//             className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
//               activeTab === 'pending'
//                 ? 'bg-card text-foreground shadow-sm'
//                 : 'text-muted-foreground hover:text-foreground'
//             }`}
//           >
//             <div className="flex items-center justify-center gap-2">
//               <Circle className="w-4 h-4" />
//               {t('home.pending')} ({pendingItems.length})
//             </div>
//           </button>
//           <button
//             onClick={() => setActiveTab('completed')}
//             className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
//               activeTab === 'completed'
//                 ? 'bg-card text-foreground shadow-sm'
//                 : 'text-muted-foreground hover:text-foreground'
//             }`}
//           >
//             <div className="flex items-center justify-center gap-2">
//               <CheckCircle2 className="w-4 h-4" />
//               {t('home.completed')} ({completedItems.length})
//             </div>
//           </button>
//         </div>

//         {/* Action Bar */}
//         {activeTab === 'pending' && (
//           <div className="mb-6 flex justify-end">
//             <Button
//               onClick={() => setIsAddItemOpen(true)}
//               variant="outline"
//               className="rounded-xl h-11 border-dashed border-2 hover:border-solid hover:bg-secondary/50"
//             >
//               <Plus className="w-4 h-4 mr-2" />
//               {t('listDetails.addItem')}
//             </Button>
//           </div>
//         )}

//         {/* List Grid */}
//         <div className="space-y-3">
//           <AnimatePresence mode="popLayout">
//             {displayItems.length === 0 ? (
//               <motion.div
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 className="text-center py-20 border border-dashed border-border/50 rounded-3xl bg-secondary/10"
//               >
//                 <p className="text-muted-foreground text-lg">
//                   {activeTab === 'pending'
//                     ? (items.length === 0 ? t('home.emptyListDescription') : t('home.allCaughtUp'))
//                     : t('home.noCompletedItems')}
//                 </p>
//                 {activeTab === 'pending' && items.length === 0 && (
//                   <Button
//                     onClick={() => setIsAddItemOpen(true)}
//                     variant="ghost"
//                     className="mt-4 text-primary"
//                   >
//                     {t('listDetails.addItem')}
//                   </Button>
//                 )}
//               </motion.div>
//             ) : (
//               displayItems.map((item) => (
//                 <ItemCard
//                   key={item.externalId}
//                   item={item}
//                   listExternalId={list?.externalId || ""}
//                   onMarkSeenClick={handleMarkSeenClick}
//                   onEditClick={handleEditItemClick}
//                 />
//               ))
//             )}
//           </AnimatePresence>
//         </div>
//       </main>

//       {/* Dialogs */}
//       <ItemFormDialog
//         listExternalId={list?.externalId}
//         isOpen={isAddItemOpen}
//         onOpenChange={setIsAddItemOpen}
//       />

//       <MarkSeenDialog
//         listId={list?.externalId}
//         item={selectedItem}
//         isOpen={isMarkSeenOpen}
//         onOpenChange={setIsMarkSeenOpen}
//         isEditMode={isEditItemMode}
//       />

//       <EditItemDialog
//         item={selectedItem}
//         listExternalId={list?.externalId}
//         isOpen={isEditPendingItemOpen}
//         onOpenChange={setIsEditPendingItemOpen}
//       />

//       <DrawDialog
//         items={items}
//         isOpen={isDrawOpen}
//         onOpenChange={setIsDrawOpen}
//         onMarkSeen={handleMarkSeenClick}
//       />

//       <ListFormDialog
//         isOpen={isEditListOpen}
//         onOpenChange={setIsEditListOpen}
//         list={list}
//       />

//       {listId && (
//         <ShareListModal
//           listExternalId={listId}
//           isOpen={isShareOpen}
//           onOpenChange={setIsShareOpen}
//         />
//       )}
//     </div>
//   );
// }
