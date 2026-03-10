import { useState } from "react";
import { Users, Crown, Settings, MoreVertical, LogOut, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useListMembers, useUpdateMemberPermission, useRemoveMember, useLeaveList } from "@/hooks/use-shared";
import { PermissionLevel } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const permissionLabels: Record<number, string> = {
  [PermissionLevel.VIEWER]: "Viewer",
  [PermissionLevel.EDITOR_LIST]: "Editor - List",
  [PermissionLevel.EDITOR_ITEMS]: "Editor - Items",
  [PermissionLevel.ADMIN]: "Admin",
};

interface MembersListProps {
  listExternalId: string;
  currentExternalId: string | undefined;
  isOwner: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MembersList({ listExternalId, currentExternalId, isOwner, isOpen, onOpenChange }: MembersListProps) {
  const { data: members, isLoading } = useListMembers(listExternalId);
  const updateMember = useUpdateMemberPermission(listExternalId);
  const removeMember = useRemoveMember(listExternalId);
  const leaveList = useLeaveList(listExternalId);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleRemoveMember = async (externalId: string | null, name: string) => {
    if (!externalId) return;
    try {
      await removeMember.mutateAsync(externalId);
      toast({ title: t("members.removed", { name }) });
    } catch (error) {
      toast({ title: t("members.removeFailed"), variant: "destructive" });
    }
  };

  const handleLeaveList = async () => {
    if (!currentExternalId) {
      toast({ title: t("members.leaveFailed"), description: t("common.idNotFound"), variant: "destructive" });
      return;
    }
    try {
      await leaveList.mutateAsync(currentExternalId);
      toast({ title: t("members.left") });
      onOpenChange(false);
    } catch (error) {
      toast({ title: t("members.leaveFailed"), variant: "destructive" });
    }
  };

  const handleChangePermission = async (externalId: string | null, permission: number) => {
    if (!externalId) return;
    try {
      await updateMember.mutateAsync({ externalId, permission });
      toast({ title: t("members.permissionUpdated") });
    } catch (error) {
      toast({ title: t("members.updateFailed"), variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("members.title")}
          </DialogTitle>
          <DialogDescription>
            {t("members.description")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
        ) : members?.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">{t("members.noMembers")}</div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {members?.map((member) => (
              <div
                key={member.externalId}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{member.name}</span>
                      {member.isOwner && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          <Crown className="w-3 h-3 mr-1" />
                          {t("members.owner")}
                        </span>
                      )}
                      {member.isCurrentUser && !member.isOwner && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          <User className="w-3 h-3 mr-1" />
                          {t("members.you")}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {permissionLabels[member.permission]}
                    </span>
                  </div>
                </div>

                {isOwner && !member.isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleChangePermission(member.externalId, PermissionLevel.VIEWER)}>
                        <Shield className="w-4 h-4 mr-2" />
                        {t("members.setAsViewer")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangePermission(member.externalId, PermissionLevel.EDITOR_LIST)}>
                        <Shield className="w-4 h-4 mr-2" />
                        {t("members.setAsEditorList")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangePermission(member.externalId, PermissionLevel.EDITOR_ITEMS)}>
                        <Shield className="w-4 h-4 mr-2" />
                        {t("members.setAsEditorItems")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangePermission(member.externalId, PermissionLevel.ADMIN)}>
                        <Shield className="w-4 h-4 mr-2" />
                        {t("members.setAsAdmin")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member.externalId, member.name)}
                        className="text-destructive focus:text-destructive"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t("members.remove")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {!isOwner && member.isCurrentUser && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLeaveList}
                    className="text-destructive hover:text-destructive"
                  >
                    {t("members.leave")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
